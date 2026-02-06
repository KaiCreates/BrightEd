# BrightEd Question Builder

A Flask-based web application for creating and managing CXC/CAPE-compliant multiple choice questions with Firebase Firestore integration.

## Features

- **Subject Management**: Select from CSEC/CAPE subjects with live question count statistics
- **CXC/CAPE Validation Engine**: Automatic enforcement of official Caribbean examination standards
- **AI Auto-Correction**: One-click formatting and grammar correction
- **Real-time Validation**: Instant feedback on question compliance
- **Firebase Integration**: Direct sync with your BrightEd Firestore database
- **Demo Mode**: Works without Firebase for testing

## CXC/CAPE Standards Enforced

- ✅ Exactly 4 answer choices (A-D)
- ✅ Maximum 35 words per question stem
- ✅ No forbidden phrases ("all of the above", "none of the above", etc.)
- ✅ No negative phrasing (NOT, EXCEPT, UNLESS)
- ✅ Parallel option formatting
- ✅ Answer integrity (no obvious length giveaways)
- ✅ Formal academic language only

## Setup Instructions

### 1. Install Dependencies

```bash
cd /home/kai/Documents/BrightEd/scripts/question_builder
pip install -r requirements.txt
```

### 2. Firebase Configuration

**Option A: Full Firebase Integration**

1. Go to your Firebase Console → Project Settings → Service Accounts
2. Click "Generate New Private Key"
3. Save the downloaded JSON file as `firebase_key.json` in this directory
4. The app will automatically connect to your BrightEd Firestore database

**Option B: Demo Mode (No Firebase)**

If you don't add `firebase_key.json`, the app runs in demo mode with mock data.

### 3. Run the Application

```bash
python app.py
```

Then open http://127.0.0.1:5000 in your browser.

## Firestore Data Structure

The app uses these collections:

### `subjects`
```json
{
  "id": "mathematics",
  "name": "Mathematics",
  "code": "MAT",
  "questionCount": 1240
}
```

### `questions`
```json
{
  "id": "uuid",
  "subjectId": "mathematics",
  "topicId": "algebra",
  "type": "mcq",
  "examLevel": "csec",
  "question": "What is the value of 2x + 3 when x = 4?",
  "choices": {
    "A": "11",
    "B": "8",
    "C": "14",
    "D": "7"
  },
  "correctAnswer": "A",
  "difficulty": "medium",
  "validationStatus": "compliant",
  "createdAt": "timestamp"
}
```

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/` | GET | Main web interface |
| `/api/subjects` | GET | List all subjects |
| `/api/subjects/<id>/stats` | GET | Get question counts for subject |
| `/api/validate` | POST | Validate a question |
| `/api/autocorrect` | POST | Auto-correct formatting |
| `/api/submit` | POST | Save a question |
| `/api/stats/overview` | GET | Overall statistics |

## Usage Workflow

1. **Select Subject**: Click a subject in the left sidebar
2. **Enter Question**: Type the MCQ stem (max 35 words)
3. **Add Choices**: Fill in all 4 options (A-D)
4. **Select Answer**: Click A/B/C/D to mark the correct answer
5. **Validate**: Click "Validate" to check CXC compliance
6. **Auto-Correct**: Click "Auto-Correct" to fix formatting issues
7. **Save**: Click "Save Question" to store in database

## Validation Rules

### Strict Rejections (Cannot Save)
- "All of the above" / "None of the above"
- More than 35 words in stem
- Less than 4 answer choices
- Empty fields

### Warnings (Can Save with Caution)
- Negative phrasing (NOT, EXCEPT)
- Informal language
- Length imbalance in options
- Missing question mark

## File Structure

```
question_builder/
├── app.py              # Flask application
├── validators.py       # CXC validation engine
├── requirements.txt    # Python dependencies
├── firebase_key.json   # Your Firebase credentials (not included)
└── templates/
    └── index.html      # Web interface
```

## Extending the AI Auto-Correction

The current auto-corrector uses rule-based cleaning. To add AI model support:

1. Edit `validators.py` → `AutoCorrector` class
2. Add model loading in `__init__`
3. Replace `_correct_stem` and `_correct_choice` with model inference

Example integration with Ollama:
```python
def _correct_stem(self, question: str) -> str:
    import requests
    response = requests.post('http://localhost:11434/api/generate', json={
        'model': 'llama2',
        'prompt': f'Correct this CXC question: {question}'
    })
    return response.json()['response']
```

## Production Deployment

For production, use Gunicorn:

```bash
gunicorn -w 4 -b 0.0.0.0:5000 app:app
```

Or with a process manager like systemd or supervisor.

## Troubleshooting

**Firebase connection errors**: Check that `firebase_key.json` exists and is valid
**Port already in use**: Change the port in `app.py` (default is 5000)
**Validation not working**: Check browser console for JavaScript errors

## License

Part of the BrightEd educational platform.
