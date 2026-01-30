import os
import json
import time
import hashlib
import argparse
import urllib.request
import urllib.error
from pathlib import Path

# Defaults
DEFAULT_MODEL = "kimi-k2.5:cloud"
DEFAULT_HOST = "http://127.0.0.1:11434"
OUTPUT_FILE = "generated_questions.json"

# LIMIT CONCURRENCY TO PREVENT GPU OOM
CONCURRENCY_LIMIT = int(os.getenv('OLLAMA_CONCURRENCY', '1'))

def _subject_from_objective(obj: dict) -> str:
    oid = str(obj.get('id') or '')
    prefix = oid.split('-')[0].upper() if '-' in oid else oid.split('_')[0].upper()
    mapping = {
        'MATH': 'Mathematics', 'ENG': 'English', 'POB': 'Principles of Business',
        'SOC': 'Social Studies', 'BIO': 'Biology', 'CHEM': 'Chemistry',
        'PHYS': 'Physics', 'IT': 'Information Technology', 'GEO': 'Geography',
        'HIST': 'History', 'ECON': 'Economics',
    }
    if prefix in mapping:
        return mapping[prefix]

    source = str(obj.get('source_file') or '').lower()
    for key, val in mapping.items():
        if key.lower() in source: return val
    return 'General'

def _difficulty_text(d: int) -> str:
    return 'easy' if d <= 1 else 'medium' if d == 2 else 'hard'

def _normalize_text(s: str) -> str:
    s = (s or '').strip().lower()
    return ' '.join(''.join(c for c in s if c.isalnum() or c.isspace()).split())

def _hash_text(s: str) -> str:
    return hashlib.sha1(_normalize_text(s).encode('utf-8')).hexdigest()

def _ollama_generate(host: str, model: str, prompt: str, temperature: float, timeout_sec: int, num_predict: int) -> str:
    url = f"{host}/api/generate"
    payload = {
        'model': model,
        'prompt': prompt,
        'stream': False,
        'format': 'json',
        'temperature': temperature,
        'options': {'num_predict': num_predict},
    }
    
    data = json.dumps(payload).encode('utf-8')
    req = urllib.request.Request(url, data=data, headers={'Content-Type': 'application/json'})
    
    try:
        print(f"    -> Requesting {model} at {url}...")
        with urllib.request.urlopen(req, timeout=timeout_sec) as response:
            if response.status == 200:
                result = json.loads(response.read().decode('utf-8'))
                return result.get('response', '')
            else:
                print(f"    [!] Error: Status {response.status}")
                return ""
    except Exception as e:
        print(f"    [!] Error during Ollama generation: {e}")
        return ""

def _build_prompt(objective: dict, subject: str, difficulty_text: str, count: int, existing_questions: list[str], max_context: int, max_ex: int, max_ex_chars: int) -> str:
    topic = str(objective.get('objective') or '')
    context = str(objective.get('content') or '')[:max_context]
    keywords = (objective.get('keywords') or [])[:10]
    
    # Select a random pedagogical approach
    approaches = [
        "theoretical understanding", "practical application in a Caribbean context", 
        "problem solving", "definition and identification", "comparative analysis"
    ]
    approach = approaches[int(time.time()) % len(approaches)]
    
    # Cognitive level variance
    cognitive_levels = ["Knowledge (Recall)", "Application (Problem Solving)", "Analysis (Higher Order Thinking)"]
    cog_level = cognitive_levels[int(time.time() * 1000) % len(cognitive_levels)]
    
    # "All of the above" probability (roughly 25%)
    include_all_above = (int(time.time() * 100) % 4 == 0)
    all_above_rule = "One question in this batch SHOULD use 'All of the above' or 'None of the above' as a valid option if appropriate." if include_all_above else "Avoid simple 'All of the above' options in this batch unless highly relevant."
    
    existing_block = '\n'.join([f"- {q[:max_ex_chars]}" for q in existing_questions[-max_ex:] if q.strip()])

    return (
        f"You are a Senior CSEC Examiner for {subject}.\n"
        f"Output ONLY valid JSON. No markdown, no introductory text.\n"
        f"Create {count} unique, high-quality multiple-choice questions focusing on: {approach}.\n"
        f"Target Cognitive Level: {cog_level}\n\n"
        f"Topic: {topic}\nContext: {context}\nKeywords: {', '.join(keywords)}\nDifficulty: {difficulty_text}\n\n"
        f"CRITICAL RULES:\n"
        f"1. INTERNAL REASONING: For each question, perform an internal 'thoughtStep' explaining the logic/distractor choice before finalizing the JSON fields.\n"
        f"2. SELF-CONTAINED: Questions MUST be fully understood without external text. NEVER say 'In the text' or 'The story suggests'.\n"
        f"3. EXPLANATIONS: Provide a detailed 'explanation' (2-3 sentences) for the correct answer, explaining WHY it is correct and WHY specific distractors are common errors.\n"
        f"4. {all_above_rule}\n"
        f"5. DISTRACTORS: Wrong options must be plausible Caribbean-context misconceptions.\n"
        f"6. CLARITY: Strictly ONE correct answer.\n\n"
        f"Avoid repeating these existing questions:\n{existing_block}\n\n"
        f"Required JSON Structure:\n"
        f"{{\n  \"questions\": [\n    {{\n      \"thoughtStep\": \"Internal reasoning here\",\n      \"question\": \"Question text here\",\n      \"options\": [\"Option A\", \"Option B\", \"Option C\", \"Option D\"],\n      \"correctAnswer\": 0,\n      \"explanation\": \"Detailed explanation here.\",\n      \"difficulty\": \"{difficulty_text}\",\n      \"topic\": \"{topic}\"\n    }}\n  ]\n}}"
    )

def _parse_questions_json(raw: str) -> list[dict]:
    if not raw: return []
    try:
        data = json.loads(raw)
    except Exception:
        start, end = raw.find('{'), raw.rfind('}')
        if start == -1 or end == -1: return []
        try: data = json.loads(raw[start : end + 1])
        except: return []

    qs = data.get('questions')
    if not isinstance(qs, list): return []

    def _safe_str(val) -> str:
        if isinstance(val, list):
            return " ".join(str(i) for i in val)
        return str(val or "").strip()

    out = []
    for q in qs:
        q_text = _safe_str(q.get('question'))
        opts = q.get('options')
        correct = q.get('correctAnswer')

        if not q_text or not isinstance(opts, list) or len(opts) != 4 or correct is None:
            continue
        
        try:
            out.append({
                'thoughtStep': _safe_str(q.get('thoughtStep') or "N/A"),
                'question': q_text,
                'options': [_safe_str(o) for o in opts],
                'correctAnswer': int(correct) if str(correct).isdigit() else 0,
                'explanation': _safe_str(q.get('explanation') or "No explanation provided."),
                'storyElement': _safe_str(q.get('storyElement') or 'Challenge'),
                'difficulty': q.get('difficulty'),
                'topic': q.get('topic')
            })
        except:
            continue
    return out

def _iter_objectives(syllabus_dir: Path):
    if not syllabus_dir.exists():
        print(f"[!] Syllabus directory not found: {syllabus_dir}")
        return

    for p in sorted(syllabus_dir.glob('*.json')):
        if p.name in {'combined_syllabuses.json', 'processing_summary.json'}: continue
        try:
            data = json.loads(p.read_text(encoding='utf-8'))
            if isinstance(data, list):
                for obj in data:
                    if isinstance(obj, dict) and obj.get('id'):
                        obj['source_file'] = p.name
                        yield obj
        except: continue

def _load_existing_questions(filepath: Path) -> list[dict]:
    if not filepath.exists():
        return []
    try:
        data = json.loads(filepath.read_text(encoding='utf-8'))
        if isinstance(data, list):
            return data
        return []
    except:
        return []

def main():
    parser = argparse.ArgumentParser(description="Generate CSEC questions using Ollama (local or cloud).")
    parser.add_argument("--model", type=str, default=DEFAULT_MODEL, help="Ollama model name (e.g., llama3.1, mistral)")
    parser.add_argument("--host", type=str, default=DEFAULT_HOST, help="Ollama host URL (e.g., http://127.0.0.1:11434)")
    parser.add_argument("--output", type=str, default=OUTPUT_FILE, help="Output JSON file path")
    parser.add_argument("--concurrency", type=int, default=CONCURRENCY_LIMIT, help="Max requests (sequential in this version, kept for compat)")
    parser.add_argument("--syllabus-dir", type=str, default="syllabuses/output", help="Directory containing syllabus JSONs")
    parser.add_argument("--force", action="store_true", help="Force regenerate even if output exists (appends)")
    
    args = parser.parse_args()

    syllabus_dir = Path(args.syllabus_dir)
    output_path = Path(args.output)
    
    print(f"[*] Configuration:\n    Model: {args.model}\n    Host: {args.host}\n    Output: {output_path}")

    objectives = list(_iter_objectives(syllabus_dir))
    print(f"[*] Found {len(objectives)} objectives in {syllabus_dir}")
    
    all_questions = _load_existing_questions(output_path)
    existing_hashes = {_hash_text(q.get('questionText', '')) for q in all_questions}
    print(f"[*] Loaded {len(all_questions)} existing questions.")

    newly_generated_count = 0
    
    for idx, obj in enumerate(objectives, start=1):
        obj_id = str(obj.get('id'))
        subject = _subject_from_objective(obj)
        difficulty = int(obj.get('difficulty') or 1)
        
        target_per_objective = 3
        
        print(f"[{idx}/{len(objectives)}] {obj_id} ({subject}) - Generating...")

        prompt = _build_prompt(
            obj, 
            subject, 
            _difficulty_text(difficulty), 
            target_per_objective, 
            [], 
            1200, 
            5, 
            150
        )

        result_json = _ollama_generate(args.host, args.model, prompt, 0.7, 90, 2000)
        parsed_batch = _parse_questions_json(result_json)
        
        if not parsed_batch:
            print("    [!] No valid JSON returned.")
            continue

        valid_batch = []
        for q in parsed_batch:
            h = _hash_text(q['question'])
            if h in existing_hashes:
                continue
            existing_hashes.add(h)
            
            final_q = {
                'id': f"{obj_id}_{hashlib.md5(q['question'].encode()).hexdigest()[:8]}",
                'objectiveId': obj_id,
                'subjectId': subject.lower().replace(" ", "_"),
                'subjectName': subject,
                'topic': q.get('topic') or str(obj.get('objective') or obj_id),
                'difficulty': difficulty,
                'difficultyLabel': _difficulty_text(difficulty),
                'questionText': q['question'],
                'options': q['options'],
                'correctAnswer': q['correctAnswer'],
                'explanation': q['explanation'],
                'storyElement': q['storyElement'],
                'tags': (obj.get('keywords') or [])[:10],
                'metadata': {
                    'generatedBy': f"ollama:{args.model}",
                    'timestamp': time.strftime('%Y-%m-%dT%H:%M:%S', time.gmtime())
                }
            }
            valid_batch.append(final_q)

        if valid_batch:
            print(f"    [+] Added {len(valid_batch)} questions.")
            all_questions.extend(valid_batch)
            newly_generated_count += len(valid_batch)
            
            try:
                output_path.write_text(json.dumps(all_questions, indent=2), encoding='utf-8')
            except Exception as e:
                print(f"    [!] Error saving file: {e}")

    print(f"\n[*] Done. Generated {newly_generated_count} new questions. Total in file: {len(all_questions)}")

if __name__ == '__main__':
    main()
