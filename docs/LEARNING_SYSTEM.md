# BrightEd Learning System Documentation

## Overview

The BrightEd learning system uses adaptive algorithms to create personalized learning paths from CXC syllabus data. It includes AI-powered content cleaning (via Ollama/Llama 3) with fallback mechanisms to ensure the app works without AI.

## Architecture

### 1. Syllabus Data Structure

Syllabus data is stored in JSON format with the following structure:
```json
{
  "id": "OBJ-00001",
  "section": "Section name",
  "subsection": "Subsection",
  "objective": "Learning objective",
  "content": "Content text (may be mangled from PDF)",
  "specific_objectives": ["obj1", "obj2"],
  "content_items": ["item1"],
  "difficulty": 1-5,
  "page_number": 1,
  "keywords": ["keyword1"],
  "hash": "unique_hash",
  "source_file": "CSEC Mathematics.pdf",
  "extraction_date": "2026-01-21T..."
}
```

### 2. Learning Path Algorithm

The adaptive learning algorithm (`lib/learning-algorithm.ts`) generates personalized paths based on:

- **Difficulty Progression**: Starts with easier objectives and progresses
- **User Progress**: Prioritizes weak areas (low mastery/stability)
- **Subject Filtering**: Focuses on user's selected subjects
- **Prerequisites**: Ensures foundational concepts are mastered first

#### Key Functions:

- `calculateMastery()`: Computes mastery score (0-100) based on:
  - Correct answer rate
  - Stability bonus
  - Time efficiency
  - Attempt penalty

- `calculateStability()`: Measures consistency (0-100) based on:
  - Recent performance
  - Attempt count
  - Recency of practice

- `getNextObjective()`: Recommends next objective to study

### 3. Content Cleaning System

#### AI-Powered Cleaning (Llama 3 via Ollama)

The system can use Ollama's Llama 3 model to clean mangled PDF text:

```typescript
// API endpoint: POST /api/content/clean
{
  "content": "3x2 + 5x3",
  "useAI": true
}

// Response:
{
  "original": "3x2 + 5x3",
  "cleaned": "3x² + 5x³",
  "wasMangled": true,
  "method": "ai"
}
```

#### Fallback Cleaning (Rule-Based)

When Ollama is unavailable, the system uses rule-based cleaning:

- Fixes superscripts: `3x2` → `3x²`
- Fixes subscripts: `H2O` → `H₂O`
- Fixes fractions: `1/2` → `½`
- Cleans spacing and formatting

**The app works perfectly without Ollama!**

### 4. Training & Progress Tracking

#### Progress Structure

```typescript
{
  "objectiveId": {
    "mastery": 85,        // 0-100
    "stability": 70,     // 0-100
    "attempts": 5,
    "correctCount": 4,
    "incorrectCount": 1,
    "lastAttempt": "2026-01-21T...",
    "timeSpent": 300     // seconds
  }
}
```

#### Training Update API

```typescript
// POST /api/training/update
{
  "objectiveId": "OBJ-00001",
  "correct": true,
  "timeSpent": 60,
  "attempts": 1
}
```

Returns recommendations:
- `shouldReview`: Mastery < 70%
- `shouldAdvance`: Mastery ≥ 85% and Stability ≥ 70%
- `nextDifficulty`: Increase or maintain

## API Endpoints

### 1. Get Syllabus Data
```
GET /api/syllabus?subject=Mathematics&difficulty=1
```

### 2. Generate Learning Path
```
GET /api/learning-path?subjects=Mathematics,Business
POST /api/learning-path
{
  "subjects": ["Mathematics"],
  "userProgress": {...}
}
```

### 3. Clean Content
```
POST /api/content/clean
{
  "content": "3x2",
  "useAI": false
}
```

### 4. Batch Clean Syllabus
```
POST /api/syllabus/clean
{
  "useAI": true,
  "limit": 100
}
```

### 5. Update Training Progress
```
POST /api/training/update
{
  "objectiveId": "OBJ-00001",
  "correct": true,
  "timeSpent": 60,
  "attempts": 1
}
```

## Usage Examples

### Frontend: Fetch Learning Path

```typescript
// Get user's subjects
const onboarding = JSON.parse(localStorage.getItem('brighted_onboarding') || '{}')
const subjects = onboarding.subjects || []

// Fetch personalized path
const res = await fetch(`/api/learning-path?subjects=${subjects.join(',')}`)
const { path } = await res.json()
```

### Frontend: Clean Content

```typescript
import { cleanContentViaAPI } from '@/lib/content-cleaner'

const result = await cleanContentViaAPI("3x2 + 5x3", false) // false = use fallback
console.log(result.cleaned) // "3x² + 5x³"
```

### Frontend: Update Progress

```typescript
// After completing a simulation
await fetch('/api/training/update', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    objectiveId: 'OBJ-00001',
    correct: true,
    timeSpent: 120,
    attempts: 1
  })
})
```

## Setup Ollama (Optional)

1. Install Ollama: https://ollama.ai
2. Pull Llama 3 model:
   ```bash
   ollama pull llama3
   ```
3. Start Ollama (usually runs on localhost:11434)

The app will automatically detect if Ollama is available and use it for content cleaning. If not available, it falls back to rule-based cleaning.

## Data Flow

1. **Onboarding** → User selects subjects
2. **Learning Path Generation** → Algorithm creates personalized path
3. **Content Display** → Content is cleaned (AI or fallback)
4. **Training** → User completes simulations
5. **Progress Update** → Mastery and stability calculated
6. **Path Adaptation** → Path updates based on progress

## Performance Considerations

- Learning paths are limited to 50 objectives for performance
- Content cleaning is done on-demand (not pre-processed)
- User progress is stored in localStorage (move to database in production)
- Batch cleaning can process up to 100 items at a time

## Future Enhancements

- [ ] Database integration for progress tracking
- [ ] Pre-processed cleaned content cache
- [ ] Spaced repetition algorithm
- [ ] Multi-user progress tracking
- [ ] Advanced prerequisite system
- [ ] Real-time path updates
