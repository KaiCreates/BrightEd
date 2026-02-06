"""
AI MCQ Question Generator for BrightEd
Generates complete MCQ questions from topic descriptions using Ollama
"""

import requests
import json
import re
from typing import Optional, Dict

OLLAMA_HOST = "http://localhost:11434"
DEFAULT_MODEL = "llama3.2:latest"


def generate_mcq_from_topic(
    topic: str,
    subject: str,
    exam_level: str = "csec",
    difficulty: str = "medium",
    model: str = DEFAULT_MODEL
) -> Optional[Dict]:
    """
    Generate a complete MCQ question from a topic description
    Returns dict with question, choices, correct answer, and explanation
    """
    
    # Build the prompt for MCQ generation
    prompt = f"""You are a CXC/CSEC exam question writer. Create one multiple choice question on the following topic.

SUBJECT: {subject}
EXAM LEVEL: {exam_level.upper()}
DIFFICULTY: {difficulty}
TOPIC: {topic}

Generate a question in this exact format:

QUESTION: [Write a clear, concise question stem - max 30 words]

A: [First option]
B: [Second option]
C: [Third option]
D: [Fourth option]

CORRECT: [Letter A, B, C, or D]

EXPLANATION: [2-3 sentence explanation of why the correct answer is right and common misconception]

Rules:
- Only ONE correct answer
- All options should be similar length and format
- Avoid "all of the above" or "none of the above"
- Question should test understanding, not just recall
- Use formal academic language

Output ONLY in the format above."""

    try:
        response = requests.post(
            f"{OLLAMA_HOST}/api/generate",
            json={
                "model": model,
                "prompt": prompt,
                "stream": False,
                "options": {
                    "temperature": 0.8,
                    "num_predict": 300,
                }
            },
            timeout=60
        )
        
        if response.status_code == 200:
            result = response.json()
            raw_output = result.get("response", "").strip()
            
            # Parse the generated output
            parsed = _parse_mcq_output(raw_output)
            
            if parsed and _validate_generated_mcq(parsed):
                return parsed
            else:
                print(f"Failed to parse or validate generated MCQ: {raw_output}")
                return None
        else:
            print(f"Ollama error: {response.status_code} - {response.text}")
            return None
            
    except requests.exceptions.ConnectionError:
        print("Ollama not running - cannot generate question")
        return None
    except Exception as e:
        print(f"Error generating MCQ: {e}")
        return None


def _parse_mcq_output(output: str) -> Optional[Dict]:
    """Parse the LLM output into structured MCQ data"""
    try:
        # Extract question
        question_match = re.search(r'QUESTION:\s*(.+?)(?=\n\s*[A-D]:|\Z)', output, re.DOTALL | re.IGNORECASE)
        question = question_match.group(1).strip() if question_match else ""
        
        # Extract choices
        choices = {}
        for letter in ['A', 'B', 'C', 'D']:
            pattern = rf'{letter}:\s*(.+?)(?=\n\s*[A-D]:|\n\s*CORRECT:|\Z)'
            match = re.search(pattern, output, re.DOTALL | re.IGNORECASE)
            choices[letter] = match.group(1).strip() if match else ""
        
        # Extract correct answer
        correct_match = re.search(r'CORRECT:\s*([A-D])', output, re.IGNORECASE)
        correct = correct_match.group(1).upper() if correct_match else "A"
        
        # Extract explanation
        explanation_match = re.search(r'EXPLANATION:\s*(.+?)(?=\Z)', output, re.DOTALL | re.IGNORECASE)
        explanation = explanation_match.group(1).strip() if explanation_match else ""
        
        # Clean up the question (remove any leading/trailing punctuation issues)
        question = _clean_text(question)
        for key in choices:
            choices[key] = _clean_text(choices[key])
        explanation = _clean_text(explanation)
        
        if question and all(choices.values()):
            return {
                "question": question,
                "choices": choices,
                "correctAnswer": correct,
                "explanation": explanation,
                "topic": ""  # Will be filled by caller
            }
        
        return None
        
    except Exception as e:
        print(f"Parse error: {e}")
        return None


def _validate_generated_mcq(data: Dict) -> bool:
    """Basic validation of generated MCQ"""
    # Check question exists and is reasonable length
    if not data.get("question") or len(data["question"]) < 10:
        return False
    
    # Check all choices exist
    choices = data.get("choices", {})
    if len(choices) != 4 or not all(choices.values()):
        return False
    
    # Check correct answer is valid
    if data.get("correctAnswer") not in ['A', 'B', 'C', 'D']:
        return False
    
    # Check for forbidden phrases
    question_lower = data["question"].lower()
    forbidden = ["all of the above", "none of the above", "all of these", "none of these"]
    for phrase in forbidden:
        if phrase in question_lower:
            return False
    
    return True


def _clean_text(text: str) -> str:
    """Clean up generated text"""
    if not text:
        return text
    
    # Remove extra whitespace
    text = " ".join(text.split())
    
    # Remove common LLM artifacts
    text = text.replace("**", "").replace("__", "")
    
    # Ensure proper capitalization
    if text and text[0].islower():
        text = text[0].upper() + text[1:]
    
    return text.strip()


def regenerate_mcq(
    topic: str,
    subject: str,
    previous_question: str = "",
    exam_level: str = "csec",
    difficulty: str = "medium",
    model: str = DEFAULT_MODEL
) -> Optional[Dict]:
    """
    Regenerate a different MCQ on the same topic
    Asks the model to avoid the previous question
    """
    avoid_text = f"""
IMPORTANT: Do NOT use this previous question (generate a different one):
PREVIOUS: {previous_question}

Generate a completely different question on the same topic.""" if previous_question else ""
    
    prompt = f"""You are a CXC/CSEC exam question writer. Create one multiple choice question on the following topic.

SUBJECT: {subject}
EXAM LEVEL: {exam_level.upper()}
DIFFICULTY: {difficulty}
TOPIC: {topic}
{avoid_text}

Generate a question in this exact format:

QUESTION: [Write a clear, concise question stem - max 30 words]

A: [First option]
B: [Second option]
C: [Third option]
D: [Fourth option]

CORRECT: [Letter A, B, C, or D]

EXPLANATION: [2-3 sentence explanation of why the correct answer is right]

Rules:
- Only ONE correct answer
- All options similar length and format
- No "all of the above" or "none of the above"
- Test understanding, not just recall
- Use formal academic language

Output ONLY in the format above."""

    try:
        response = requests.post(
            f"{OLLAMA_HOST}/api/generate",
            json={
                "model": model,
                "prompt": prompt,
                "stream": False,
                "options": {
                    "temperature": 0.9,  # Slightly higher for variety
                    "num_predict": 300,
                }
            },
            timeout=60
        )
        
        if response.status_code == 200:
            result = response.json()
            raw_output = result.get("response", "").strip()
            parsed = _parse_mcq_output(raw_output)
            
            if parsed and _validate_generated_mcq(parsed):
                return parsed
            
        return None
        
    except Exception as e:
        print(f"Error regenerating MCQ: {e}")
        return None


# Testing
if __name__ == "__main__":
    from explanation_generator import check_ollama_available
    
    if check_ollama_available():
        print("Testing MCQ generation...")
        result = generate_mcq_from_topic(
            topic="Photosynthesis process in plants",
            subject="Biology",
            exam_level="csec",
            difficulty="medium"
        )
        
        if result:
            print("\n=== Generated MCQ ===")
            print(f"Question: {result['question']}")
            print(f"A: {result['choices']['A']}")
            print(f"B: {result['choices']['B']}")
            print(f"C: {result['choices']['C']}")
            print(f"D: {result['choices']['D']}")
            print(f"Correct: {result['correctAnswer']}")
            print(f"Explanation: {result['explanation']}")
        else:
            print("Failed to generate MCQ")
    else:
        print("Ollama not running")
