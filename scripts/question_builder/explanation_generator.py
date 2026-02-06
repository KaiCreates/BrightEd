"""
Ollama Explanation Generator for BrightEd
Generates lightweight explanations for wrong answers using local Ollama models
"""

import requests
import json
from typing import Optional

OLLAMA_HOST = "http://localhost:11434"
DEFAULT_MODEL = "llama3.2:latest"  # Lightweight model, ~2GB


def check_ollama_available() -> bool:
    """Check if Ollama is running"""
    try:
        response = requests.get(f"{OLLAMA_HOST}/api/tags", timeout=2)
        return response.status_code == 200
    except:
        return False


def get_available_models() -> list:
    """Get list of available Ollama models"""
    try:
        response = requests.get(f"{OLLAMA_HOST}/api/tags", timeout=5)
        if response.status_code == 200:
            data = response.json()
            return [m["name"] for m in data.get("models", [])]
        return []
    except Exception as e:
        print(f"Error fetching models: {e}")
        return []


def generate_explanation(
    question: str,
    choices: dict,
    correct_answer: str,
    subject: str = "",
    model: str = DEFAULT_MODEL
) -> Optional[str]:
    """
    Generate a student-friendly explanation for the correct answer
    Explains why the correct answer is right and common misconceptions
    """
    
    correct_text = choices.get(correct_answer, "")
    
    # Build prompt for the model
    prompt = f"""You are a helpful Caribbean high school teacher explaining a CXC/CSEC exam question to a student who got it wrong. Be encouraging and clear.

SUBJECT: {subject}

QUESTION: {question}

OPTIONS:
A: {choices.get('A', '')}
B: {choices.get('B', '')}
C: {choices.get('C', '')}
D: {choices.get('D', '')}

CORRECT ANSWER: {correct_answer} ({correct_text})

Generate a 2-3 sentence explanation that:
1. Explains WHY the correct answer is right (the concept/key fact)
2. Mentions a common misconception that leads students to pick wrong answers
3. Uses simple language a Form 4-5 student can understand

Keep it under 100 words. Be encouraging."""

    try:
        response = requests.post(
            f"{OLLAMA_HOST}/api/generate",
            json={
                "model": model,
                "prompt": prompt,
                "stream": False,
                "options": {
                    "temperature": 0.7,
                    "num_predict": 150,  # Limit output tokens
                }
            },
            timeout=30
        )
        
        if response.status_code == 200:
            result = response.json()
            explanation = result.get("response", "").strip()
            
            # Clean up common issues
            explanation = _clean_explanation(explanation)
            
            return explanation
        else:
            print(f"Ollama error: {response.status_code} - {response.text}")
            return None
            
    except requests.exceptions.ConnectionError:
        print("Ollama not running - cannot generate explanation")
        return None
    except Exception as e:
        print(f"Error generating explanation: {e}")
        return None


def generate_explanation_batch(
    question_data: list,
    model: str = DEFAULT_MODEL
) -> dict:
    """
    Generate explanations for multiple questions
    Returns dict mapping question_id -> explanation
    """
    results = {}
    
    for q in question_data:
        qid = q.get("id", "unknown")
        explanation = generate_explanation(
            question=q.get("question", ""),
            choices=q.get("choices", {}),
            correct_answer=q.get("correctAnswer", "A"),
            subject=q.get("subjectId", ""),
            model=model
        )
        if explanation:
            results[qid] = explanation
    
    return results


def _clean_explanation(text: str) -> str:
    """Clean up common formatting issues from LLM output"""
    # Remove "Answer:" or "Explanation:" prefixes
    text = text.replace("Answer:", "").replace("Explanation:", "").strip()
    
    # Remove extra newlines
    text = " ".join(text.split())
    
    # Ensure it ends with proper punctuation
    if text and text[-1] not in ".!?":
        text += "."
    
    return text


def get_fallback_explanation(
    question: str,
    choices: dict,
    correct_answer: str,
    subject: str = ""
) -> str:
    """
    Generate a simple fallback explanation without AI
    Used when Ollama is not available
    """
    correct_text = choices.get(correct_answer, "")
    
    templates = {
        "mathematics": f"The correct answer is {correct_answer}) {correct_text}. This solution follows from applying the relevant mathematical principles correctly.",
        "biology": f"The correct answer is {correct_answer}) {correct_text}. Remember that biological processes follow specific mechanisms and definitions.",
        "chemistry": f"The correct answer is {correct_answer}) {correct_text}. Chemical reactions and properties depend on specific atomic and molecular behaviors.",
        "physics": f"The correct answer is {correct_answer}) {correct_text}. Physical phenomena follow established laws and principles.",
        "history": f"The correct answer is {correct_answer}) {correct_text}. Historical events have specific causes, contexts, and outcomes.",
        "geography": f"The correct answer is {correct_answer}) {correct_text}. Geographic features and processes follow specific patterns.",
        "principles_of_business": f"The correct answer is {correct_answer}) {correct_text}. Business concepts have specific definitions and applications in real-world scenarios.",
        "principles_of_accounts": f"The correct answer is {correct_answer}) {correct_text}. Accounting follows standard principles and double-entry rules.",
        "economics": f"The correct answer is {correct_answer}) {correct_text}. Economic principles explain how markets and economies function.",
    }
    
    subject_lower = subject.lower().replace(" ", "_")
    
    for key in templates:
        if key in subject_lower:
            return templates[key]
    
    # Generic fallback
    return f"The correct answer is {correct_answer}) {correct_text}. Understanding this concept requires grasping the key principles of the subject."


# Testing function
if __name__ == "__main__":
    # Test if Ollama is available
    if check_ollama_available():
        print("✓ Ollama is running")
        models = get_available_models()
        print(f"Available models: {models}")
        
        # Test generation
        test_q = {
            "question": "What is the primary function of mitochondria in a cell?",
            "choices": {
                "A": "Protein synthesis",
                "B": "Energy production",
                "C": "Waste removal",
                "D": "Cell division"
            },
            "correctAnswer": "B",
            "subjectId": "biology"
        }
        
        print("\nGenerating explanation...")
        explanation = generate_explanation(
            test_q["question"],
            test_q["choices"],
            test_q["correctAnswer"],
            test_q["subjectId"]
        )
        
        if explanation:
            print(f"Explanation: {explanation}")
        else:
            print("Failed to generate explanation")
    else:
        print("✗ Ollama is not running. Start it with: ollama serve")
        print("Then pull a model: ollama pull llama3.2:latest")
