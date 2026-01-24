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
 * Calculate memory decay for a sub-skill
 * Based on Ebbinghaus forgetting curve principles
 * 
 * @param lastTested - ISO date of last test
 * @param currentMastery - Current mastery level (affects decay rate)
 * @returns Decay level and refresh necessity
 */
export function calculateMemoryDecay(
    lastTested: string,
    currentMastery: number
): MemoryDecayResult & { subSkillId: string } {
    const now = new Date();
    const lastDate = new Date(lastTested);
    const daysSinceTest = Math.floor((now.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));

    // Higher mastery = slower decay (skill is more "cemented")
    const masteryFactor = 1 - (currentMastery * 0.5); // Range: 0.5 to 1.0
    const decayRate = NABLE_CONSTANTS.MEMORY_DECAY_RATE * masteryFactor;

    // Calculate decay using exponential formula
    // decay = 1 - e^(-rate * days)
    const decayLevel = Math.min(1, 1 - Math.exp(-decayRate * daysSinceTest));

    // Determine if refresh is needed
    const needsRefresh = daysSinceTest >= NABLE_CONSTANTS.MEMORY_DECAY_DAYS_THRESHOLD;

    // Determine urgency
    let urgency: 'low' | 'medium' | 'high' | 'critical';
    if (daysSinceTest >= 30) {
        urgency = 'critical';
    } else if (daysSinceTest >= 14) {
        urgency = 'high';
    } else if (daysSinceTest >= 7) {
        urgency = 'medium';
    } else {
        urgency = 'low';
    }

    return {
        subSkillId: '', // Will be set by caller
        daysSinceTest,
        decayLevel,
        needsRefresh,
        urgency
    };
}

/**
 * Update memory decay value for a sub-skill score
 */
export function updateMemoryDecay(
    subSkillScore: SubSkillScore
): SubSkillScore {
    const decay = calculateMemoryDecay(subSkillScore.lastTested, subSkillScore.mastery);

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
        const decay = calculateMemoryDecay(score.lastTested, score.mastery);
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
    const decay = calculateMemoryDecay(score.lastTested, score.mastery);

    // Priority factors:
    // 1. High decay = high priority
    // 2. Low mastery = high priority
    // 3. Low confidence = high priority
    // 4. Theoretical-only = high priority (needs practical reinforcement)

    let priority = decay.decayLevel * 40; // Max 40 points from decay
    priority += (1 - score.mastery) * 30;  // Max 30 points from low mastery
    priority += (1 - score.confidence) * 20; // Max 20 points from low confidence
    priority += score.theoreticalOnly ? 10 : 0; // Bonus 10 for theoretical-only

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
