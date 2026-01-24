/**
 * NABLE (Neural-Adaptive Business Learning Engine) - Type Definitions
 * 
 * Core types for maintaining the user in the "Flow State" between boredom and anxiety.
 */

// =============================================================================
// USER PROFILE TYPES
// =============================================================================

/**
 * User biographical data from onboarding
 */
export interface UserBio {
    age: number;
    priorKnowledge: 'none' | 'basic' | 'intermediate' | 'advanced';
    goal: string;
    intent: 'learner' | 'owner' | 'both';
    subjects: string[];
}

/**
 * Error type classification
 */
export type ErrorType = 'conceptual' | 'careless';

/**
 * Sub-skill mastery score with behavioral signals
 */
export interface SubSkillScore {
    mastery: number;          // 0.0 - 1.0
    confidence: number;       // 0.0 - 1.0
    lastTested: string;       // ISO date
    errorHistory: ErrorType[];
    streakCount: number;
    memoryDecay: number;      // 0.0 - 1.0 (higher = more forgotten)
    theoreticalOnly: boolean; // Failed in practical application
}

/**
 * Knowledge graph mapping sub-skills to scores
 */
export interface KnowledgeGraph {
    [subSkillId: string]: SubSkillScore;
}

// =============================================================================
// INTERACTION METRICS
// =============================================================================

/**
 * Behavioral signals from user interactions
 */
export interface InteractionMetrics {
    timeToAnswer: number;     // seconds
    streak: number;           // consecutive correct answers
    errorType: ErrorType | null;
    responseSpeed: 'fast' | 'normal' | 'slow';
    questionDifficulty: number;
    selectedAnswer: number;
    correctAnswer: number;
}

/**
 * Calculate current fluency score
 * Formula: (Correctness * 0.7) + (Speed_Factor * 0.3)
 */
export interface FluencyScore {
    value: number;            // 0.0 - 1.0
    correctnessComponent: number;
    speedComponent: number;
}

// =============================================================================
// CONTENT DATABASE TYPES
// =============================================================================

/**
 * Content type for adaptive difficulty
 */
export type ContentType = 'standard' | 'visual-aided' | 'micro-lesson';

/**
 * Question metadata for selection algorithm
 */
export interface ContentItem {
    questionId: string;
    objectiveId: string;
    difficultyWeight: number; // 0.0 - 10.0
    subSkills: string[];      // Tags for this question
    contentType: ContentType;
    distractorSimilarity: number; // 0.0 - 1.0 (higher = harder to distinguish wrong answers)
    expectedTime: number;     // seconds
}

/**
 * Micro-lesson card for conceptual error remediation
 */
export interface MicroLesson {
    id: string;
    subSkillId: string;
    title: string;
    content: string;
    examples: string[];
    duration: number; // estimated seconds
}

// =============================================================================
// NABLE OUTPUT TYPES
// =============================================================================

/**
 * UI mood recommendation based on performance
 */
export type UIMood = 'Encouraging' | 'Challenging' | 'Supportive' | 'Celebratory';

/**
 * Main NABLE response after evaluation
 */
export interface NABLEResponse {
    // Next action
    nextQuestionId: string | null;
    difficultyAdjustment: number; // delta to apply

    // Mastery updates
    masteryDelta: Record<string, number>;

    // UI guidance
    recommendedUIMood: UIMood;

    // Confidence and progression
    confidence: number;
    blockedProgression: boolean;

    // Content injection
    microLessonRequired: boolean;
    microLesson: MicroLesson | null;
    refreshQuestion: ContentItem | null;

    // Diagnostic info
    errorClassification: ErrorType | null;
    shouldSwitchToVisualAided: boolean;
    currentStreak: number;
}

/**
 * NABLE evaluation request
 */
export interface NABLEEvaluateRequest {
    userId: string;
    questionId: string;
    objectiveId: string;
    selectedAnswer: number;
    correctAnswer: number;
    options: string[];
    timeToAnswer: number;
    subSkills: string[];
    questionDifficulty: number;
}

/**
 * NABLE recommendation request
 */
export interface NABLERecommendRequest {
    userId: string;
    subject: string;
    excludeQuestionIds?: string[];
}

// =============================================================================
// DIAGNOSTIC TYPES (Cold Start)
// =============================================================================

/**
 * Diagnostic question for binary search
 */
export interface DiagnosticQuestion {
    id: string;
    question: string;
    difficulty: number; // 1-10
    tags: string[];
    options: string[];
    correctAnswer: number;
}

/**
 * Diagnostic session state
 */
export interface DiagnosticState {
    currentLevel: number;
    minLevel: number;
    maxLevel: number;
    questionsAnswered: number;
    correctCount: number;
    history: Array<{
        level: number;
        correct: boolean;
        timeToAnswer: number;
    }>;
}

/**
 * Diagnostic result per sub-skill
 */
export interface DiagnosticResult {
    subSkillId: string;
    initialMastery: number;
    confidence: number;
}

// =============================================================================
// SPACED REPETITION TYPES
// =============================================================================

/**
 * Memory decay calculation result
 */
export interface MemoryDecayResult {
    subSkillId: string;
    daysSinceTest: number;
    decayLevel: number;     // 0.0 - 1.0
    needsRefresh: boolean;
    urgency: 'low' | 'medium' | 'high' | 'critical';
}

/**
 * Session refresh check result
 */
export interface RefreshCheckResult {
    hasRefreshQuestions: boolean;
    refreshQueue: ContentItem[];
    totalDecayedSkills: number;
}

// =============================================================================
// STORY INTEGRATION TYPES
// =============================================================================

/**
 * Skill application point in a story
 */
export interface SkillApplication {
    skillId: string;
    storyMoment: string;    // Description of where it appears
    character: 'Luka' | 'Mendy' | 'Malchi' | null;
    applicationContext: string;
}

/**
 * Post-story assessment question
 */
export interface PostStoryQuestion {
    questionId: string;
    storyId: string;
    character: 'Luka' | 'Mendy' | 'Malchi';
    skillId: string;
    question: string;
    options: string[];
    correctAnswer: number;
    storyContext: string;
}

/**
 * Story analysis result
 */
export interface StoryAnalysis {
    storyId: string;
    skillApplications: SkillApplication[];
    recommendedAssessments: string[];
}

// =============================================================================
// CONSTANTS
// =============================================================================

export const NABLE_CONSTANTS = {
    // Confidence thresholds
    CONFIDENCE_THRESHOLD_BLOCK: 0.4,    // Block progression below this
    CONFIDENCE_THRESHOLD_ADVANCE: 0.7,  // Allow advancement above this

    // Streak thresholds
    STREAK_INCREASE_DISTRACTOR: 3,      // Increase distractor similarity after N correct
    ERRORS_SWITCH_VISUAL: 2,            // Switch to visual-aided after N consecutive errors

    // Fluency weights
    FLUENCY_CORRECTNESS_WEIGHT: 0.7,
    FLUENCY_SPEED_WEIGHT: 0.3,

    // Time thresholds (seconds)
    FAST_RESPONSE_THRESHOLD: 3,
    SLOW_RESPONSE_THRESHOLD: 60,

    // Memory decay
    MEMORY_DECAY_DAYS_THRESHOLD: 7,     // Days before skill needs refresh
    MEMORY_DECAY_RATE: 0.1,             // Decay per day

    // ELO-style update factors
    ELO_K_FACTOR: 32,                   // Base update speed
    ELO_DIFFICULTY_BONUS: 1.5,          // Bonus for beating hard questions

    // Distractor scaling
    MIN_DISTRACTOR_SIMILARITY: 0.3,
    MAX_DISTRACTOR_SIMILARITY: 0.9,
    DISTRACTOR_STEP: 0.1
} as const;
