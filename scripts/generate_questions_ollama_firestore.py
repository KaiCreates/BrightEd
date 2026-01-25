import os
import json
import time
import hashlib
from pathlib import Path

import requests
import firebase_admin
from firebase_admin import credentials, firestore


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
        'MATH': 'Mathematics',
        'ENG': 'English',
        'POB': 'Principles of Business',
        'SOC': 'Social Studies',
        'BIO': 'Biology',
        'CHEM': 'Chemistry',
        'PHYS': 'Physics',
        'IT': 'Information Technology',
        'GEO': 'Geography',
        'HIST': 'History',
        'ECON': 'Economics',
    }
    if prefix in mapping:
        return mapping[prefix]

    source = str(obj.get('source_file') or '').lower()
    if 'mathematics' in source or 'math' in source:
        return 'Mathematics'
    if 'english' in source or 'language' in source:
        return 'English'
    if 'business' in source or 'pob' in source or 'principles' in source:
        return 'Principles of Business'
    if 'social' in source:
        return 'Social Studies'
    if 'biology' in source or 'biol' in source:
        return 'Biology'
    if 'chem' in source:
        return 'Chemistry'
    if 'phys' in source:
        return 'Physics'
    if 'geography' in source or 'geo' in source:
        return 'Geography'
    if 'history' in source or 'hist' in source:
        return 'History'
    if 'econ' in source:
        return 'Economics'
    return 'General'


def _difficulty_text(d: int) -> str:
    if d <= 1:
        return 'easy'
    if d == 2:
        return 'medium'
    return 'hard'


def _normalize_text(s: str) -> str:
    s = (s or '').strip().lower()
    out = []
    for ch in s:
        if ch.isalnum() or ch.isspace():
            out.append(ch)
    return ' '.join(''.join(out).split())


def _hash_text(s: str) -> str:
    return hashlib.sha1(_normalize_text(s).encode('utf-8')).hexdigest()


def _ollama_generate(session: requests.Session, ollama_host: str, model: str, prompt: str, temperature: float, timeout_sec: int, num_predict: int) -> str:
    r = session.post(
        f"{ollama_host}/api/generate",
        json={
            'model': model,
            'prompt': prompt,
            'stream': False,
            'format': 'json',
            'temperature': temperature,
            'options': {
                'num_predict': num_predict,
            },
        },
        timeout=timeout_sec,
    )
    r.raise_for_status()
    return (r.json() or {}).get('response', '')


def _build_prompt(
    objective: dict,
    subject: str,
    difficulty_text: str,
    count: int,
    existing_questions: list[str],
    max_context_chars: int,
    max_existing: int,
    max_existing_chars: int,
) -> str:
    topic = str(objective.get('objective') or '')
    context = str(objective.get('content') or '')
    if max_context_chars > 0 and len(context) > max_context_chars:
        context = context[:max_context_chars]
    keywords = objective.get('keywords') or []
    keyword_text = ', '.join([k for k in keywords if isinstance(k, str)][:12])
    trimmed_existing: list[str] = []
    for q in existing_questions[-max_existing:] if max_existing > 0 else []:
        q = str(q or '').strip()
        if not q:
            continue
        if max_existing_chars > 0 and len(q) > max_existing_chars:
            q = q[:max_existing_chars]
        trimmed_existing.append(q)
    existing_block = '\n'.join([f"- {q}" for q in trimmed_existing])

    return (
        f"Create {count} CSEC style multiple-choice questions for the subject \"{subject}\".\n"
        f"Topic objective ID: {objective.get('id')}\n"
        f"Topic: {topic}\n"
        f"Context: {context}\n"
        f"Keywords: {keyword_text}\n"
        f"Difficulty: {difficulty_text}\n\n"
        f"Hard requirements:\n"
        f"- Return ONLY valid JSON (no markdown).\n"
        f"- Produce exactly {count} questions.\n"
        f"- Every question must be unique and not paraphrases of each other.\n"
        f"- Options must be 4 items, clearly distinct, and only one correct answer.\n"
        f"- correctAnswer must be an integer 0-3.\n"
        f"- Keep explanations short but specific.\n\n"
        f"Avoid repeating these question texts (do not output anything similar):\n{existing_block}\n\n"
        f"Return JSON with this exact structure:\n"
        f"{{\n  \"questions\": [\n    {{\n      \"question\": \"...\",\n      \"options\": [\"A\", \"B\", \"C\", \"D\"],\n      \"correctAnswer\": 0,\n      \"explanation\": \"...\",\n      \"storyElement\": \"Spot on!\"\n    }}\n  ]\n}}"
    )


def _parse_questions_json(raw: str) -> list[dict]:
    try:
        data = json.loads(raw)
    except Exception:
        start = raw.find('{')
        end = raw.rfind('}')
        if start == -1 or end == -1 or end <= start:
            raise
        data = json.loads(raw[start : end + 1])

    qs = data.get('questions')
    if not isinstance(qs, list):
        raise ValueError('Invalid response: missing questions array')

    out = []
    for q in qs:
        if not isinstance(q, dict):
            continue
        question = q.get('question')
        options = q.get('options')
        correct = q.get('correctAnswer')
        if not isinstance(question, str) or not question.strip():
            continue
        if not isinstance(options, list) or len(options) != 4 or not all(isinstance(o, str) and o.strip() for o in options):
            continue
        if not isinstance(correct, int) or correct < 0 or correct > 3:
            continue
        out.append(
            {
                'question': question.strip(),
                'options': [o.strip() for o in options],
                'correctAnswer': int(correct),
                'explanation': str(q.get('explanation') or '').strip(),
                'storyElement': str(q.get('storyElement') or 'Challenge').strip() or 'Challenge',
            }
        )
    return out


def _iter_objectives(syllabus_dir: Path):
    for p in sorted(syllabus_dir.glob('*.json')):
        if p.name in {'combined_syllabuses.json', 'processing_summary.json'}:
            continue
        try:
            data = json.loads(p.read_text(encoding='utf-8'))
        except Exception:
            continue
        if isinstance(data, list):
            for obj in data:
                if isinstance(obj, dict) and obj.get('id'):
                    yield obj


def main():
    syllabus_dir = Path(os.getenv('SYLLABUS_OUTPUT_DIR', 'syllabuses/output'))
    per_objective = int(os.getenv('QUESTIONS_PER_OBJECTIVE', '50'))
    model = os.getenv('OLLAMA_MODEL', 'smollm:1.7b')
    ollama_host = os.getenv('OLLAMA_HOST', 'http://127.0.0.1:11434').rstrip('/')
    batch_n = int(os.getenv('OLLAMA_BATCH_SIZE', '8'))
    temperature = float(os.getenv('OLLAMA_TEMPERATURE', '0.8'))
    timeout_sec = int(os.getenv('OLLAMA_TIMEOUT_SEC', '60'))
    num_predict = int(os.getenv('OLLAMA_NUM_PREDICT', '1200'))
    force = os.getenv('FORCE_REGENERATE', '0') in {'1', 'true', 'TRUE', 'yes', 'YES'}
    subject_prefix_filter = os.getenv('SUBJECT_PREFIX_FILTER', '').strip()
    max_objectives = int(os.getenv('MAX_OBJECTIVES', '0'))
    start_index = int(os.getenv('START_INDEX', '0'))
    prompt_context_max_chars = int(os.getenv('PROMPT_CONTEXT_MAX_CHARS', '1200'))
    prompt_existing_max = int(os.getenv('PROMPT_EXISTING_MAX', '8'))
    prompt_existing_max_chars = int(os.getenv('PROMPT_EXISTING_MAX_CHARS', '180'))
    max_seconds_per_objective = int(os.getenv('MAX_SECONDS_PER_OBJECTIVE', '180'))
    explicit_max_attempts = int(os.getenv('MAX_ATTEMPTS_PER_OBJECTIVE', '0'))

    if not syllabus_dir.exists() or not syllabus_dir.is_dir():
        raise RuntimeError(f"Syllabus output dir not found: {syllabus_dir}")

    db = _get_firestore()
    session = requests.Session()

    global_seen = set()
    total_written = 0

    objectives = list(_iter_objectives(syllabus_dir))
    if not objectives:
        raise RuntimeError('No objectives found in syllabus JSON files.')

    if subject_prefix_filter:
        allowed = {p.strip().upper() for p in subject_prefix_filter.split(',') if p.strip()}

        def _prefix(o: dict) -> str:
            oid = str(o.get('id') or '')
            if '-' in oid:
                return oid.split('-')[0].upper()
            if '_' in oid:
                return oid.split('_')[0].upper()
            return oid[:3].upper()

        objectives = [o for o in objectives if _prefix(o) in allowed]

    if start_index > 0:
        objectives = objectives[start_index:]

    if max_objectives > 0:
        objectives = objectives[:max_objectives]

    for idx, obj in enumerate(objectives, start=1):
        objective_id = str(obj.get('id'))
        subject = _subject_from_objective(obj)
        difficulty = int(obj.get('difficulty') or 1)
        topic = str(obj.get('objective') or objective_id)

        existing_texts: list[str] = []
        existing_hashes = set()
        existing_doc_ids = set()

        if not force:
            refs = [db.collection('questions').document(f"{objective_id}_{v}") for v in range(per_objective)]
            snaps = db.get_all(refs)
            for s in snaps:
                if s.exists:
                    existing_doc_ids.add(s.id)
                    qt = s.get('questionText') or s.get('question')
                    if isinstance(qt, str) and qt.strip():
                        h = _hash_text(qt)
                        existing_hashes.add(h)
                        existing_texts.append(qt)

        target_total = per_objective
        have = len(existing_hashes)
        remaining = max(0, target_total - have)

        if remaining == 0:
            continue

        print(f"[{idx}/{len(objectives)}] {objective_id} ({subject}) generating {remaining}...")

        generated = []
        attempts = 0
        max_attempts = max(10, (remaining // max(1, batch_n)) * 6)
        if explicit_max_attempts > 0:
            max_attempts = explicit_max_attempts
        started_at = time.time()

        while len(generated) < remaining and attempts < max_attempts:
            if max_seconds_per_objective > 0 and (time.time() - started_at) > max_seconds_per_objective:
                break
            need_now = min(batch_n, remaining - len(generated))
            prompt = _build_prompt(
                obj,
                subject,
                _difficulty_text(difficulty),
                need_now,
                existing_texts + [g['question'] for g in generated],
                prompt_context_max_chars,
                prompt_existing_max,
                prompt_existing_max_chars,
            )
            attempts += 1

            print(f"  attempt {attempts}/{max_attempts}: have {len(generated)}/{remaining} (asking {need_now})")

            try:
                raw = _ollama_generate(session, ollama_host, model, prompt, temperature, timeout_sec, num_predict)
                qs = _parse_questions_json(raw)
            except Exception:
                time.sleep(0.2)
                continue

            for q in qs:
                h = _hash_text(q['question'])
                if h in global_seen or h in existing_hashes:
                    continue
                global_seen.add(h)
                existing_hashes.add(h)
                generated.append(q)
                if len(generated) >= remaining:
                    break

        if not generated:
            continue

        batch = db.batch()
        writes_in_batch = 0
        now_iso = time.strftime('%Y-%m-%dT%H:%M:%S', time.gmtime())

        for v in range(per_objective):
            if writes_in_batch >= 400:
                batch.commit()
                total_written += writes_in_batch
                batch = db.batch()
                writes_in_batch = 0

            doc_id = f"{objective_id}_{v}"
            ref = db.collection('questions').document(doc_id)

            if not force:
                if doc_id in existing_doc_ids:
                    continue

            if not generated:
                break

            q = generated.pop(0)

            data = {
                'id': doc_id,
                'objectiveId': objective_id,
                'subjectId': subject,
                'variation': v,
                'topic': topic,
                'difficulty': difficulty,
                'questionText': q['question'],
                'options': q['options'],
                'correctAnswer': q['correctAnswer'],
                'explanation': q.get('explanation') or '',
                'storyElement': q.get('storyElement') or 'Challenge',
                'createdAt': now_iso,
                'updatedAt': now_iso,
                'generatedBy': f"ollama:{model}",
            }

            batch.set(ref, data, merge=True)
            writes_in_batch += 1

        if writes_in_batch > 0:
            batch.commit()
            total_written += writes_in_batch

    print(f"Done. Wrote/updated ~{total_written} questions.")


if __name__ == '__main__':
    main()
