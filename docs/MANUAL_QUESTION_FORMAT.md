# Manual Question Entry Guide

To add questions manually to BrightEd, you must create a document in the `questions` collection in Firestore.

## Quick Start: Firebase Console
1.  **Collection:** Navigate to the `questions` collection.
2.  **Add Document:** Click "Add document".
3.  **Document ID:** Click **Auto-ID**.
4.  **Fields:** Add the fields below one by one.

## Document Structure
The document ID can be anything (auto-generated is fine), but the **fields** must match this structure exactly:

```json
{
  "objectiveId": "MATH-ALG-01",  // MUST match a real Syllabus Objective ID
  "text": "What is 2 + 2?",
  "type": "multiple-choice",     // Options: 'multiple-choice', 'fill-in-blank', 'boolean'
  "options": [
    "3",
    "4",
    "5",
    "22"
  ],
  "correctAnswer": "4",          // Must match one of the options exactly
  "explanation": "2 plus 2 equals 4.",
  "difficulty": 1,               // 1 (Easy) to 5 (Hard)
  "points": 10,
  "bloomLevel": "remember",      // 'remember', 'understand', 'apply', 'analyze', 'evaluate', 'create'
  "tags": ["algebra", "basics"]
}
```

## How to Refresh
After adding questions to Firestore, the system won't "see" them immediately because it uses a cache to check which objectives have questions.

**To fix this:**
1. Open your terminal in the project folder.
2. Run: `.\scripts\refresh-content.bat`
3. Wait for the green "Done!" message.
4. Restart your next.js server if needed (usually not required for API calls, but good practice).

## Finding Objective IDs
You can find valid `objectiveId`s in `syllabuses/output/combined_syllabuses.json` or by looking at the Learning Map URL when you click a node.
