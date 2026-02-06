"""
BrightEd Question Builder - Flask Application
CXC/CAPE MCQ Question Management System with Firebase Integration
"""

from flask import Flask, render_template, request, jsonify, flash
import firebase_admin
from firebase_admin import credentials, firestore
import uuid
from datetime import datetime
import os
import json

# Import our validation engine and explanation generator
from validators import validate_mcq, autocorrect_mcq, ExamLevel
from explanation_generator import (
    generate_explanation, 
    check_ollama_available, 
    get_available_models,
    get_fallback_explanation,
    DEFAULT_MODEL
)
from mcq_generator import (
    generate_mcq_from_topic,
    regenerate_mcq,
    DEFAULT_MODEL as GEN_MODEL
)

app = Flask(__name__)
app.secret_key = os.urandom(24)

# Check Ollama availability
OLLAMA_AVAILABLE = check_ollama_available()
print(f"Ollama: {'AVAILABLE' if OLLAMA_AVAILABLE else 'NOT AVAILABLE'}")
if OLLAMA_AVAILABLE:
    available_models = get_available_models()
    print(f"Models: {available_models}")

# Initialize Firebase
# NOTE: User must place their firebase_key.json in this directory
FIREBASE_KEY_PATH = os.path.join(os.path.dirname(__file__), 'firebase_key.json')

try:
    if os.path.exists(FIREBASE_KEY_PATH):
        cred = credentials.Certificate(FIREBASE_KEY_PATH)
        firebase_admin.initialize_app(cred)
        db = firestore.client()
        FIREBASE_ENABLED = True
    else:
        print(f"Warning: firebase_key.json not found at {FIREBASE_KEY_PATH}")
        print("Running in demo mode with mock database")
        db = None
        FIREBASE_ENABLED = False
except Exception as e:
    print(f"Firebase initialization error: {e}")
    db = None
    FIREBASE_ENABLED = False


# Mock data for demo mode
MOCK_SUBJECTS = [
    {"id": "mathematics", "name": "Mathematics", "code": "MAT"},
    {"id": "english", "name": "English Language", "code": "ENG"},
    {"id": "biology", "name": "Biology", "code": "BIO"},
    {"id": "chemistry", "name": "Chemistry", "code": "CHE"},
    {"id": "physics", "name": "Physics", "code": "PHY"},
    {"id": "history", "name": "Caribbean History", "code": "HIS"},
    {"id": "geography", "name": "Geography", "code": "GEO"},
    {"id": "principles_of_accounts", "name": "Principles of Accounts", "code": "POA"},
    {"id": "principles_of_business", "name": "Principles of Business", "code": "POB"},
    {"id": "economics", "name": "Economics", "code": "ECO"},
    {"id": "agricultural_science", "name": "Agricultural Science", "code": "AGR"},
    {"id": "information_technology", "name": "Information Technology", "code": "IT"},
    {"id": "integrated_science", "name": "Integrated Science", "code": "IS"},
    {"id": "social_studies", "name": "Social Studies", "code": "SS"},
    {"id": "spanish", "name": "Spanish", "code": "SPA"},
    {"id": "french", "name": "French", "code": "FRE"},
]

MOCK_QUESTIONS = []


def get_subjects():
    """Fetch subjects from Firebase or return mock data"""
    if not FIREBASE_ENABLED:
        return MOCK_SUBJECTS
    
    try:
        subjects_ref = db.collection("subjects").stream()
        subjects = []
        for subj in subjects_ref:
            data = subj.to_dict()
            data["id"] = subj.id
            subjects.append(data)
        return subjects if subjects else MOCK_SUBJECTS
    except Exception as e:
        print(f"Error fetching subjects: {e}")
        return MOCK_SUBJECTS


def get_subject_stats(subject_id: str) -> dict:
    """Get question count statistics for a subject"""
    if not FIREBASE_ENABLED:
        # Count from mock data
        count = len([q for q in MOCK_QUESTIONS if q.get("subjectId") == subject_id])
        return {"total": count, "byTopic": {}}
    
    try:
        questions_ref = db.collection("questions").where("subjectId", "==", subject_id)
        questions = questions_ref.stream()
        
        total = 0
        by_topic = {}
        
        for q in questions:
            total += 1
            data = q.to_dict()
            topic = data.get("topicId") or "uncategorized"
            by_topic[topic] = by_topic.get(topic, 0) + 1
        
        return {"total": total, "byTopic": by_topic}
    except Exception as e:
        print(f"Error fetching stats: {e}")
        return {"total": 0, "byTopic": {}}


def get_next_question_id(subject_id: str, topic_id: str = None, exam_level: str = "csec") -> str:
    """Generate next sequential question ID like POB-02-00003_1"""
    # Get subject code
    subject_code = subject_id.upper()[:3]
    if len(subject_id) > 3:
        # Try to get better code from subject name
        words = subject_id.replace("_", " ").split()
        if len(words) > 1:
            subject_code = "".join([w[0].upper() for w in words[:3]])
        else:
            subject_code = subject_id[:3].upper()
    
    # Unit code (default to 01 if no topic)
    unit = "01"
    if topic_id:
        # Extract number from topic or use first 2 chars
        digits = "".join(filter(str.isdigit, topic_id))
        if digits:
            unit = digits[:2].zfill(2)
        else:
            unit = topic_id[:2].upper().zfill(2)
    elif exam_level == "cape":
        unit = "02"  # CAPE default to unit 2
    
    # Find existing questions with this prefix to get next sequence
    prefix = f"{subject_code}-{unit}-"
    max_seq = 0
    
    if FIREBASE_ENABLED:
        try:
            # Query questions starting with this prefix
            questions_ref = db.collection("questions").stream()
            for q in questions_ref:
                qid = q.id
                if qid.startswith(prefix):
                    # Extract sequence number: POB-02-00003_1 -> 00003
                    parts = qid.split("-")
                    if len(parts) >= 3:
                        seq_part = parts[2].split("_")[0]
                        try:
                            seq = int(seq_part)
                            max_seq = max(max_seq, seq)
                        except ValueError:
                            pass
        except Exception as e:
            print(f"Error querying existing IDs: {e}")
    else:
        # Check mock questions
        for q in MOCK_QUESTIONS:
            qid = q.get("id", "")
            if qid.startswith(prefix):
                parts = qid.split("-")
                if len(parts) >= 3:
                    seq_part = parts[2].split("_")[0]
                    try:
                        seq = int(seq_part)
                        max_seq = max(max_seq, seq)
                    except ValueError:
                        pass
    
    next_seq = max_seq + 1
    version = 1
    
    return f"{prefix}{next_seq:05d}_{version}"


def save_question(data: dict) -> str:
    """Save a question to Firebase or mock database"""
    # Generate sequential ID instead of UUID
    question_id = get_next_question_id(
        data["subjectId"],
        data.get("topicId"),
        data.get("examLevel", "csec")
    )
    
    question_data = {
        "id": question_id,
        "subjectId": data["subjectId"],
        "topicId": data.get("topicId") or None,
        "type": "mcq",
        "examLevel": data.get("examLevel", "csec"),
        "question": data["question"],
        "choices": data["choices"],
        "correctAnswer": data["correctAnswer"],
        "difficulty": data.get("difficulty", "medium"),
        "createdBy": data.get("createdBy", "anonymous"),
        "createdAt": datetime.utcnow().isoformat(),
        "updatedAt": datetime.utcnow().isoformat(),
        "validationStatus": data.get("validationStatus", "pending"),
        "errors": data.get("errors", []),
        "warnings": data.get("warnings", []),
        "explanation": data.get("explanation", ""),  # NEW: Wrong answer explanation
    }
    
    if not FIREBASE_ENABLED:
        MOCK_QUESTIONS.append(question_data)
        print(f"Question saved to mock DB: {question_id}")
        return question_id
    
    try:
        db.collection("questions").document(question_id).set(question_data)
        
        # Update subject question count
        subject_ref = db.collection("subjects").document(data["subjectId"])
        subject = subject_ref.get()
        if subject.exists:
            current_count = subject.to_dict().get("questionCount", 0)
            subject_ref.update({"questionCount": current_count + 1})
        
        return question_id
    except Exception as e:
        print(f"Error saving question: {e}")
        raise


def get_recent_questions(subject_id: str = None, limit: int = 10):
    """Get recently added questions"""
    if not FIREBASE_ENABLED:
        questions = MOCK_QUESTIONS
        if subject_id:
            questions = [q for q in questions if q.get("subjectId") == subject_id]
        return sorted(questions, key=lambda x: x.get("createdAt", ""), reverse=True)[:limit]
    
    try:
        query = db.collection("questions").order_by("createdAt", direction=firestore.Query.DESCENDING)
        if subject_id:
            query = query.where("subjectId", "==", subject_id)
        
        questions = query.limit(limit).stream()
        return [{"id": q.id, **q.to_dict()} for q in questions]
    except Exception as e:
        print(f"Error fetching questions: {e}")
        return []


# Routes
@app.route("/")
def index():
    """Main page with question builder"""
    subjects = get_subjects()
    return render_template("index.html", subjects=subjects, firebase_enabled=FIREBASE_ENABLED)


@app.route("/api/subjects", methods=["GET"])
def api_subjects():
    """API endpoint to get all subjects"""
    subjects = get_subjects()
    return jsonify({"subjects": subjects})


@app.route("/api/subjects/<subject_id>/stats", methods=["GET"])
def api_subject_stats(subject_id):
    """API endpoint to get subject statistics"""
    stats = get_subject_stats(subject_id)
    return jsonify(stats)


@app.route("/api/subjects/<subject_id>/questions", methods=["GET"])
def api_subject_questions(subject_id):
    """API endpoint to get questions for a subject"""
    limit = request.args.get("limit", 10, type=int)
    questions = get_recent_questions(subject_id, limit)
    return jsonify({"questions": questions})


@app.route("/api/validate", methods=["POST"])
def api_validate():
    """API endpoint to validate a question without saving"""
    data = request.json
    
    question = data.get("question", "")
    choices = data.get("choices", {})
    correct = data.get("correctAnswer", "A")
    exam_level = data.get("examLevel", "csec")
    
    result = validate_mcq(question, choices, correct, exam_level)
    return jsonify(result)


@app.route("/api/autocorrect", methods=["POST"])
def api_autocorrect():
    """API endpoint to auto-correct a question"""
    data = request.json
    
    question = data.get("question", "")
    choices = data.get("choices", {})
    
    result = autocorrect_mcq(question, choices)
    return jsonify(result)


@app.route("/api/explain", methods=["POST"])
def api_generate_explanation():
    """API endpoint to generate wrong-answer explanation using Ollama"""
    data = request.json
    
    question = data.get("question", "")
    choices = data.get("choices", {})
    correct = data.get("correctAnswer", "A")
    subject = data.get("subjectId", "")
    model = data.get("model", DEFAULT_MODEL)
    
    # Try Ollama first
    if OLLAMA_AVAILABLE:
        explanation = generate_explanation(
            question=question,
            choices=choices,
            correct_answer=correct,
            subject=subject,
            model=model
        )
        
        if explanation:
            return jsonify({
                "status": "success",
                "explanation": explanation,
                "source": "ollama",
                "model": model
            })
    
    # Fallback to template-based explanation
    explanation = get_fallback_explanation(
        question=question,
        choices=choices,
        correct_answer=correct,
        subject=subject
    )
    
    return jsonify({
        "status": "success",
        "explanation": explanation,
        "source": "fallback",
        "message": "Ollama not available, using fallback explanation"
    })


@app.route("/api/explain/<question_id>", methods=["GET"])
def api_get_explanation(question_id):
    """API endpoint to get stored explanation for a question"""
    if not FIREBASE_ENABLED:
        # Find in mock data
        for q in MOCK_QUESTIONS:
            if q.get("id") == question_id:
                return jsonify({
                    "questionId": question_id,
                    "explanation": q.get("explanation", "")
                })
        return jsonify({"error": "Question not found"}), 404
    
    try:
        doc = db.collection("questions").document(question_id).get()
        if doc.exists:
            data = doc.to_dict()
            return jsonify({
                "questionId": question_id,
                "explanation": data.get("explanation", "")
            })
        return jsonify({"error": "Question not found"}), 404
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/submit", methods=["POST"])
def api_submit():
    """API endpoint to submit a question"""
    data = request.json
    
    # Validate first
    question = data.get("question", "")
    choices = data.get("choices", {})
    correct = data.get("correctAnswer", "A")
    exam_level = data.get("examLevel", "csec")
    
    validation = validate_mcq(question, choices, correct, exam_level)
    
    # If strict mode and has errors, reject
    strict_mode = data.get("strictMode", True)
    if strict_mode and not validation["is_valid"]:
        return jsonify({
            "status": "rejected",
            "message": "Question does not meet CXC/CAPE standards",
            "validation": validation
        }), 400
    
    # Prepare question data
    submit_data = {
        "subjectId": data.get("subjectId"),
        "topicId": data.get("topicId"),
        "examLevel": exam_level,
        "question": question,
        "choices": choices,
        "correctAnswer": correct,
        "difficulty": data.get("difficulty", "medium"),
        "createdBy": data.get("createdBy", "anonymous"),
        "validationStatus": validation["status"],
        "errors": validation["errors"],
        "warnings": validation["warnings"],
    }
    
    try:
        question_id = save_question(submit_data)
        
        return jsonify({
            "status": "success",
            "id": question_id,
            "message": "Question saved successfully",
            "validation": validation
        })
    except Exception as e:
        return jsonify({
            "status": "error",
            "message": str(e)
        }), 500


@app.route("/api/questions/recent", methods=["GET"])
def api_recent_questions():
    """API endpoint to get recent questions across all subjects"""
    limit = request.args.get("limit", 10, type=int)
    questions = get_recent_questions(limit=limit)
    return jsonify({"questions": questions})


@app.route("/api/stats/overview", methods=["GET"])
def api_stats_overview():
    """API endpoint to get overall statistics"""
    subjects = get_subjects()
    
    overview = {
        "totalSubjects": len(subjects),
        "subjects": []
    }
    
    total_questions = 0
    
    for subject in subjects:
        stats = get_subject_stats(subject["id"])
        total_questions += stats["total"]
        
        overview["subjects"].append({
            "id": subject["id"],
            "name": subject["name"],
            "code": subject.get("code", ""),
            "questionCount": stats["total"],
            "byTopic": stats["byTopic"]
        })
    
    overview["totalQuestions"] = total_questions
    
    return jsonify(overview)


# Error handlers
@app.errorhandler(404)
def not_found(e):
    return jsonify({"error": "Not found"}), 404


@app.errorhandler(500)
def server_error(e):
    return jsonify({"error": "Server error"}), 500


if __name__ == "__main__":
    print("=" * 60)
    print("BrightEd Question Builder")
    print("=" * 60)
    print(f"Firebase: {'ENABLED' if FIREBASE_ENABLED else 'DEMO MODE'}")
    print(f"Key path: {FIREBASE_KEY_PATH}")
    print("=" * 60)
    print("Open http://127.0.0.1:5000 in your browser")
    print("=" * 60)
    
    app.run(debug=True, host="0.0.0.0", port=5000)
