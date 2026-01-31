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
    NABLEState,
    KnowledgeGraph,
    SubSkillScore,
    ContentItem,
    MicroLesson,
    NABLE_CONSTANTS,
    UIMood,
    InteractionMetrics,
    LearningEvent
} from './types';

import { classifyError, analyzeErrorPatterns, suggestRemediationTopic, classifyErrorEnhanced, EnhancedErrorResult } from './error-classifier';
import { updateSubSkillScore, createInitialSubSkillScore, updateMastery, calculateFluency } from './mastery-tracker';
import { calculateDifficultyScaling, rankQuestionsByFit, getRecommendedDifficulty } from './difficulty-scaler';
import { checkSessionRefresh, applyDecayToGraph, calculateMemoryDecay } from './spaced-repetition';
import { markSkillAsTheoreticalOnly } from './story-analyzer';
import { normalizeQuestion, NormalizedQuestion, padOptions } from './question-normalizer';
import { detectWeirdQuestion, filterContentPool, QCResult } from './quality-control';

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
        recentTopicIds: [],
        personalStabilityFactor: 1.0,
        hearts: 5, // Start with 5 hearts
        completedQuestionIds: [], // Initialize completedQuestionIds
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
    let knowledgeGraph = existingData.knowledgeGraph
        ? applyDecayToGraph(existingData.knowledgeGraph)
        : {};

    // V4: Merge Delta if provided
    if (existingData.knowledgeGraph && (existingData as any).stateDelta) {
        knowledgeGraph = {
            ...knowledgeGraph,
            ...(existingData as any).stateDelta
        };
    }

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
): { response: NABLEResponse; newState: NABLEState; learningEvent: LearningEvent } {
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

    // PRODUCTION: Automated Quality Control (Detect "Weird" Questions)
    // We pass a partial ContentItem constructed from the request
    const mockContentItem: ContentItem = {
        questionId,
        objectiveId,
        difficultyWeight: questionDifficulty,
        subSkills,
        contentType: 'standard', // Fallback
        distractorSimilarity: state.lastDistractorSimilarity,
        expectedTime: 30 // Default expected time
    };

    const qcResult = detectWeirdQuestion(mockContentItem, metrics);
    if (qcResult.isFlagged) {
        console.warn(`[NABLE QC] Flagged Question ${questionId}: ${qcResult.reason}`);
        // In a real system, we'd fire an event to a global database here to increment population flags
    }

    // Update mastery for each sub-skill
    const masteryDelta: Record<string, number> = {};
    const stateDelta: KnowledgeGraph = {};
    const newKnowledgeGraph = { ...state.knowledgeGraph };

    for (const subSkillId of subSkills) {
        // Get or create sub-skill score
        const currentScore = newKnowledgeGraph[subSkillId] || createInitialSubSkillScore();

        // Update score
        const updatedScore = updateSubSkillScore(
            currentScore,
            metrics,
            30,
            state.personalStabilityFactor
        );

        // Calculate delta
        masteryDelta[subSkillId] = updatedScore.mastery - currentScore.mastery;

        // Store updated score
        newKnowledgeGraph[subSkillId] = updatedScore;

        // Track for V4 Delta Sync
        stateDelta[subSkillId] = updatedScore;
    }

    // Update state counters
    const newStreak = correct ? state.currentStreak + 1 : 0;
    const newConsecutiveErrors = correct ? 0 : state.consecutiveErrors + 1;

    // V4 Heart Economy: Deduct on error
    const newHearts = correct ? state.hearts : Math.max(0, state.hearts - 1);

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
        lastDistractorSimilarity: scaling.distractorSimilarity,
        recentTopicIds: [objectiveId, ...state.recentTopicIds].slice(0, 5),
        hearts: newHearts,
        completedQuestionIds: correct
            ? Array.from(new Set([...state.completedQuestionIds, questionId]))
            : state.completedQuestionIds
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
        currentStreak: newStreak,
        heartsRemaining: newHearts,
        requiresRefill: newHearts === 0,
        stateDelta
    };

    // Build Learning Event for Global Intelligence
    const learningEvent: LearningEvent = {
        eventId: `${state.userId}-${Date.now()}`,
        userId: state.userId,
        timestamp: new Date().toISOString(),
        subSkillId: primarySubSkill,
        difficulty: questionDifficulty,
        correct,
        errorType: errorClassification,
        timeToAnswer,
        priorMastery: primaryScore.mastery, // Score before update
        newMastery: newKnowledgeGraph[primarySubSkill].mastery,
        interventionId: microLesson ? microLesson.id : undefined
    };

    return { response, newState, learningEvent };
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

    // Filter out already-asked questions AND archived/flagged ones
    const allExcluded = [...excludeQuestionIds, ...state.sessionQuestions];
    let filteredQuestions = availableQuestions.filter(
        q => !allExcluded.includes(q.questionId)
    );

    // V4: Human-in-the-Loop & Prerequisite Enforcement
    filteredQuestions = filteredQuestions.filter(q => {
        // 1. Only allow verified (or pending for now to avoid empty pool)
        if (q.verificationStatus === 'rejected') return false;

        // 2. Prerequisite Check
        if (q.prerequisites && q.prerequisites.length > 0) {
            const unmet = q.prerequisites.some(preId => {
                const preScore = state.knowledgeGraph[preId];
                return !preScore || preScore.mastery < 0.5; // Threshold for "unlocking"
            });
            if (unmet) return false;
        }
        return true;
    });

    // Apply Quality Control filtering (remove archived)
    filteredQuestions = filterContentPool(filteredQuestions);

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
        weakSkills,
        state.recentTopicIds // Pass recent topics to penalize fit
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
