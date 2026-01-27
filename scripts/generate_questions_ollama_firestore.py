import os
import json
import time
import hashlib
import asyncio
import aiohttp
from pathlib import Path

import firebase_admin
from firebase_admin import credentials, firestore

# LIMIT CONCURRENCY TO PREVENT GPU OOM (Set to 1 for Llama 3.1 on 6GB VRAM)
CONCURRENCY_LIMIT = int(os.getenv('OLLAMA_CONCURRENCY', '1'))
SEMAPHORE = asyncio.Semaphore(CONCURRENCY_LIMIT)

def _load_service_account():
    explicit_path = os.getenv('FIREBASE_SERVICE_ACCOUNT_PATH')
    if explicit_path and Path(explicit_path).exists():
        return json.loads(Path(explicit_path).read_text(encoding='utf-8'))

    root = Path.cwd()
    for f in root.iterdir():
        if f.is_file() and 'firebase-adminsdk' in f.name and f.suffix == '.json':
            return json.loads(f.read_text(encoding='utf-8'))

    raise RuntimeError('No Firebase service account found. Set FIREBASE_SERVICE_ACCOUNT_PATH or place a *firebase-adminsdk*.json in the project root.')

def _get_firestore():
    if firebase_admin._apps:
        return firestore.client()
    sa = _load_service_account()
    firebase_admin.initialize_app(credentials.Certificate(sa))
    return firestore.client()

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

async def _ollama_generate(session: aiohttp.ClientSession, ollama_host: str, model: str, prompt: str, temperature: float, timeout_sec: int, num_predict: int) -> str:
    async with SEMAPHORE:
        try:
            async with session.post(
                f"{ollama_host}/api/generate",
                json={
                    'model': model,
                    'prompt': prompt,
                    'stream': False,
                    'format': 'json',
                    'temperature': temperature,
                    'options': {'num_predict': num_predict},
                },
                timeout=aiohttp.ClientTimeout(total=timeout_sec),
            ) as r:
                r.raise_for_status()
                data = await r.json()
                return (data or {}).get('response', '')
        except Exception as e:
            print(f"    [!] Error during Ollama generation: {e}")
            return ""

def _build_prompt(objective: dict, subject: str, difficulty_text: str, count: int, existing_questions: list[str], max_context: int, max_ex: int, max_ex_chars: int) -> str:
    topic = str(objective.get('objective') or '')
    context = str(objective.get('content') or '')[:max_context]
    keywords = (objective.get('keywords') or [])[:10]
    
    # Select a random pedagogical approach to force diversity
    approaches = [
        "theoretical understanding", "practical application in a Caribbean context", 
        "problem solving", "definition and identification", "comparative analysis"
    ]
    approach = approaches[int(time.time()) % len(approaches)]
    
    existing_block = '\n'.join([f"- {q[:max_ex_chars]}" for q in existing_questions[-max_ex:] if q.strip()])

    return (
        f"You are a Senior CSEC Examiner for {subject}.\n"
        f"Output ONLY valid JSON. No markdown, no introductory text.\n"
        f"Create {count} unique, high-quality multiple-choice questions focusing on: {approach}.\n\n"
        f"Topic: {topic}\nContext: {context}\nKeywords: {', '.join(keywords)}\nDifficulty: {difficulty_text}\n\n"
        f"Pedagogical Requirements:\n"
        f"- Distractors (wrong options) must be plausible and based on common misconceptions.\n"
        f"- Avoid 'All of the above' or 'None of the above'.\n"
        f"- The question must directly assess the topic objective.\n"
        f"- Use Caribbean names and scenarios where appropriate for 'Caribbean context'.\n\n"
        f"Avoid repeating or paraphrasing these existing questions:\n{existing_block}\n\n"
        f"Required JSON Structure:\n"
        f"{{\n  \"questions\": [\n    {{\n      \"question\": \"Question text here\",\n      \"options\": [\"Option A\", \"Option B\", \"Option C\", \"Option D\"],\n      \"correctAnswer\": 0,\n      \"explanation\": \"Explanation here.\",\n      \"storyElement\": \"Feedback here.\"\n    }}\n  ]\n}}"
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
        # Validate structure but be lenient with types
        q_text = _safe_str(q.get('question'))
        opts = q.get('options')
        correct = q.get('correctAnswer')

        if not q_text or not isinstance(opts, list) or len(opts) != 4 or correct is None:
            continue
        
        try:
            out.append({
                'question': q_text,
                'options': [_safe_str(o) for o in opts],
                'correctAnswer': int(correct) if str(correct).isdigit() else 0,
                'explanation': _safe_str(q.get('explanation')),
                'storyElement': _safe_str(q.get('storyElement') or 'Challenge'),
            })
        except:
            continue
    return out

def _iter_objectives(syllabus_dir: Path):
    for p in sorted(syllabus_dir.glob('*.json')):
        if p.name in {'combined_syllabuses.json', 'processing_summary.json'}: continue
        try:
            data = json.loads(p.read_text(encoding='utf-8'))
            if isinstance(data, list):
                asdrfor obj in data:
                    if isinstance(obj, dict) and obj.get('id'): yield obj
        except: continue

async def main():
    syllabus_dir = Path(os.getenv('SYLLABUS_OUTPUT_DIR', 'syllabuses/output'))
    per_objective = int(os.getenv('QUESTIONS_PER_OBJECTIVE', '50'))
    model = os.getenv('OLLAMA_MODEL', 'llama3.1')
    ollama_host = os.getenv('OLLAMA_HOST', 'http://127.0.0.1:11434').rstrip('/')
    batch_n = int(os.getenv('OLLAMA_BATCH_SIZE', '6')) # Reducing batch per request for JSON quality
    temperature = float(os.getenv('OLLAMA_TEMPERATURE', '0.8'))
    timeout_sec = int(os.getenv('OLLAMA_TIMEOUT_SEC', '60'))
    num_predict = int(os.getenv('OLLAMA_NUM_PREDICT', '1200'))
    force = os.getenv('FORCE_REGENERATE', '0') in {'1', 'true', 'yes'}
    prefix_filter = os.getenv('SUBJECT_PREFIX_FILTER', '').strip()
    max_objectives = int(os.getenv('MAX_OBJECTIVES', '0'))
    start_index = int(os.getenv('START_INDEX', '0'))

    if not syllabus_dir.exists(): raise RuntimeError("Syllabus dir missing")

    db = _get_firestore()
    
    objectives = list(_iter_objectives(syllabus_dir))
    if prefix_filter:
        allowed = {p.strip().upper() for p in prefix_filter.split(',')}
        objectives = [o for o in objectives if str(o.get('id')).split('-')[0].upper() in allowed

    objectives = objectives[start_index:]
    if max_objectives > 0: objectives = objectives[:max_objectives]

    print(f"[*] Starting async generation for {len(objectives)} objectives. Concurrency: {CONCURRENCY_LIMIT}")
    
    async with aiohttp.ClientSession() as session:
        total_written = 0
        global_seen = set()+

        for idx, obj in enumerate(objectives, start=1):
            obj_id = str(obj.get('id'))
            subject = _subject_from_objective(obj)
            difficulty = int(obj.get('difficulty') or 1)
            
            existing_texts = []
            existing_hashes = set()
            existing_doc_ids = set()

            if not force:
                refs = [db.collection('questions').document(f"{obj_id}_{v}") for v in range(per_objective)]
                snaps = db.get_all(refs)
                for s in snaps:
                    if s.exists:
                        existing_doc_ids.add(s.id)
                        text = s.get('questionText') or s.get('question')
                        if text:
                            h = _hash_text(text)
                            existing_hashes.add(h)
                            existing_texts.append(text)

            remaining = max(0, per_objective - len(existing_hashes))
            if remaining == 0: continue

            print(f"[{idx}/{len(objectives)}] {obj_id} ({subject}) - generating {remaining}...")

            generated = []
            max_attempts = max(10, (remaining // batch_n) * 4)
            started_at = time.time()

            async def attempt_gen():
                p = _build_prompt(obj, subject, _difficulty_text(difficulty), batch_n, existing_texts + [g['question'] for g in generated], 1200, 8, 180)
                raw = await _ollama_generate(session, ollama_host, model, p, temperature, timeout_sec, num_predict)
                return _parse_questions_json(raw)

            # Parallel burst generation for this objective
            while len(generated) < remaining and (time.time() - started_at) < 180:
                tasks = [attempt_gen() for _ in range(min(CONCURRENCY_LIMIT, (remaining - len(generated) // batch_n) + 1))]
                results = await asyncio.gather(*tasks)
                
                for qs in results:
                    for q in qs:
                        h = _hash_text(q['question'])
                        if h not in global_seen and h not in existing_hashes:
                            global_seen.add(h)
                            existing_hashes.add(h)
                            generated.append(q)
                            if len(generated) >= remaining: break
                print(f"  Progress: {len(generated)}/{remaining}...")
                if not any(results): await asyncio.sleep(1) # Backoff if no valid JSON

            if not generated: continue

            batch = db.batch()
            count = 0
            now = time.strftime('%Y-%m-%dT%H:%M:%S', time.gmtime())

            for v in range(per_objective):
                doc_id = f"{obj_id}_{v}"
                if not force and doc_id in existing_doc_ids: continue
                if not generated: break

                q = generated.pop(0)
                
                # ENHANCED READABLE SCHEMA
                data = {
                    'id': doc_id,
                    'objectiveId': obj_id,
                    'subjectId': subject.lower().replace(" ", "_"),
                    'subjectName': subject,
                    'variation': v,
                    'topic': str(obj.get('objective') or obj_id),
                    'difficulty': difficulty,
                    'difficultyLabel': _difficulty_text(difficulty),
                    'questionText': q['question'],
                    'options': q['options'],
                    'correctAnswer': q['correctAnswer'],
                    'explanation': q['explanation'],
                    'storyElement': q['storyElement'],
                    'tags': (obj.get('keywords') or [])[:10],
                    'metadata': {
                        'generatedBy': f"ollama:{model}",
                        'version': '2.0',
                        'timestamp': now,
                        'model': model
                    }
                }
                
                batch.set(db.collection('questions').document(doc_id), data, merge=True)
                count += 1
                if count >= 400:
                    batch.commit()
                    total_written += count
                    batch = db.batch()
                    count = 0
            
            if count > 0:
                batch.commit()
                total_written += count

    print(f"Done. Wrote ~{total_written} questions.")

if __name__ == '__main__':
    asyncio.run(main())
