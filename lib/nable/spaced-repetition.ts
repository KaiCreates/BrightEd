/**
 * NABLE Spaced Repetition System
 * 
 * Tracks memory decay using the forgetting curve.
 * Injects "Quick Refresh" questions at session start for skills
 * that haven't been tested recently.
 */

import {
    NABLE_CONSTANTS,
    SubSkillScore,
    MemoryDecayResult,
    RefreshCheckResult,
    ContentItem,
    KnowledgeGraph
} from './types';

/**
 * Calculate recall probability and decay level
 * Based on Half-Life Regression (HLR) principles: P = 2^(-Δt / h)
 * 
 * @param lastTested - ISO date of last test
 * @param halfLife - Current half-life in days
 * @returns Decay level and refresh necessity
 */
export function calculateMemoryDecay(
    lastTested: string,
    halfLife: number = NABLE_CONSTANTS.HALFLIFE_BASE
): MemoryDecayResult & { subSkillId: string } {
    const now = new Date();
    const lastDate = new Date(lastTested);
    const daysSinceTest = Math.max(0, (now.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));

    // HLR Formula: p = 2^(-Δt / h)
    // Recall probability (p) is 1.0 immediately after testing
    const recallProbability = Math.pow(2, -daysSinceTest / halfLife);

    // Decay level is the inverse of recall probability (higher = more forgotten)
    const decayLevel = Math.min(1, 1 - recallProbability);

    // Determine if refresh is needed (threshold: e.g. 7 days or probability < 0.5)
    // Using NABLE_CONSTANTS.MEMORY_DECAY_DAYS_THRESHOLD (7) as a secondary check
    const needsRefresh = daysSinceTest >= NABLE_CONSTANTS.MEMORY_DECAY_DAYS_THRESHOLD || recallProbability < 0.8;

    // Determine urgency
    let urgency: 'low' | 'medium' | 'high' | 'critical';
    if (recallProbability < 0.3 || daysSinceTest >= 30) {
        urgency = 'critical';
    } else if (recallProbability < 0.5 || daysSinceTest >= 14) {
        urgency = 'high';
    } else if (recallProbability < 0.7 || daysSinceTest >= 7) {
        urgency = 'medium';
    } else {
        urgency = 'low';
    }

    return {
        subSkillId: '', // Will be set by caller
        daysSinceTest: Math.floor(daysSinceTest),
        decayLevel,
        needsRefresh,
        urgency
    };
}

/**
 * Update half-life based on performance
 * @param currentHalfLife - Current half-life in days
 * @param correct - Whether the answer was correct
 * @param difficulty - Question difficulty (0-10)
 */
export function updateHalfLife(
    currentHalfLife: number,
    correct: boolean,
    difficulty: number,
    stabilityFactor: number = 1.0
): number {
    const h = currentHalfLife || NABLE_CONSTANTS.HALFLIFE_BASE;
    let newHalfLife: number;

    if (correct) {
        // Growth factor: slower growth for harder questions
        // Apply stabilityFactor (personal multiplier)
        const growthFactor = (2.5 - (difficulty / 10)) * stabilityFactor;
        newHalfLife = h * growthFactor;
    } else {
        // Decay factor: sharp drop on failure, but tempered by stability factor
        // High stability = less dramatic drop
        const decayFactor = 0.5 / stabilityFactor;
        newHalfLife = h * Math.min(0.8, decayFactor);
    }

    // Clamp between base and max
    return Math.max(
        NABLE_CONSTANTS.HALFLIFE_BASE,
        Math.min(NABLE_CONSTANTS.HALFLIFE_MAX, newHalfLife)
    );
}

/**
 * Update memory decay value for a sub-skill score
 */
export function updateMemoryDecay(
    subSkillScore: SubSkillScore
): SubSkillScore {
    const decay = calculateMemoryDecay(subSkillScore.lastTested, subSkillScore.halfLife);

    return {
        ...subSkillScore,
        memoryDecay: decay.decayLevel
    };
}

/**
 * Check all sub-skills for memory decay and build refresh queue
 */
export function checkSessionRefresh(
    knowledgeGraph: KnowledgeGraph,
    maxRefreshQuestions: number = 3
): RefreshCheckResult {
    const decayResults: (MemoryDecayResult & { subSkillId: string })[] = [];

    // Calculate decay for all sub-skills
    for (const [subSkillId, score] of Object.entries(knowledgeGraph)) {
        const decay = calculateMemoryDecay(score.lastTested, score.halfLife);
        decayResults.push({
            ...decay,
            subSkillId
        });
    }

    // Filter to those needing refresh and sort by urgency
    const needsRefresh = decayResults
        .filter(d => d.needsRefresh)
        .sort((a, b) => {
            // Sort by urgency (critical first), then by decay level
            const urgencyOrder = { critical: 0, high: 1, medium: 2, low: 3 };
            const urgencyDiff = urgencyOrder[a.urgency] - urgencyOrder[b.urgency];
            if (urgencyDiff !== 0) return urgencyDiff;
            return b.decayLevel - a.decayLevel;
        });

    // Take top N for refresh queue
    const topRefresh = needsRefresh.slice(0, maxRefreshQuestions);

    // Build refresh queue (actual question selection would happen in engine)
    const refreshQueue: ContentItem[] = topRefresh.map(d => ({
        questionId: `refresh_${d.subSkillId}`, // Placeholder
        objectiveId: d.subSkillId,
        difficultyWeight: knowledgeGraph[d.subSkillId]?.mastery * 10 || 5,
        subSkills: [d.subSkillId],
        contentType: 'standard' as const,
        distractorSimilarity: 0.5,
        expectedTime: 30
    }));

    return {
        hasRefreshQuestions: refreshQueue.length > 0,
        refreshQueue,
        totalDecayedSkills: needsRefresh.length
    };
}

/**
 * Apply optimal spacing interval based on performance
 * Returns recommended next review date
 */
export function calculateNextReviewDate(
    currentMastery: number,
    lastCorrect: boolean,
    reviewCount: number
): Date {
    // Base interval in days
    let baseInterval: number;

    if (reviewCount === 0) {
        baseInterval = 1; // First review: 1 day
    } else if (reviewCount === 1) {
        baseInterval = 3; // Second review: 3 days
    } else if (reviewCount === 2) {
        baseInterval = 7; // Third review: 1 week
    } else {
        // Subsequent reviews: exponential growth, capped at 60 days
        baseInterval = Math.min(60, Math.pow(2, reviewCount));
    }

    // Adjust by mastery level
    const masteryMultiplier = 0.5 + currentMastery; // Range: 0.5 to 1.5

    // Adjust by last performance
    const performanceMultiplier = lastCorrect ? 1.2 : 0.7;

    const finalInterval = Math.round(baseInterval * masteryMultiplier * performanceMultiplier);

    const nextReview = new Date();
    nextReview.setDate(nextReview.getDate() + finalInterval);

    return nextReview;
}

/**
 * Get priority score for spaced repetition scheduling
 * Higher score = needs review sooner
 */
export function getReviewPriority(
    subSkillId: string,
    score: SubSkillScore
): number {
    const decay = calculateMemoryDecay(score.lastTested, score.halfLife);

    // Priority factors:
    // 1. High decay = high priority (Max 50)
    // 2. Low mastery = high priority (Max 20)
    // 3. Low confidence = high priority (Max 20)
    // 4. Theoretical-only = high priority (Max 10)

    let priority = decay.decayLevel * 50;
    priority += (1 - score.mastery) * 20;
    priority += (1 - score.confidence) * 20;
    priority += score.theoreticalOnly ? 10 : 0;

    return priority;
}

/**
 * Build optimal review session order
 */
export function buildReviewSession(
    knowledgeGraph: KnowledgeGraph,
    sessionLength: number = 10
): string[] {
    const priorities = Object.entries(knowledgeGraph)
        .map(([subSkillId, score]) => ({
            subSkillId,
            priority: getReviewPriority(subSkillId, score)
        }))
        .sort((a, b) => b.priority - a.priority);

    return priorities.slice(0, sessionLength).map(p => p.subSkillId);
}

/**
 * Apply decay to all sub-skills in knowledge graph
 * Call this when loading user data to update decay values
 */
export function applyDecayToGraph(
    knowledgeGraph: KnowledgeGraph
): KnowledgeGraph {
    const updated: KnowledgeGraph = {};

    for (const [subSkillId, score] of Object.entries(knowledgeGraph)) {
        updated[subSkillId] = updateMemoryDecay(score);
    }

    return updated;
}
