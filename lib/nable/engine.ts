/**
 * NABLE Engine - Main Orchestrator
 * 
 * Neural-Adaptive Business Learning Engine
 * Maintains user in "Flow State" through dynamic adaptation.
 * 
 * Phases:
 * 1. Cold Start (Binary Search Diagnostic)
 * 2. Dynamic Adaptation (ELO Mastery + Behavioral Signals)
 * 3. Story Integration (Application Tests)
 * 4. Spaced Repetition (Forgetting Curve)
 */

import {
    NABLEResponse,
    NABLEEvaluateRequest,
    NABLERecommendRequest,
    KnowledgeGraph,
    SubSkillScore,
    ContentItem,
    MicroLesson,
    NABLE_CONSTANTS,
    UIMood,
    InteractionMetrics
} from './types';

import { classifyError, analyzeErrorPatterns, suggestRemediationTopic, classifyErrorEnhanced, EnhancedErrorResult } from './error-classifier';
import { updateSubSkillScore, createInitialSubSkillScore, updateMastery, calculateFluency } from './mastery-tracker';
import { calculateDifficultyScaling, rankQuestionsByFit, getRecommendedDifficulty } from './difficulty-scaler';
import { checkSessionRefresh, applyDecayToGraph, calculateMemoryDecay } from './spaced-repetition';
import { markSkillAsTheoreticalOnly } from './story-analyzer';
import { normalizeQuestion, NormalizedQuestion, padOptions } from './question-normalizer';

/**
 * NABLE Engine state
 */
export interface NABLEState {
    userId: string;
    knowledgeGraph: KnowledgeGraph;
    currentStreak: number;
    consecutiveErrors: number;
    sessionQuestions: string[];
    lastDifficulty: number;
    lastDistractorSimilarity: number;
    sessionStarted: string;
}

/**
 * Create initial NABLE state for new user
 */
export function createInitialState(userId: string): NABLEState {
    return {
        userId,
        knowledgeGraph: {},
        currentStreak: 0,
        consecutiveErrors: 0,
        sessionQuestions: [],
        lastDifficulty: 5,
        lastDistractorSimilarity: 0.5,
        sessionStarted: new Date().toISOString()
    };
}

/**
 * Load or create NABLE state for user
 */
export function loadState(
    userId: string,
    existingData?: Partial<NABLEState>
): NABLEState {
    const baseState = createInitialState(userId);

    if (!existingData) {
        return baseState;
    }

    // Apply decay to knowledge graph if it exists
    const knowledgeGraph = existingData.knowledgeGraph
        ? applyDecayToGraph(existingData.knowledgeGraph)
        : {};

    return {
        ...baseState,
        ...existingData,
        knowledgeGraph,
        sessionStarted: new Date().toISOString() // New session
    };
}

/**
 * Main evaluation function - process an answer
 */
export function evaluate(
    state: NABLEState,
    request: NABLEEvaluateRequest
): { response: NABLEResponse; newState: NABLEState } {
    const {
        questionId,
        objectiveId,
        selectedAnswer,
        correctAnswer,
        options,
        timeToAnswer,
        subSkills,
        questionDifficulty
    } = request;

    const correct = selectedAnswer === correctAnswer;

    // PRODUCTION FIX: Normalize options to handle edge cases
    // - Empty options
    // - "marks" text
    // - Letter-only options
    // - "All of the above" patterns
    const safeOptions = padOptions(options || [], 4);
    const normalizedQuestion = normalizeQuestion(safeOptions);

    // Log warnings for debugging in production
    if (normalizedQuestion.warnings.length > 0) {
        console.warn(`[NABLE] Question ${questionId} warnings:`, normalizedQuestion.warnings);
    }

    // Classify error with enhanced logic (handles "all of the above", etc.)
    let errorClassification = null;
    let enhancedErrorResult: EnhancedErrorResult | null = null;
    if (!correct) {
        enhancedErrorResult = classifyErrorEnhanced(selectedAnswer, correctAnswer, safeOptions);
        errorClassification = enhancedErrorResult.errorType;
    }

    // Build interaction metrics
    const metrics: InteractionMetrics = {
        timeToAnswer,
        streak: correct ? state.currentStreak + 1 : 0,
        errorType: errorClassification,
        responseSpeed: timeToAnswer < 3 ? 'fast' : timeToAnswer > 60 ? 'slow' : 'normal',
        questionDifficulty,
        selectedAnswer,
        correctAnswer
    };

    // Update mastery for each sub-skill
    const masteryDelta: Record<string, number> = {};
    const newKnowledgeGraph = { ...state.knowledgeGraph };

    for (const subSkillId of subSkills) {
        // Get or create sub-skill score
        const currentScore = newKnowledgeGraph[subSkillId] || createInitialSubSkillScore();

        // Update score
        const updatedScore = updateSubSkillScore(currentScore, metrics);

        // Calculate delta
        masteryDelta[subSkillId] = updatedScore.mastery - currentScore.mastery;

        // Store updated score
        newKnowledgeGraph[subSkillId] = updatedScore;
    }

    // Update state counters
    const newStreak = correct ? state.currentStreak + 1 : 0;
    const newConsecutiveErrors = correct ? 0 : state.consecutiveErrors + 1;

    // Calculate difficulty scaling
    const primarySubSkill = subSkills[0];
    const primaryScore = newKnowledgeGraph[primarySubSkill] || createInitialSubSkillScore();

    const scaling = calculateDifficultyScaling(
        primaryScore,
        questionDifficulty,
        correct,
        errorClassification,
        state.lastDistractorSimilarity,
        'standard'
    );

    // Check for micro-lesson requirement
    const microLessonRequired = errorClassification === 'conceptual';
    let microLesson: MicroLesson | null = null;

    if (microLessonRequired) {
        const remediationTopic = suggestRemediationTopic(
            primarySubSkill,
            primaryScore.errorHistory
        );

        if (remediationTopic) {
            microLesson = generateMicroLesson(remediationTopic);
        }
    }

    // Build new state
    const newState: NABLEState = {
        ...state,
        knowledgeGraph: newKnowledgeGraph,
        currentStreak: newStreak,
        consecutiveErrors: newConsecutiveErrors,
        sessionQuestions: [...state.sessionQuestions, questionId],
        lastDifficulty: questionDifficulty + scaling.difficultyAdjustment,
        lastDistractorSimilarity: scaling.distractorSimilarity
    };

    // Build response
    const response: NABLEResponse = {
        nextQuestionId: null, // Will be set by recommend function
        difficultyAdjustment: scaling.difficultyAdjustment,
        masteryDelta,
        recommendedUIMood: scaling.uiMood,
        confidence: primaryScore.confidence,
        blockedProgression: scaling.blockedProgression,
        microLessonRequired,
        microLesson,
        refreshQuestion: null,
        errorClassification,
        shouldSwitchToVisualAided: scaling.recommendedContentType === 'visual-aided',
        currentStreak: newStreak
    };

    return { response, newState };
}

/**
 * Get next recommended question
 */
export function recommend(
    state: NABLEState,
    request: NABLERecommendRequest,
    availableQuestions: ContentItem[]
): { question: ContentItem | null; refreshFirst: boolean; refreshQueue: ContentItem[] } {
    const { excludeQuestionIds = [] } = request;

    // First, check for memory decay refresh
    const refreshResult = checkSessionRefresh(state.knowledgeGraph, 1);

    if (refreshResult.hasRefreshQuestions && state.sessionQuestions.length === 0) {
        // Session just started, inject refresh question first
        return {
            question: refreshResult.refreshQueue[0] || null,
            refreshFirst: true,
            refreshQueue: refreshResult.refreshQueue
        };
    }

    // Filter out already-asked questions
    const allExcluded = [...excludeQuestionIds, ...state.sessionQuestions];
    const filteredQuestions = availableQuestions.filter(
        q => !allExcluded.includes(q.questionId)
    );

    if (filteredQuestions.length === 0) {
        return { question: null, refreshFirst: false, refreshQueue: [] };
    }

    // Find weak sub-skills
    const weakSkills = Object.entries(state.knowledgeGraph)
        .filter(([_, score]) => score.mastery < 0.5)
        .map(([id]) => id);

    // Calculate target difficulty
    const avgMastery = Object.values(state.knowledgeGraph).length > 0
        ? Object.values(state.knowledgeGraph).reduce((sum, s) => sum + s.mastery, 0) /
        Object.values(state.knowledgeGraph).length
        : 0.5;
    const avgConfidence = Object.values(state.knowledgeGraph).length > 0
        ? Object.values(state.knowledgeGraph).reduce((sum, s) => sum + s.confidence, 0) /
        Object.values(state.knowledgeGraph).length
        : 0.5;

    const targetDifficulty = getRecommendedDifficulty(
        avgMastery,
        avgConfidence,
        state.currentStreak
    );

    // Determine required content type
    let requiredContentType = null;
    if (state.consecutiveErrors >= NABLE_CONSTANTS.ERRORS_SWITCH_VISUAL) {
        requiredContentType = 'visual-aided' as const;
    }

    // Rank and select question
    const rankedQuestions = rankQuestionsByFit(
        filteredQuestions,
        targetDifficulty,
        state.lastDistractorSimilarity,
        requiredContentType,
        weakSkills
    );

    return {
        question: rankedQuestions[0] || null,
        refreshFirst: false,
        refreshQueue: []
    };
}

/**
 * Generate a micro-lesson for remediation
 */
function generateMicroLesson(subSkillId: string): MicroLesson {
    // Micro-lesson templates by skill
    const lessons: Record<string, MicroLesson> = {
        'revenue': {
            id: 'ml-revenue',
            subSkillId: 'revenue',
            title: 'Understanding Revenue',
            content: 'Revenue is the total money a business receives from selling products or services. It\'s the "top line" before any costs are subtracted.',
            examples: [
                'If you sell 10 shirts at $20 each, revenue = $200',
                'Revenue ≠ Profit (profit is revenue minus costs)'
            ],
            duration: 60
        },
        'profit': {
            id: 'ml-profit',
            subSkillId: 'profit',
            title: 'Understanding Profit',
            content: 'Profit is what remains after subtracting all costs from revenue. It\'s the "bottom line" - the actual money you keep.',
            examples: [
                'Revenue ($500) - Costs ($300) = Profit ($200)',
                'Profit margin = Profit ÷ Revenue × 100'
            ],
            duration: 60
        },
        'fixed-cost': {
            id: 'ml-fixed-cost',
            subSkillId: 'fixed-cost',
            title: 'Fixed vs Variable Costs',
            content: 'Fixed costs stay the same regardless of how much you sell (rent, insurance). Variable costs change with sales volume (materials, commissions).',
            examples: [
                'Fixed: Monthly rent = $1000 whether you sell 1 or 100 items',
                'Variable: Material cost increases as you make more products'
            ],
            duration: 90
        }
    };

    return lessons[subSkillId] || {
        id: `ml-${subSkillId}`,
        subSkillId,
        title: `Understanding ${subSkillId.replace(/-/g, ' ')}`,
        content: 'Take a moment to review this concept before continuing.',
        examples: ['Review the fundamentals', 'Try again with fresh perspective'],
        duration: 45
    };
}

/**
 * Initialize NABLE state from diagnostic results
 */
export function initializeFromDiagnostic(
    userId: string,
    diagnosticResults: Array<{ subSkillId: string; initialMastery: number; confidence: number }>
): NABLEState {
    const state = createInitialState(userId);

    for (const result of diagnosticResults) {
        state.knowledgeGraph[result.subSkillId] = createInitialSubSkillScore(
            result.initialMastery,
            result.confidence
        );
    }

    return state;
}

/**
 * Handle post-story assessment result
 */
export function handlePostStoryResult(
    state: NABLEState,
    skillId: string,
    correct: boolean
): NABLEState {
    const newKnowledgeGraph = { ...state.knowledgeGraph };

    if (!correct && newKnowledgeGraph[skillId]) {
        // Mark as theoretical-only
        newKnowledgeGraph[skillId] = {
            ...newKnowledgeGraph[skillId],
            theoreticalOnly: true
        };
    } else if (correct && newKnowledgeGraph[skillId]) {
        // Successfully applied - remove theoretical-only flag
        newKnowledgeGraph[skillId] = {
            ...newKnowledgeGraph[skillId],
            theoreticalOnly: false
        };
    }

    return {
        ...state,
        knowledgeGraph: newKnowledgeGraph
    };
}

/**
 * Get overall NABLE status for UI display
 */
export function getStatus(state: NABLEState): {
    overallMastery: number;
    overallConfidence: number;
    weakestSkills: string[];
    strongestSkills: string[];
    recommendedFocus: string[];
    progressionBlocked: boolean;
} {
    const skills = Object.entries(state.knowledgeGraph);

    if (skills.length === 0) {
        return {
            overallMastery: 0.5,
            overallConfidence: 0.5,
            weakestSkills: [],
            strongestSkills: [],
            recommendedFocus: [],
            progressionBlocked: false
        };
    }

    const sorted = skills.sort((a, b) => a[1].mastery - b[1].mastery);

    const overallMastery = skills.reduce((sum, [_, s]) => sum + s.mastery, 0) / skills.length;
    const overallConfidence = skills.reduce((sum, [_, s]) => sum + s.confidence, 0) / skills.length;

    const weakestSkills = sorted.slice(0, 3).map(([id]) => id);
    const strongestSkills = sorted.slice(-3).reverse().map(([id]) => id);

    // Recommended focus: weak skills + theoretical-only + high decay
    const recommendedFocus = skills
        .filter(([_, s]) => s.mastery < 0.5 || s.theoreticalOnly || s.memoryDecay > 0.5)
        .slice(0, 5)
        .map(([id]) => id);

    const progressionBlocked = overallConfidence < NABLE_CONSTANTS.CONFIDENCE_THRESHOLD_BLOCK;

    return {
        overallMastery,
        overallConfidence,
        weakestSkills,
        strongestSkills,
        recommendedFocus,
        progressionBlocked
    };
}

// Export all for use in API routes
export * from './types';
export { classifyError } from './error-classifier';
export { updateMastery, calculateFluency } from './mastery-tracker';
export { calculateDifficultyScaling, getRecommendedDifficulty } from './difficulty-scaler';
export { checkSessionRefresh, calculateMemoryDecay } from './spaced-repetition';
export { analyzeStory, generatePostStoryQuestion } from './story-analyzer';
export {
    initializeDiagnostic,
    updateDiagnosticState,
    isDiagnosticComplete,
    calculateDiagnosticResult,
    getDiagnosticQuestion
} from './diagnostic';
