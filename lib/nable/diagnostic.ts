/**
 * NABLE Binary Search Diagnostic
 * 
 * Cold Start System for new users.
 * Uses binary search to quickly determine initial mastery level:
 * - Start at Level 5
 * - Correct → Jump to Level 8
 * - Wrong at Level 8 → Try Level 6
 * - Continue binary search until confidence threshold met
 */

import {
    DiagnosticQuestion,
    DiagnosticState,
    DiagnosticResult,
    SubSkillScore,
} from './types';
import { createInitialSubSkillScore } from './mastery-tracker';

/**
 * Initialize diagnostic state for a new sub-skill assessment
 */
export function initializeDiagnostic(startLevel: number = 5): DiagnosticState {
    return {
        currentLevel: startLevel,
        minLevel: 1,
        maxLevel: 10,
        questionsAnswered: 0,
        correctCount: 0,
        history: []
    };
}

/**
 * Calculate next level using binary search logic
 */
export function calculateNextLevel(
    state: DiagnosticState,
    wasCorrect: boolean
): number {
    const { currentLevel, minLevel, maxLevel, history } = state;

    // First question logic
    if (history.length === 0) {
        if (wasCorrect) {
            // Jump higher for initial correct answer
            return Math.min(maxLevel, currentLevel + 3); // Level 5 → 8
        } else {
            // Drop for initial wrong answer
            return Math.max(minLevel, currentLevel - 2); // Level 5 → 3
        }
    }

    // Binary search logic
    if (wasCorrect) {
        // Narrow search to upper half
        const newMin = currentLevel;
        const newMax = maxLevel;
        return Math.round((newMin + newMax) / 2);
    } else {
        // Narrow search to lower half
        const newMin = minLevel;
        const newMax = currentLevel;
        return Math.round((newMin + newMax) / 2);
    }
}

/**
 * Update diagnostic state after an answer
 */
export function updateDiagnosticState(
    state: DiagnosticState,
    wasCorrect: boolean,
    timeToAnswer: number
): DiagnosticState {
    const nextLevel = calculateNextLevel(state, wasCorrect);

    return {
        currentLevel: nextLevel,
        minLevel: wasCorrect ? state.currentLevel : state.minLevel,
        maxLevel: wasCorrect ? state.maxLevel : state.currentLevel,
        questionsAnswered: state.questionsAnswered + 1,
        correctCount: state.correctCount + (wasCorrect ? 1 : 0),
        history: [
            ...state.history,
            {
                level: state.currentLevel,
                correct: wasCorrect,
                timeToAnswer
            }
        ]
    };
}

/**
 * Check if diagnostic has enough data to conclude
 */
export function isDiagnosticComplete(state: DiagnosticState): boolean {
    // Minimum 3 questions
    if (state.questionsAnswered < 3) {
        return false;
    }

    // Maximum 6 questions (prevent endless testing)
    if (state.questionsAnswered >= 6) {
        return true;
    }

    // Check if we've narrowed down enough (range < 2)
    const range = state.maxLevel - state.minLevel;
    if (range < 2) {
        return true;
    }

    // Check for consistent pattern (3 questions at similar level)
    const recentLevels = state.history.slice(-3).map(h => h.level);
    if (recentLevels.length >= 3) {
        const levelRange = Math.max(...recentLevels) - Math.min(...recentLevels);
        if (levelRange <= 1) {
            return true;
        }
    }

    return false;
}

/**
 * Calculate final mastery from diagnostic results
 */
export function calculateDiagnosticResult(
    subSkillId: string,
    state: DiagnosticState
): DiagnosticResult {
    const { history, correctCount, questionsAnswered } = state;

    if (history.length === 0) {
        return {
            subSkillId,
            initialMastery: 0.5,
            confidence: 0.3 // Low confidence, no data
        };
    }

    // Calculate weighted mastery based on highest level passed
    let highestPassed = 0;
    let lowestFailed = 11;

    for (const entry of history) {
        if (entry.correct) {
            highestPassed = Math.max(highestPassed, entry.level);
        } else {
            lowestFailed = Math.min(lowestFailed, entry.level);
        }
    }

    // Mastery is normalized highest passed level
    let mastery: number;
    if (highestPassed > 0) {
        // Use midpoint between highest passed and lowest failed
        if (lowestFailed < 11) {
            mastery = (highestPassed + lowestFailed - 1) / 20; // Normalize to 0-1
        } else {
            mastery = highestPassed / 10;
        }
    } else {
        mastery = (lowestFailed - 1) / 20; // Very low if never passed
    }

    // Confidence based on consistency and question count
    const correctRate = correctCount / questionsAnswered;
    const consistencyBonus = questionsAnswered >= 4 ? 0.1 : 0;
    const rangeBonus = (state.maxLevel - state.minLevel < 3) ? 0.1 : 0;

    let confidence = 0.3 + (correctRate * 0.2) + consistencyBonus + rangeBonus;
    confidence = Math.min(0.8, Math.max(0.3, confidence)); // Cap initial confidence

    return {
        subSkillId,
        initialMastery: Math.max(0.1, Math.min(0.9, mastery)),
        confidence
    };
}

/**
 * Create initial sub-skill score from diagnostic result
 */
export function diagnosticResultToSubSkillScore(
    result: DiagnosticResult
): SubSkillScore {
    return createInitialSubSkillScore(result.initialMastery, result.confidence);
}

interface DiagnosticYield {
    question: DiagnosticQuestion;
    state: DiagnosticState;
}

interface DiagnosticInput {
    correct: boolean;
    timeToAnswer: number;
}

/**
 * Run full diagnostic for a sub-skill
 * Returns a generator that yields questions and accepts answers
 */
export function* runDiagnostic(
    subSkillId: string,
    getQuestionForLevel: (level: number) => DiagnosticQuestion | null
): Generator<DiagnosticYield, DiagnosticResult, DiagnosticInput> {
    let state = initializeDiagnostic(5);

    while (!isDiagnosticComplete(state)) {
        const question = getQuestionForLevel(state.currentLevel);

        if (!question) {
            // No question available at this level, skip
            state = {
                ...state,
                currentLevel: state.currentLevel > 5 ? state.currentLevel - 1 : state.currentLevel + 1
            };
            continue;
        }

        // Yield question and wait for answer
        const answer = yield { question, state };

        // Update state with answer
        state = updateDiagnosticState(state, answer.correct, answer.timeToAnswer);
    }

    return calculateDiagnosticResult(subSkillId, state);
}

/**
 * Sample diagnostic questions pool for testing
 * In production, these would come from the database
 */
export const SAMPLE_DIAGNOSTIC_QUESTIONS: Record<number, DiagnosticQuestion[]> = {
    2: [{
        id: 'diag-2-1',
        question: 'What is 50% of 100?',
        difficulty: 2,
        tags: ['basic-math', 'percentages'],
        options: ['25', '50', '75', '100'],
        correctAnswer: 1
    }],
    3: [{
        id: 'diag-3-1',
        question: 'If you buy something for $10 and sell it for $15, what is your profit?',
        difficulty: 3,
        tags: ['profit-calculation'],
        options: ['$5', '$10', '$15', '$25'],
        correctAnswer: 0
    }],
    5: [{
        id: 'diag-5-1',
        question: 'A business has $1000 in revenue and $700 in costs. What is the profit margin?',
        difficulty: 5,
        tags: ['profit-margin', 'percentages'],
        options: ['70%', '30%', '43%', '142%'],
        correctAnswer: 1
    }],
    6: [{
        id: 'diag-6-1',
        question: 'Which of these is NOT a fixed cost for a restaurant?',
        difficulty: 6,
        tags: ['fixed-costs', 'variable-costs'],
        options: ['Monthly rent', 'Insurance', 'Food ingredients', 'Equipment lease'],
        correctAnswer: 2
    }],
    8: [{
        id: 'diag-8-1',
        question: 'A company has $50,000 in assets and $30,000 in liabilities. What is the debt-to-equity ratio?',
        difficulty: 8,
        tags: ['financial-ratios', 'balance-sheet'],
        options: ['0.6', '1.5', '0.67', '1.67'],
        correctAnswer: 1
    }],
    10: [{
        id: 'diag-10-1',
        question: 'Calculate the NPV of an investment of $10,000 that returns $3,000 annually for 5 years at a 10% discount rate.',
        difficulty: 10,
        tags: ['npv', 'time-value-money'],
        options: ['$1,372', '$5,000', '$11,372', '-$1,372'],
        correctAnswer: 0
    }]
};

/**
 * Get a diagnostic question for a specific level
 */
export function getDiagnosticQuestion(level: number): DiagnosticQuestion | null {
    // Find closest available level
    const availableLevels = Object.keys(SAMPLE_DIAGNOSTIC_QUESTIONS).map(Number);

    // Find closest level
    let closestLevel = availableLevels[0] ?? 5;
    let closestDiff = Math.abs(level - closestLevel);

    for (const availableLevel of availableLevels) {
        const diff = Math.abs(level - availableLevel);
        if (diff < closestDiff) {
            closestDiff = diff;
            closestLevel = availableLevel;
        }
    }

    const questions = SAMPLE_DIAGNOSTIC_QUESTIONS[closestLevel];
    if (!questions || questions.length === 0) {
        return null;
    }

    // Return random question from pool
    const q = questions[Math.floor(Math.random() * questions.length)];
    return q ?? null;
}
