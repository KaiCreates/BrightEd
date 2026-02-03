# Enhanced Learning Path Strategy for BrightEd
## Integrating Duolingo-Style Gamification with CSEC Rigor

> **Status**: Implementation Roadmap  
> **Date**: January 30, 2026  
> **Based on**: Existing NABLE Engine + Learning Algorithm + Current UI

---

## Executive Summary

BrightEd already has a sophisticated adaptive learning system (NABLE Engine) and a gamified learning path. This document enhances the existing system by adding:

1. **Scaffolded Question Difficulty** (4 cognitive levels)
2. **Paper 2 Digital Simulations** (structured, interactive assessments)
3. **Active Feedback System** (Professor Bright persona)
4. **Spaced Repetition Integration** (already partially implemented)
5. **Enhanced Gamification** (topic mastery meters, final boss challenges)

---

## 1. Scaffolding System: The Level-Up Method

### Current State
- ✅ NABLE Engine tracks mastery (0.0-1.0 scale)
- ✅ Difficulty scaling based on performance
- ✅ Error classification (conceptual vs careless)
- ⚠️ Questions don't explicitly show cognitive level

### Enhancement: 4-Level Cognitive Ladder


#### Level 1: Concept Recognition (Mastery 0.0-0.3)
**Goal**: Build confidence with low-stakes recognition

**Question Types**:
- True/False statements
- Simple matching (term → definition)
- "Which of these is an example of X?"

**UI Treatment**:
```typescript
// Add to question metadata
interface QuestionMetadata {
  cognitiveLevel: 1 | 2 | 3 | 4
  hintsAvailable: boolean
  timeLimit?: number
}
```

**Example (CSEC IT)**:
```
Q: Is a mouse an input or output device?
A) Input ✓
B) Output
C) Both
D) Neither

[Hint Available] [No Time Pressure]
```

---

#### Level 2: Guided Practice (Mastery 0.3-0.6)
**Goal**: Apply concepts with scaffolding

**Question Types**:
- Multiple choice with hints
- Fill-in-the-blank with word bank
- Step-by-step guided problems

**UI Treatment**:
- Show "💡 Hint" button (costs no penalty at this level)
- Immediate explanation on wrong answers
- "Professor Bright" encouragement

**Example (CSEC Math)**:
```
Q: Calculate the area of a rectangle with length 5cm and width 3cm.

[💡 Hint: Area = Length × Width]

A) 8 cm²
B) 15 cm² ✓
C) 16 cm²
D) 30 cm²
```


---

#### Level 3: Exam Style (Mastery 0.6-0.85) - Paper 1 Simulation
**Goal**: Replicate actual exam conditions

**Question Types**:
- Standard MCQs (no hints)
- Timed questions (90 seconds per question)
- Distractor similarity increases

**UI Treatment**:
```typescript
// Already implemented in NABLE!
const scaling = calculateDifficultyScaling(
  primaryScore,
  questionDifficulty,
  correct,
  errorClassification,
  state.lastDistractorSimilarity,
  'standard'
)
```

**Example (CSEC Business)**:
```
⏱️ 90 seconds

Q: A business has revenue of $10,000 and total costs of $7,500. 
   What is the profit margin?

A) 25% ✓
B) 33%
C) 75%
D) 133%

[No Hints] [Timed]
```

---

#### Level 4: Mastery (Mastery 0.85-1.0) - Paper 2 Simulation
**Goal**: Demonstrate deep understanding through application

**Question Types**:
- Drag-and-drop sequencing
- Scenario-based multi-step problems
- Interactive diagram labeling
- Formula construction

**Already Implemented**:
- ✅ `DragDropQuestion.tsx`
- ✅ `FormulaBuilder.tsx`
- ✅ `MathDiagram.tsx`

**Enhancement Needed**: More Paper 2 question types


---

## 2. Paper 2 Digital Simulations

### Challenge
CSEC Paper 2 requires written responses, essays, and structured answers - hard to grade automatically.

### Solution: Digitize Structured Questions

#### A. Ordering Steps (Already Supported!)
```typescript
// Use existing DragDropQuestion component
<DragDropQuestion
  question="Arrange the steps to create a database table in Access:"
  items={[
    "Open Microsoft Access",
    "Click 'Create Table in Design View'",
    "Define field names and data types",
    "Set primary key",
    "Save the table",
    "Enter data in Datasheet View"
  ]}
  correctOrder={[0, 1, 2, 3, 4, 5]}
  onComplete={(isCorrect) => handleAnswer(isCorrect)}
/>
```

#### B. Scenario-Based Questions (Enhance Current System)
```typescript
// Add to question generation
interface ScenarioQuestion {
  scenario: string // Rich context paragraph
  subQuestions: Array<{
    question: string
    type: 'mcq' | 'drag-drop' | 'formula'
    options?: string[]
    correctAnswer: number | number[]
  }>
}
```

**Example (CSEC Business)**:
```
📋 SCENARIO:
"Sweet Treats Bakery in Barbados sells cakes for $50 each. 
Fixed costs are $2,000/month. Variable costs are $20 per cake."

Q1: How many cakes must be sold to break even?
[Formula Builder: Break-even = Fixed Costs ÷ (Price - Variable Cost)]

Q2: If they sell 100 cakes, what is the profit?
A) $1,000 ✓
B) $3,000
C) $5,000
D) Break-even

Q3: Drag to order the steps to increase profit:
[Drag-Drop: Reduce costs → Increase price → Market more → Analyze results]
```


#### C. Interactive Diagram Labeling (New Component Needed)
```typescript
// New component: DiagramLabeling.tsx
interface DiagramLabelingProps {
  imageUrl: string
  labelPoints: Array<{
    x: number // percentage
    y: number // percentage
    correctLabel: string
  }>
  availableLabels: string[]
  onComplete: (isCorrect: boolean) => void
}
```

**Example (CSEC IT)**:
```
Label the parts of the CPU:
[Interactive diagram with drag-and-drop labels]
- Control Unit
- ALU
- Registers
- Cache
```

---

## 3. Active Feedback System

### Current State
- ✅ NABLE provides error classification
- ✅ Micro-lessons for conceptual errors
- ✅ UI mood recommendations
- ⚠️ Feedback is technical, not personalized

### Enhancement: "Professor Bright" Persona

#### Implementation
```typescript
// lib/professor-bright.ts
export const getProfessorBrightFeedback = (
  correct: boolean,
  errorType: 'conceptual' | 'careless' | null,
  streak: number,
  mastery: number
): string => {
  if (correct) {
    if (streak >= 5) return "🦉 Hoo-ray! You're on fire! 5 in a row!"
    if (mastery > 0.8) return "🎓 Excellent! You're mastering this concept!"
    return "✨ Great job! You're getting the hang of this!"
  }
  
  if (errorType === 'conceptual') {
    return "🤔 Let's break this down together. Here's what you need to know..."
  }
  
  if (errorType === 'careless') {
    return "⚠️ Close one! Double-check your work - you know this!"
  }
  
  return "📚 No worries! Every mistake is a learning opportunity."
}
```


#### The "Why" Factor (Already Partially Implemented)
Enhance the existing feedback cards:

```typescript
// In simulate/page.tsx - enhance DecisionCard feedback
{showFeedback && isSelected && (
  <motion.div className="p-4 rounded-xl border-l-4">
    {/* Current: Generic feedback */}
    {/* Enhanced: Specific reasoning */}
    <p className="text-sm mb-2">
      {getProfessorBrightFeedback(isCorrect, nableResponse?.errorClassification, nableResponse?.currentStreak || 0, 0.5)}
    </p>
    
    {!isCorrect && (
      <div className="mt-3 p-3 bg-[var(--bg-secondary)] rounded-lg">
        <p className="text-xs font-bold mb-1">💡 Why this matters:</p>
        <p className="text-xs text-[var(--text-secondary)]">
          {/* Pull from objective content or AI-generated explanation */}
          Understanding this concept is crucial for Paper 2 questions on [topic].
        </p>
      </div>
    )}
  </motion.div>
)}
```

---

## 4. Spaced Repetition (Already Implemented!)

### Current Implementation ✅
```typescript
// lib/nable/spaced-repetition.ts
- calculateMemoryDecay() ✅
- checkSessionRefresh() ✅
- buildReviewSession() ✅
```

### Enhancement: "Boomerang Effect" UI

#### Add to Learning Path
```typescript
// In learn/page.tsx - enhance node types
nodeType: 'maintenance' // Already exists!

// Add visual indicator for "needs review"
{nodeType === 'maintenance' && (
  <div className="absolute -top-3 -right-3 bg-amber-500 text-white text-xs font-black px-2 py-1 rounded-full animate-pulse">
    🔧 REVIEW
  </div>
)}
```

#### Session Start Refresh Questions
```typescript
// Already implemented in NABLE engine!
const refreshResult = checkSessionRefresh(state.knowledgeGraph, 1)

if (refreshResult.hasRefreshQuestions) {
  // Show "Quick Refresh" modal before new content
  return {
    question: refreshResult.refreshQueue[0],
    refreshFirst: true
  }
}
```


---

## 5. Gamified Progress Markers

### Current State
- ✅ Star system (3 stars per objective)
- ✅ XP tracking
- ✅ Streak counter
- ✅ Boss nodes every 5 objectives
- ⚠️ No topic-level mastery visualization

### Enhancement A: Topic Mastery Meters

#### Implementation
```typescript
// Add to profile/page.tsx or new /progress page
interface TopicMastery {
  topicId: string
  topicName: string
  mastery: number // 0-1
  subSkills: Array<{
    skillId: string
    skillName: string
    mastery: number
  }>
}

// Visual Component
<div className="space-y-4">
  {topics.map(topic => (
    <div key={topic.topicId} className="p-4 bg-[var(--bg-secondary)] rounded-xl">
      <div className="flex justify-between mb-2">
        <h3 className="font-bold">{topic.topicName}</h3>
        <span className="text-sm font-black text-[var(--brand-primary)]">
          {Math.round(topic.mastery * 100)}% Mastered
        </span>
      </div>
      
      {/* Strength Bar */}
      <div className="h-3 bg-[var(--bg-primary)] rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${topic.mastery * 100}%` }}
          className="h-full bg-gradient-to-r from-[var(--brand-primary)] to-[var(--brand-accent)]"
        />
      </div>
      
      {/* Sub-skills breakdown */}
      <div className="mt-3 grid grid-cols-2 gap-2">
        {topic.subSkills.map(skill => (
          <div key={skill.skillId} className="text-xs">
            <span className="text-[var(--text-muted)]">{skill.skillName}</span>
            <div className="h-1 bg-[var(--bg-primary)] rounded-full mt-1">
              <div 
                className="h-full bg-[var(--brand-accent)] rounded-full"
                style={{ width: `${skill.mastery * 100}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  ))}
</div>
```


### Enhancement B: Streaks & XP (Enhance Current System)

#### Current Implementation
```typescript
// Already tracking in NABLE
currentStreak: number
```

#### Enhancement: Streak Rewards
```typescript
// lib/streak-rewards.ts
export const getStreakReward = (streak: number) => {
  if (streak === 5) return { xp: 50, badge: "🔥 Hot Streak!" }
  if (streak === 10) return { xp: 100, badge: "⚡ Lightning Round!" }
  if (streak === 20) return { xp: 250, badge: "🌟 Unstoppable!" }
  return null
}

// In simulate/page.tsx
{nableResponse?.currentStreak && nableResponse.currentStreak % 5 === 0 && (
  <motion.div
    initial={{ scale: 0, rotate: -180 }}
    animate={{ scale: 1, rotate: 0 }}
    className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50"
  >
    <div className="bg-[var(--brand-accent)] text-white p-8 rounded-2xl shadow-2xl text-center">
      <div className="text-6xl mb-4">🔥</div>
      <h2 className="text-2xl font-black mb-2">
        {nableResponse.currentStreak} Question Streak!
      </h2>
      <p className="text-lg">+{getStreakReward(nableResponse.currentStreak)?.xp} XP Bonus</p>
    </div>
  </motion.div>
)}
```

### Enhancement C: "Final Boss" Challenges (Already Implemented!)

#### Current Implementation ✅
```typescript
// In learn/page.tsx
if ((index + 1) % 5 === 0) {
  nodeType = 'boss'
}
```

#### Enhancement: Boss Challenge Requirements
```typescript
// Require passing score to unlock next module
interface BossChallenge {
  objectiveId: string
  requiredScore: number // e.g., 80%
  timeLimit: number // seconds
  questionCount: number // e.g., 10 questions
  rewardXP: number
  rewardBadge: string
}

// In simulate/page.tsx - detect boss nodes
const isBossChallenge = objectiveInfo?.isBoss || false

{isBossChallenge && (
  <div className="mb-6 p-4 bg-gradient-to-r from-amber-900/40 to-yellow-900/40 rounded-xl border-2 border-amber-500">
    <div className="flex items-center gap-3">
      <span className="text-4xl">🏆</span>
      <div>
        <p className="text-xs font-black text-amber-400 uppercase">Boss Challenge</p>
        <p className="text-sm text-amber-200">
          Complete this to unlock the next module!
        </p>
      </div>
    </div>
  </div>
)}
```


---

## 6. Implementation Roadmap

### Phase 1: Quick Wins (1-2 weeks)
**Goal**: Enhance existing features with minimal new code

1. **Add Cognitive Level Metadata**
   - [ ] Add `cognitiveLevel` field to question schema
   - [ ] Update question generation to assign levels based on mastery
   - [ ] Display level indicator in UI

2. **Enhance Professor Bright Feedback**
   - [ ] Create `lib/professor-bright.ts`
   - [ ] Integrate with existing feedback system
   - [ ] Add "Why this matters" explanations

3. **Streak Rewards**
   - [ ] Create `lib/streak-rewards.ts`
   - [ ] Add celebration animations for milestones
   - [ ] Track streak history

4. **Topic Mastery Dashboard**
   - [ ] Create `/progress` page
   - [ ] Aggregate NABLE knowledge graph by topic
   - [ ] Visualize with strength bars

### Phase 2: Paper 2 Simulations (2-3 weeks)
**Goal**: Add structured question types

1. **Scenario-Based Questions**
   - [ ] Create `ScenarioQuestion` type
   - [ ] Update question generator to support scenarios
   - [ ] Add multi-part question UI

2. **Diagram Labeling Component**
   - [ ] Create `DiagramLabeling.tsx`
   - [ ] Add to question type options
   - [ ] Generate sample questions

3. **Enhanced Drag-Drop**
   - [ ] Add partial credit for drag-drop
   - [ ] Show step-by-step feedback
   - [ ] Add "explain your reasoning" prompts

### Phase 3: Advanced Features (3-4 weeks)
**Goal**: Polish and optimize

1. **Adaptive Hints System**
   - [ ] Generate contextual hints based on error type
   - [ ] Progressive hint disclosure (3 levels)
   - [ ] Track hint usage in mastery calculation

2. **Boss Challenge System**
   - [ ] Create boss challenge metadata
   - [ ] Implement gating logic
   - [ ] Add special rewards

3. **Spaced Repetition UI**
   - [ ] Add "Daily Review" section to home
   - [ ] Show decay warnings on learning path
   - [ ] Implement "Quick Refresh" modal


---

## 7. Technical Integration Points

### A. Question Generation Enhancement
```typescript
// app/api/questions/generate/route.ts
// Add cognitive level assignment

const assignCognitiveLevel = (mastery: number): 1 | 2 | 3 | 4 => {
  if (mastery < 0.3) return 1 // Recognition
  if (mastery < 0.6) return 2 // Guided Practice
  if (mastery < 0.85) return 3 // Exam Style
  return 4 // Mastery
}

// In question generation
const cognitiveLevel = assignCognitiveLevel(userMastery)
const questionType = selectQuestionType(cognitiveLevel)
```

### B. NABLE Engine Integration
```typescript
// lib/nable/engine.ts
// Already supports most features!

// Add cognitive level tracking
export interface NABLEState {
  // ... existing fields
  cognitiveProgress: Record<string, {
    level1Complete: boolean
    level2Complete: boolean
    level3Complete: boolean
    level4Complete: boolean
  }>
}

// Progression gating
export const canAdvanceToLevel = (
  state: NABLEState,
  objectiveId: string,
  targetLevel: number
): boolean => {
  const progress = state.cognitiveProgress[objectiveId]
  if (!progress) return targetLevel === 1
  
  if (targetLevel === 2) return progress.level1Complete
  if (targetLevel === 3) return progress.level2Complete
  if (targetLevel === 4) return progress.level3Complete
  
  return true
}
```

### C. UI Component Updates
```typescript
// components/learning/LearningPathNode.tsx
// Add cognitive level indicator

{!isLocked && (
  <div className="absolute -bottom-10 flex gap-1">
    {[1, 2, 3, 4].map(level => (
      <div
        key={level}
        className={`w-2 h-2 rounded-full ${
          completedLevels.includes(level)
            ? 'bg-[var(--brand-accent)]'
            : 'bg-[var(--border-subtle)]'
        }`}
      />
    ))}
  </div>
)}
```


---

## 8. Data Schema Updates

### Firestore Schema Changes

```typescript
// users/{uid}/progress/{objectiveId}
{
  mastery: number // 0-1 (existing)
  stars: number // 0-3 (existing)
  attempts: number // (existing)
  
  // NEW FIELDS
  cognitiveProgress: {
    level1: { completed: boolean, attempts: number, bestScore: number }
    level2: { completed: boolean, attempts: number, bestScore: number }
    level3: { completed: boolean, attempts: number, bestScore: number }
    level4: { completed: boolean, attempts: number, bestScore: number }
  }
  
  streakHistory: Array<{
    date: string
    streak: number
    rewardEarned: string | null
  }>
  
  lastReviewDate: string // For spaced repetition
  reviewCount: number
}

// users/{uid}/nable/state (existing, enhance)
{
  knowledgeGraph: { ... } // existing
  
  // NEW FIELDS
  topicMastery: Record<string, {
    topicName: string
    overallMastery: number
    subSkills: Record<string, number>
  }>
  
  streakStats: {
    current: number
    longest: number
    totalRewards: number
  }
}
```

---

## 9. Success Metrics

### Track These KPIs

1. **Engagement**
   - Average session length
   - Questions answered per session
   - Return rate (daily active users)

2. **Learning Effectiveness**
   - Average mastery gain per session
   - Time to complete objectives
   - Retention rate (spaced repetition success)

3. **Gamification Impact**
   - Streak completion rate
   - Boss challenge pass rate
   - Badge collection rate

4. **Paper 2 Readiness**
   - Level 4 (Mastery) completion rate
   - Scenario question performance
   - Structured question accuracy


---

## 10. Example User Journey

### Meet Sarah: CSEC Business Student

#### Week 1: Building Foundation
1. **Onboarding** → Diagnostic test places her at Level 1 for "Revenue & Profit"
2. **Level 1 Questions** → True/False, simple recognition (builds confidence)
3. **Professor Bright** → "Great start! You're getting the basics down 🦉"
4. **Mastery 0.3** → Unlocks Level 2

#### Week 2: Guided Practice
1. **Level 2 Questions** → MCQs with hints, step-by-step problems
2. **Mistake** → Confuses revenue with profit
3. **Micro-Lesson** → "Revenue is the top line, profit is what's left after costs"
4. **Spaced Repetition** → Same concept returns 24 hours later
5. **Mastery 0.6** → Unlocks Level 3

#### Week 3: Exam Prep
1. **Level 3 Questions** → Timed MCQs, no hints (Paper 1 style)
2. **Streak** → 5 correct in a row → "🔥 Hot Streak! +50 XP"
3. **Boss Challenge** → 10-question module test (80% required)
4. **Success** → Unlocks next module, earns badge
5. **Mastery 0.85** → Unlocks Level 4

#### Week 4: Mastery
1. **Level 4 Questions** → Scenario-based, drag-and-drop, formula building
2. **Scenario** → "Sweet Treats Bakery needs to calculate break-even..."
3. **Multi-Part** → Formula builder → MCQ → Drag-drop sequence
4. **Completion** → 3 stars earned, objective mastered
5. **Maintenance** → Node turns gray after 3 days, prompts review

#### Exam Day
- Sarah has completed all 4 levels for each objective
- Spaced repetition kept concepts fresh
- Paper 2 simulations prepared her for structured questions
- Confidence: 95% (tracked by NABLE)

---

## 11. Competitive Analysis

### What BrightEd Does Better Than Duolingo

1. **Curriculum-Aligned** → Follows official CXC syllabus
2. **Adaptive Difficulty** → NABLE engine is more sophisticated
3. **Paper 2 Prep** → Structured questions, not just MCQs
4. **Caribbean Context** → Scenarios use local businesses, currency

### What to Learn From Duolingo

1. **Bite-Sized Lessons** → Keep sessions under 10 minutes
2. **Daily Goals** → "Complete 5 questions today"
3. **Social Features** → Leaderboards (already implemented!)
4. **Streak Freeze** → Allow 1 missed day without losing streak


---

## 12. Quick Start: Implement Today

### Minimal Viable Enhancement (2 hours)

#### 1. Add Professor Bright Feedback (30 min)
```bash
# Create the file
touch lib/professor-bright.ts
```

```typescript
// lib/professor-bright.ts
export const getProfessorBrightFeedback = (
  correct: boolean,
  errorType: 'conceptual' | 'careless' | null,
  streak: number
): { message: string; emoji: string } => {
  if (correct) {
    if (streak >= 5) return { message: "Hoo-ray! You're on fire!", emoji: "🔥" }
    if (streak >= 3) return { message: "Excellent work! Keep it up!", emoji: "⭐" }
    return { message: "Great job! You got it!", emoji: "✨" }
  }
  
  if (errorType === 'conceptual') {
    return { message: "Let's review this concept together", emoji: "📚" }
  }
  
  return { message: "Close! Try again with fresh eyes", emoji: "🤔" }
}
```

#### 2. Update Simulate Page (30 min)
```typescript
// In app/simulate/page.tsx
import { getProfessorBrightFeedback } from '@/lib/professor-bright'

// In feedback section
const feedback = getProfessorBrightFeedback(
  isCorrect,
  nableResponse?.errorClassification || null,
  nableResponse?.currentStreak || 0
)

<div className="flex items-center gap-2 mb-2">
  <span className="text-2xl">{feedback.emoji}</span>
  <p className="font-bold text-[var(--brand-primary)]">
    {feedback.message}
  </p>
</div>
```

#### 3. Add Streak Celebration (30 min)
```typescript
// In app/simulate/page.tsx
{nableResponse?.currentStreak && nableResponse.currentStreak % 5 === 0 && (
  <motion.div
    initial={{ scale: 0 }}
    animate={{ scale: 1 }}
    className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
    onClick={() => setShowStreakCelebration(false)}
  >
    <div className="bg-[var(--bg-elevated)] p-8 rounded-2xl text-center">
      <div className="text-6xl mb-4">🔥</div>
      <h2 className="text-2xl font-black mb-2">
        {nableResponse.currentStreak} in a row!
      </h2>
      <p className="text-[var(--text-secondary)]">+50 XP Bonus</p>
    </div>
  </motion.div>
)}
```

#### 4. Add Cognitive Level Indicator (30 min)
```typescript
// In app/simulate/page.tsx header
<div className="flex items-center gap-2 px-3 py-1 bg-[var(--bg-secondary)] rounded-full">
  <span className="text-xs font-bold text-[var(--text-muted)]">Level</span>
  <div className="flex gap-1">
    {[1, 2, 3, 4].map(level => (
      <div
        key={level}
        className={`w-2 h-2 rounded-full ${
          level <= currentCognitiveLevel
            ? 'bg-[var(--brand-primary)]'
            : 'bg-[var(--border-subtle)]'
        }`}
      />
    ))}
  </div>
</div>
```

---

## 13. Conclusion

BrightEd already has an excellent foundation with:
- ✅ Adaptive learning (NABLE Engine)
- ✅ Gamification (stars, XP, streaks)
- ✅ Spaced repetition
- ✅ Interactive question types

This enhancement strategy adds:
- 🎯 Explicit cognitive scaffolding (4 levels)
- 📝 Paper 2 digital simulations
- 🦉 Personalized feedback (Professor Bright)
- 📊 Topic mastery visualization
- 🏆 Enhanced gamification

**Result**: A learning path that rivals Duolingo's engagement while maintaining CSEC exam rigor.

---

## Next Steps

1. Review this document with the team
2. Prioritize features based on impact vs effort
3. Start with Phase 1 (Quick Wins)
4. Gather user feedback after each phase
5. Iterate based on success metrics

**Questions?** Check existing code in:
- `lib/nable/` - Adaptive learning engine
- `lib/learning-algorithm.ts` - Mastery calculations
- `app/learn/page.tsx` - Learning path UI
- `app/simulate/page.tsx` - Question interface
