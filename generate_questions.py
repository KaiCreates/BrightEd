import json
import sqlite3
import requests
import time
import os
import random
from pathlib import Path

# Configuration
OLLAMA_HOST = os.getenv('OLLAMA_HOST', 'http://127.0.0.1:11434')
MODEL = 'llama3'
DB_PATH = Path('data/questions.db')
SYLLABUS_PATH = Path('syllabuses/output/combined_syllabuses.json')
QUESTIONS_PER_SUBJECT = 400  # Target roughly this many per subject
VARIATIONS_PER_OBJECTIVE = 5 # How many questions to generate per objective found

def init_db():
    """Initialize SQLite database."""
    DB_PATH.parent.mkdir(exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute('''
        CREATE TABLE IF NOT EXISTS questions (
            id TEXT PRIMARY KEY,
            subject_id TEXT,
            objective_id TEXT,
            topic TEXT,
            difficulty INTEGER,
            variation INTEGER,
            question_json TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    conn.commit()
    return conn

def generate_prompt(objective, subject, variation):
    """Create a prompt for Ollama."""
    difficulty_text = "easy" if objective.get('difficulty', 1) == 1 else "medium" if objective.get('difficulty', 1) == 2 else "hard"
    
    return f"""
    Create a CSEC (Caribbean Secondary Education Certificate) style multiple-choice question for the subject "{subject}".
    
    Topic: {objective.get('objective', 'General')}
    Context: {objective.get('content', '')}
    Difficulty: {difficulty_text}
    Variation: {variation}
    
    Return the result as a valid JSON object with this EXACT structure:
    {{
      "question": "The question text here?",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctAnswer": 0,
      "explanation": "Brief explanation of why the answer is correct.",
      "storyElement": "A short, encouraging phrase (e.g. 'Spot on!')"
    }}
    
    IMPORTANT: Return ONLY the raw JSON. No markdown formatting.
    """

def call_ollama(prompt):
    """Call the Ollama API."""
    try:
        response = requests.post(
            f"{OLLAMA_HOST}/api/generate",
            json={
                "model": MODEL,
                "prompt": prompt,
                "stream": False,
                "format": "json",
                "temperature": 0.7
            },
            timeout=120 
        )
        if response.status_code == 200:
            return response.json().get('response', '')
        else:
            print(f"Error calling Ollama: {response.status_code} - {response.text}")
            return None
    except Exception as e:
        print(f"Exception calling Ollama: {e}")
        return None

def main():
    if not SYLLABUS_PATH.exists():
        print(f"Error: Syllabus file not found at {SYLLABUS_PATH}")
        return

    print("Loading syllabus data...")
    with open(SYLLABUS_PATH, 'r', encoding='utf-8') as f:
        objectives = json.load(f)

    conn = init_db()
    cursor = conn.cursor()

    # Group objectives by subject
    subjects = {}
    for obj in objectives:
        # Infer subject from ID or source file
        source = obj.get('source_file', '').lower()
        if 'biol' in source: subject = 'Biology'
        elif 'chem' in source: subject = 'Chemistry'
        elif 'phys' in source: subject = 'Physics'
        elif 'math' in source: subject = 'Mathematics'
        elif 'eng' in source: subject = 'English'
        elif 'social' in source: subject = 'Social Studies'
        elif 'info' in source or 'it' in source: subject = 'Information Technology'
        elif 'business' in source or 'pob' in source: subject = 'Principles of Business'
        else: subject = 'General'
        
        if subject not in subjects:
            subjects[subject] = []
        subjects[subject].append(obj)

    print(f"Found {len(objectives)} objectives across {len(subjects)} subjects.")

    for subject, objs in subjects.items():
        print(f"\nProcessing {subject} ({len(objs)} objectives found)...")
        
        # Shuffle and select a subset if too many, but try to cover all if possible
        # Loop through objectives
        
        generated_count = 0
        
        # We want roughly QUESTIONS_PER_SUBJECT. 
        # If we have 100 objs, we need 4-5 per obj.
        # If we have 10 objs, we need 40 per obj (capped at logic limit).
        
        target_variations = max(1, min(VARIATIONS_PER_OBJECTIVE, QUESTIONS_PER_SUBJECT // max(1, len(objs)) + 1))
        
        for obj in objs:
            if generated_count >= QUESTIONS_PER_SUBJECT:
                break
                
            # Check if we already have enough questions for this objective
            cursor.execute('SELECT COUNT(*) FROM questions WHERE objective_id = ?', (obj['id'],))
            existing_count = cursor.fetchone()[0]
            
            if existing_count >= target_variations:
                # print(f"  Skipping {obj['id']} - already has {existing_count} questions.")
                continue

            needed = target_variations - existing_count
            print(f"  Generating for Objective: {obj['id']} (Found: {existing_count}, Need: {needed})")
            
            for v in range(needed):
                
                prompt = generate_prompt(obj, subject, v + existing_count)
                json_response = call_ollama(prompt)
                
                if json_response:
                    try:
                        # Validate JSON
                        q_data = json.loads(json_response)
                        if 'question' in q_data and 'options' in q_data:
                            # Save to DB
                            q_id = f"{obj['id']}_{v}_{int(time.time())}"
                            cursor.execute('''
                                INSERT INTO questions (id, subject_id, objective_id, topic, difficulty, variation, question_json)
                                VALUES (?, ?, ?, ?, ?, ?, ?)
                            ''', (q_id, subject, obj['id'], obj.get('objective', ''), obj.get('difficulty', 1), v, json_response))
                            conn.commit()
                            generated_count += 1
                            print(f"    Saved question {q_id}")
                        else:
                            print("    Invalid JSON structure")
                    except json.JSONDecodeError:
                        print("    Failed to parse JSON")
                else:
                    print("    No response from Ollama")
        
        print(f"Completed {subject}: Generated {generated_count} questions.")

    conn.close()
    print("\nBatch generation complete!")

if __name__ == "__main__":
    main()
