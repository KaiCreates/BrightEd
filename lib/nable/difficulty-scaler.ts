/**
 * NABLE Difficulty Scaler
 * 
 * Dynamic difficulty adjustment based on:
 * - Streak > 3: Increase distractor similarity (make wrong answers harder to distinguish)
 * - Errors > 2 in a row: Drop complexity and switch to visual-aided mode
 * - Target: Zone of Proximal Development (current skill + 0.5)
 */

import {
    NABLE_CONSTANTS,
    ContentItem,
    ContentType,
    SubSkillScore
} from './types';

/**
 * Calculate recommended difficulty for next question
 * Targets Zone of Proximal Development: skill level + buffer
 */
export function getRecommendedDifficulty(
    currentMastery: number,
    confidence: number,
    streak: number
): number {
    // Base target: slightly above current level
    let targetDifficulty = currentMastery * 10 + 0.5;

    // High confidence allows harder questions
    if (confidence > NABLE_CONSTANTS.CONFIDENCE_THRESHOLD_ADVANCE) {
        targetDifficulty += 0.5;
    }

    // Streak bonus: push harder on hot streaks
    if (streak >= NABLE_CONSTANTS.STREAK_INCREASE_DISTRACTOR) {
        targetDifficulty += 0.3 * Math.min(streak - 2, 3); // Cap bonus at 3 extra levels
    }

    // Bounds: 1-10
    return Math.max(1, Math.min(10, targetDifficulty));
}

/**
 * Calculate distractor similarity based on performance
 * Higher similarity = harder to distinguish wrong answers
 */
export function calculateDistractorSimilarity(
    currentSimilarity: number,
    streak: number,
    consecutiveErrors: number
): number {
    const {
        STREAK_INCREASE_DISTRACTOR,
        MIN_DISTRACTOR_SIMILARITY,
        MAX_DISTRACTOR_SIMILARITY,
        DISTRACTOR_STEP
    } = NABLE_CONSTANTS;

    let newSimilarity = currentSimilarity;

    // Increase similarity on hot streak
    if (streak >= STREAK_INCREASE_DISTRACTOR) {
        const streakBonus = Math.floor((streak - STREAK_INCREASE_DISTRACTOR + 1) / 2);
        newSimilarity += DISTRACTOR_STEP * streakBonus;
    }

    // Decrease similarity on consecutive errors
    if (consecutiveErrors >= 2) {
        newSimilarity -= DISTRACTOR_STEP * consecutiveErrors;
    }

    // Apply bounds
    return Math.max(
        MIN_DISTRACTOR_SIMILARITY,
        Math.min(MAX_DISTRACTOR_SIMILARITY, newSimilarity)
    );
}

/**
 * Determine if content type should switch to visual-aided
 */
export function shouldSwitchToVisualAided(
    consecutiveErrors: number,
    currentContentType: ContentType
): boolean {
    if (currentContentType === 'visual-aided') {
        return false; // Already visual-aided
    }

    return consecutiveErrors >= NABLE_CONSTANTS.ERRORS_SWITCH_VISUAL;
}

/**
 * Calculate difficulty adjustment after an answer
 */
export function calculateDifficultyAdjustment(
    correct: boolean,
    currentDifficulty: number,
    targetDifficulty: number,
    streak: number,
    consecutiveErrors: number
): number {
    // How far are we from target?
    const currentGap = targetDifficulty - currentDifficulty;

    if (correct) {
        // Move toward target (or slightly above)
        if (streak >= 3) {
            // Hot streak: push harder
            return Math.min(1.5, currentGap + 0.5);
        }
        return Math.min(1.0, currentGap);
    } else {
        // Wrong answer: move easier
        if (consecutiveErrors >= 2) {
            // Struggling: drop significantly
            return -1.5;
        }
        return -0.5;
    }
}

/**
 * Select content type based on performance
 */
export function selectContentType(
    consecutiveErrors: number,
    errorType: 'conceptual' | 'careless' | null,
    currentType: ContentType
): ContentType {
    // Conceptual error after correct type → inject micro-lesson
    if (errorType === 'conceptual') {
        return 'micro-lesson';
    }

    // Multiple errors → switch to visual
    if (consecutiveErrors >= NABLE_CONSTANTS.ERRORS_SWITCH_VISUAL) {
        return 'visual-aided';
    }

    // Default or improvement → standard
    return 'standard';
}

/**
 * Filter and sort questions by difficulty match
 */
export function rankQuestionsByFit(
    questions: ContentItem[],
    targetDifficulty: number,
    targetDistractorSimilarity: number,
    requiredContentType: ContentType | null = null,
    weakSubSkills: string[] = [],
    recentTopicIds: string[] = []
): ContentItem[] {
    return questions
        .filter(q => {
            // Content type filter
            if (requiredContentType && q.contentType !== requiredContentType) {
                return false;
            }
            return true;
        })
        .map(q => {
            // Calculate fit score (lower is better)
            const difficultyGap = Math.abs(q.difficultyWeight - targetDifficulty);
            const distractorGap = Math.abs(q.distractorSimilarity - targetDistractorSimilarity);

            // Bonus for targeting weak skills
            const weakSkillBonus = q.subSkills.some(s => weakSubSkills.includes(s)) ? -2 : 0;

            // Penalty for topic over-exposure (Diversity Buffer)
            // If the objective has appeared in the last 5 questions, penalize it heavily
            const topicPenalty = recentTopicIds.includes(q.objectiveId) ? 5 : 0;

            const fitScore = difficultyGap + (distractorGap * 3) + weakSkillBonus + topicPenalty;

            return { ...q, _fitScore: fitScore };
        })
        .sort((a, b) => (a as any)._fitScore - (b as any)._fitScore);
}

/**
 * Determine UI mood based on performance state
 */
export function determineUIMood(
    streak: number,
    consecutiveErrors: number,
    confidence: number,
    masteryTrend: 'up' | 'down' | 'stable'
): 'Encouraging' | 'Challenging' | 'Supportive' | 'Celebratory' {
    // Celebratory: High streak
    if (streak >= 5) {
        return 'Celebratory';
    }

    // Challenging: Good confidence and performance
    if (confidence > 0.7 && streak >= 2 && masteryTrend !== 'down') {
        return 'Challenging';
    }

    // Supportive: Struggling, needs encouragement
    if (consecutiveErrors >= 2 || confidence < 0.4) {
        return 'Supportive';
    }

    // Default: Encouraging
    return 'Encouraging';
}

/**
 * Check if progression should be blocked
 */
export function shouldBlockProgression(
    confidence: number,
    subSkillMastery: number
): boolean {
    return confidence < NABLE_CONSTANTS.CONFIDENCE_THRESHOLD_BLOCK;
}

/**
 * Full difficulty scaling result
 */
export interface DifficultyScalingResult {
    targetDifficulty: number;
    difficultyAdjustment: number;
    distractorSimilarity: number;
    recommendedContentType: ContentType;
    uiMood: 'Encouraging' | 'Challenging' | 'Supportive' | 'Celebratory';
    blockedProgression: boolean;
}

/**
 * Calculate full difficulty scaling for next question
 */
export function calculateDifficultyScaling(
    subSkillScore: SubSkillScore,
    lastQuestionDifficulty: number,
    correct: boolean,
    errorType: 'conceptual' | 'careless' | null,
    currentDistractorSimilarity: number,
    currentContentType: ContentType
): DifficultyScalingResult {
    const { mastery, confidence, streakCount, errorHistory } = subSkillScore;

    // Count consecutive errors (from end of history)
    let consecutiveErrors = 0;
    for (let i = errorHistory.length - 1; i >= 0; i--) {
        if (errorHistory[i]) consecutiveErrors++;
        else break;
    }
    if (!correct) consecutiveErrors++;

    // Streak handling
    const streak = correct ? streakCount : 0;

    // Target difficulty
    const targetDifficulty = getRecommendedDifficulty(mastery, confidence, streak);

    // Difficulty adjustment
    const difficultyAdjustment = calculateDifficultyAdjustment(
        correct,
        lastQuestionDifficulty,
        targetDifficulty,
        streak,
        consecutiveErrors
    );

    // Distractor similarity
    const distractorSimilarity = calculateDistractorSimilarity(
        currentDistractorSimilarity,
        streak,
        consecutiveErrors
    );

    // Content type
    const recommendedContentType = selectContentType(
        consecutiveErrors,
        errorType,
        currentContentType
    );

    // Mastery trend
    const recentMastery = mastery;
    const masteryTrend = correct ? 'up' : 'down' as const;

    // UI mood
    const uiMood = determineUIMood(streak, consecutiveErrors, confidence, masteryTrend);

    // Block progression check
    const blockedProgression = shouldBlockProgression(confidence, mastery);

    return {
        targetDifficulty,
        difficultyAdjustment,
        distractorSimilarity,
        recommendedContentType,
        uiMood,
        blockedProgression
    };
}
