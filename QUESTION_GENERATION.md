# Dynamic Question Generation System

## Overview

The BrightEd system now generates **NEW questions dynamically** from syllabus data instead of showing the same static questions. Each time a user accesses a simulation, they get a fresh, personalized question based on the learning objective.

## How It Works

### 1. Question Generation API

**Endpoint:** `GET /api/questions/generate?objectiveId=OBJ-00001&variation=0&useAI=false`

The API:
- Loads the objective from syllabus JSON files
- Generates a question based on the objective's content, keywords, and difficulty
- Creates multiple choice options with correct answer
- Generates explanation and story elements
- Returns a complete simulation flow

### 2. Variation System

Each question can have multiple variations:
- **Variation 0**: Base question
- **Variation 1**: Different numbers/scenarios
- **Variation 2**: Alternative approach
- And so on...

The variation parameter ensures users get **different questions** even for the same objective.

### 3. Subject-Specific Generation

The system generates questions tailored to the subject:

#### Mathematics
- Algebraic equations with varying coefficients
- Geometry problems with different dimensions
- Percentage calculations with different values

#### Principles of Business
- Pricing scenarios with different cost structures
- Location selection problems
- Break-even analysis with varying numbers

#### Economics
- Supply and demand scenarios
- Opportunity cost problems
- Market dynamics questions

### 4. AI-Powered Generation (Optional)

When `useAI=true` and Ollama is available:
- Llama 3 generates creative, real-world scenario questions
- Questions are more engaging and contextual
- Falls back to rule-based generation if AI unavailable

### 5. Rule-Based Fallback

Works **perfectly without AI**:
- Uses objective keywords and content
- Generates questions based on subject type
- Creates realistic scenarios
- Varies numbers and values based on variation parameter

## Usage

### Frontend: Load Question

```typescript
// Get objective ID from URL or learning path
const objectiveId = 'OBJ-00001'
const variation = 0 // Change this for different questions

// Fetch generated question
const res = await fetch(`/api/questions/generate?objectiveId=${objectiveId}&variation=${variation}`)
const data = await res.json()

// Use the simulation steps
const steps = data.simulationSteps
```

### Generate New Question

Users can click "Generate New Question" button to get a different variation of the same objective.

## Question Structure

```typescript
{
  question: "The actual question text",
  options: ["Option 1", "Option 2", "Option 3", "Option 4"],
  correctAnswer: 1, // Index of correct option
  explanation: "Why this answer is correct",
  storyElement: "🎨 Encouraging message"
}
```

## Example Variations

### Same Objective, Different Questions

**Variation 0:**
- "You run a business. Costs are $10/item. Customers pay up to $25. What price?"

**Variation 1:**
- "You run a business. Costs are $15/item. Customers pay up to $30. What price?"

**Variation 2:**
- "A business needs to choose a location. Which factor is MOST important?"

Each variation tests the same concept but with different scenarios!

## Benefits

✅ **No Repetition**: Users never see the exact same question twice
✅ **Adaptive Learning**: Questions match user's current objective
✅ **Real Syllabus Data**: Questions come directly from CXC syllabus
✅ **Works Offline**: Rule-based generation doesn't need AI
✅ **Scalable**: Can generate unlimited variations

## Technical Details

### Question Generation Algorithm

1. **Load Objective** from syllabus JSON
2. **Identify Subject** (Math, Business, Economics, etc.)
3. **Extract Keywords** and concepts
4. **Generate Question** based on:
   - Subject type
   - Difficulty level
   - Variation number
   - Keywords available
5. **Create Options** with one correct answer
6. **Generate Explanation** explaining the correct answer
7. **Add Story Element** for engagement

### Variation Calculation

```typescript
// Variation ensures different questions
const variation = (objectiveId % 10) + userAttempts
// Or use timestamp for randomness
const variation = Math.floor(Date.now() / 1000) % 10
```

## Future Enhancements

- [ ] Spaced repetition (show harder variations as mastery increases)
- [ ] Difficulty scaling (adjust based on user performance)
- [ ] Multi-step problems
- [ ] Interactive simulations (not just multiple choice)
- [ ] Question bank caching for performance
