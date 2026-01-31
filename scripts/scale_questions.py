import os
import json
import time
import hashlib
import argparse
import urllib.request
import urllib.error
from pathlib import Path

# --- Configuration Defaults ---
DEFAULT_MODEL = "kimi-k2.5:cloud" # Recommended for logic and formatting
DEFAULT_HOST = "http://127.0.0.1:11434"
SYLLABUS_DIR = Path("syllabuses/output")
QUESTIONS_DIR = Path("syllabuses/questions")

# --- Utilities ---

def _hash_text(s: str) -> str:
    return hashlib.md5(s.strip().lower().encode('utf-8')).hexdigest()

def _ollama_generate(host: str, model: str, prompt: str, temperature: float = 0.7) -> str:
    url = f"{host}/api/generate"
    payload = {
        'model': model,
        'prompt': prompt,
        'stream': False,
        'format': 'json',
        'options': {'temperature': temperature, 'num_predict': 4000}
    }
    
    data = json.dumps(payload).encode('utf-8')
    req = urllib.request.Request(url, data=data, headers={'Content-Type': 'application/json'})
    
    try:
        with urllib.request.urlopen(req, timeout=120) as response:
            if response.status == 200:
                result = json.loads(response.read().decode('utf-8'))
                return result.get('response', '')
    except Exception as e:
        print(f"    [!] Ollama Error: {e}")
    return ""

def _build_mcq_prompt(subject: str, topic: str, content: str, count: int) -> str:
    return f"""
You are a CSEC Examiner for {subject}. Create {count} high-quality Multiple Choice Questions (MCQ) for the following topic:
Topic: {topic}
Context: {content}

Rules:
1. Format: Valid JSON array of objects.
2. Each object must have: "question", "options" (array of 4 strings), "answer" (0-3 index), and "explanation".
3. Distractors must be plausible misconceptions.
4. Context should be Caribbean-centric where possible.

Output ONLY the JSON array.
"""

def _build_dnd_prompt(subject: str, topic: str, content: str, count: int) -> str:
    return f"""
You are a CSEC Examiner for {subject}. Create {count} 'Drag and Drop' (DND) categorization or matching questions for:
Topic: {topic}
Context: {content}

Rules:
1. Format: Valid JSON array of objects.
2. Each object must have: "question", "type": "DND", "categories" (array of strings), and "items" (array of objects with "text" and "category").
3. Ensure items clearly fit into one category.

Output ONLY the JSON array.
"""

def process_syllabus(subject_file: Path, target_count: int, host: str, model: str):
    subject_name = subject_file.stem.replace("CSEC-", "").replace("-Syllabus", "")
    print(f"\n[*] Scaling {subject_name} ({subject_file.name})")
    
    output_file = QUESTIONS_DIR / f"CSEC-{subject_name}-Questions.json"
    QUESTIONS_DIR.mkdir(parents=True, exist_ok=True)
    
    existing_questions = []
    if output_file.exists():
        try:
            existing_questions = json.loads(output_file.read_text(encoding='utf-8'))
        except: pass
    
    existing_ids = {q.get('id') for q in existing_questions}
    
    try:
        syllabus_data = json.loads(subject_file.read_text(encoding='utf-8'))
    except Exception as e:
        print(f" [!] Error reading syllabus: {e}")
        return

    new_questions = []
    for topic in syllabus_data:
        topic_id = topic.get('id')
        topic_name = topic.get('objective', 'General')
        content = topic.get('content', '')
        
        # Count existing questions for this topic
        current_topic_count = len([q for q in existing_questions if q.get('topic_id') == topic_id])
        needed = target_count - current_topic_count
        
        if needed <= 0:
            print(f"  [-] {topic_id}: Already has {current_topic_count} questions. Skipping.")
            continue
            
        print(f"  [+] {topic_id}: Generating {needed} questions ({topic_name})")
        
        # Split into batches of 5 to avoid model degradation
        batch_size = 5
        total_batches = (needed + batch_size - 1) // batch_size
        
        for i in range(0, needed, batch_size):
            chunk = min(batch_size, needed - i)
            current_batch = (i // batch_size) + 1
            
            # Alternate types: MCQ or DND
            q_type = "MCQ" if (i // batch_size) % 5 != 0 else "DND"
            print(f"    -> Batch {current_batch}/{total_batches}: Generating {chunk} {q_type} questions...", end=" ", flush=True)
            
            start_time = time.time()
            prompt = _build_mcq_prompt(subject_name, topic_name, content, chunk) if q_type == "MCQ" else _build_dnd_prompt(subject_name, topic_name, content, chunk)
            
            # Retry logic: up to 2 attempts per batch
            batch_qs = None
            for attempt in range(2):
                response = _ollama_generate(host, model, prompt)
                duration = time.time() - start_time
                
                try:
                    # Attempt 1: Direct parse
                    batch_qs = json.loads(response.strip())
                except:
                    # Attempt 2: Extract array from text
                    try:
                        start = response.find('[')
                        end = response.rfind(']')
                        if start != -1 and end != -1:
                            batch_qs = json.loads(response[start : end + 1])
                    except:
                        pass
                
                if isinstance(batch_qs, list) and len(batch_qs) > 0:
                    break
                else:
                    print(f"R", end="", flush=True) # Indicate retry
            
            if not isinstance(batch_qs, list):
                print(f" [!] Error: Failed to parse JSON after retries.")
                continue
            
            added_count = 0
            for q in batch_qs:
                if not isinstance(q, dict): continue
                q['topic_id'] = topic_id
                q['type'] = q.get('type', q_type)
                q_text = str(q.get('question') or "")
                if not q_text: continue

                # PROACTIVE QC: Scan for "Broken" references (Diagrams/Images)
                # If the question asks for something not in the text, we discard it
                q_content_to_check = f"{q_text} " + " ".join(q.get('options', []))
                triggers = ["diagram above", "figure 1", "image below", "table shown", "refer to the graph", "passage above"]
                is_broken = any(t in q_content_to_check.lower() for t in triggers)
                
                if is_broken:
                    print(f" [X] Proactive QC: Discarded question with missing reference.", end="")
                    continue
                
                q_hash = _hash_text(q_text)
                q['id'] = f"Q-{topic_id}-{q_hash[:8]}"
                
                if q['id'] not in existing_ids:
                    new_questions.append(q)
                    existing_ids.add(q['id'])
                    added_count += 1
                        
            # Incremental save
            combined = existing_questions + new_questions
            output_file.write_text(json.dumps(combined, indent=2), encoding='utf-8')
            print(f"Done in {duration:.1f}s. Added {added_count} new questions.")

# --- Main Flow ---

def main():
    parser = argparse.ArgumentParser(description="Scale CSEC Question Bank using Ollama.")
    parser.add_argument("--subject", type=str, help="Specific subject to process (e.g. Biology). If omitted, processes all.")
    parser.add_argument("--target", type=int, default=50, help="Target questions per topic (default 50).")
    parser.add_argument("--model", type=str, default=DEFAULT_MODEL, help="Ollama model name.")
    parser.add_argument("--host", type=str, default=DEFAULT_HOST, help="Ollama host URL.")
    
    args = parser.parse_args()
    
    if args.subject:
        files = [f for f in SYLLABUS_DIR.glob(f"*{args.subject}*.json") 
                 if f.name not in ['combined_syllabuses.json', 'processing_summary.json']]
    else:
        files = [f for f in SYLLABUS_DIR.glob("CSEC-*.json")
                 if f.name not in ['combined_syllabuses.json', 'processing_summary.json']]
        
    if not files:
        print("[!] No syllabus files found.")
        return

    print(f"[*] Starting generation for {len(files)} subjects. Target: {args.target} questions/topic.")
    
    for f in files:
        process_syllabus(f, args.target, args.host, args.model)

if __name__ == "__main__":
    main()
