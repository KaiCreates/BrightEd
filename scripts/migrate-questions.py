import os
import json
import firebase_admin
from firebase_admin import credentials, firestore
from pathlib import Path

# Initialize Firebase Admin
SERVICE_ACCOUNT_PATH = "brighted-b36ba-firebase-adminsdk-fbsvc-d62f85ffd0.json"
JSON_DIR = Path("syllabuses/questions")

def migrate():
    if not os.path.exists(SERVICE_ACCOUNT_PATH):
        print(f"Error: Service account file {SERVICE_ACCOUNT_PATH} not found.")
        return

    if not firebase_admin._apps:
        cred = credentials.Certificate(SERVICE_ACCOUNT_PATH)
        firebase_admin.initialize_app(cred)
    
    db = firestore.client()
    files = list(JSON_DIR.glob("*.json"))
    print(f"Found {len(files)} files to migrate.")

    total_uploaded = 0

    for file_path in files:
        subject_name = file_path.stem.replace("-Questions", "").replace("CSEC-", "").lower()
        print(f"Processing {subject_name}...")
        
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                questions = json.load(f)
        except Exception as e:
            print(f"  Error reading {file_path}: {e}")
            continue

        if not isinstance(questions, list):
            print(f"  Skipping {file_path}: Expected a list of questions.")
            continue

        batch = db.batch()
        count = 0
        
        for q in questions:
            if not isinstance(q, dict): continue
            
            q_id = q.get('id')
            if not q_id: continue

            correct_answer = q.get('answer')
            answer_index = -1
            options_list = q.get('options', [])
            
            if isinstance(options_list, list):
                if isinstance(correct_answer, str):
                    for idx, opt in enumerate(options_list):
                        if isinstance(opt, dict) and opt.get('id') == correct_answer:
                            answer_index = idx
                            break
                elif isinstance(correct_answer, int):
                    answer_index = correct_answer

            doc_data = {
                "objectiveId": q.get('topic_id'),
                "subjectId": subject_name,
                "type": q.get('type', 'MCQ'),
                "difficultyWeight": q.get('difficulty', 5),
                "question": q.get('question', ''),
                "correctAnswer": answer_index,
                "options": [opt.get('text') for opt in options_list if isinstance(opt, dict)] if isinstance(options_list, list) else [],
                "explanation": q.get('explanation', ''),
                "subSkills": [q.get('topic_id')] if q.get('topic_id') else [],
                "contentType": "standard",
                "distractorSimilarity": 0.5,
                "expectedTime": 30,
                "verificationStatus": "pending"
            }

            if q.get('type') == 'DND':
                doc_data['items'] = q.get('items', [])

            doc_ref = db.collection('questions').document(str(q_id))
            batch.set(doc_ref, doc_data)
            count += 1
            total_uploaded += 1

            if count % 400 == 0:
                batch.commit()
                batch = db.batch()
                print(f"  Uploaded {count} questions...")

        batch.commit()
        print(f"  Finished {subject_name}. Total: {count}")

    print(f"Migration Complete. Total questions uploaded: {total_uploaded}")

if __name__ == "__main__":
    migrate()
