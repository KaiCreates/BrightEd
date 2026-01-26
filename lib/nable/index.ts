/**
 * NABLE Engine - Public API
 * 
 * Export all NABLE functionality for use throughout BrightEd.
 */

// Main engine
export {
    createInitialState,
    loadState,
    evaluate,
    recommend,
    initializeFromDiagnostic,
    handlePostStoryResult,
    getStatus,
    type NABLEState
} from './engine';

// Types
export * from './types';

// Sub-modules
export {
    classifyError,
    analyzeErrorPatterns,
    classifyErrorEnhanced,
    classifyErrorWithNormalization,
    type EnhancedErrorResult
} from './error-classifier';
export {
    updateMastery,
    calculateFluency,
    updateSubSkillScore,
    createInitialSubSkillScore
} from './mastery-tracker';
export {
    calculateDifficultyScaling,
    getRecommendedDifficulty,
    determineUIMood,
    shouldBlockProgression
} from './difficulty-scaler';
export {
    checkSessionRefresh,
    calculateMemoryDecay,
    applyDecayToGraph,
    getReviewPriority,
    buildReviewSession
} from './spaced-repetition';
export {
    analyzeStory,
    generatePostStoryQuestion,
    analyzeStoryText,
    STORY_CHARACTERS
} from './story-analyzer';
export {
    initializeDiagnostic,
    updateDiagnosticState,
    isDiagnosticComplete,
    calculateDiagnosticResult,
    getDiagnosticQuestion,
    diagnosticResultToSubSkillScore
} from './diagnostic';

// Question Normalization (Production Robustness)
export {
    normalizeQuestion,
    normalizeOption,
    padOptions,
    isAllOfAbove,
    isNoneOfAbove,
    isEmptyOption,
    isMarksOnly,
    isLetterOnly,
    validateAnswer,
    getQuestionTypeModifier,
    type NormalizedQuestion,
    type AnswerValidation
} from './question-normalizer';
