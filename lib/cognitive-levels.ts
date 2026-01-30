/**
 * Cognitive Scaffolding System
 * 
 * Maps mastery levels to 4 distinct cognitive stages:
 * 1. Recognition (0.0 - 0.3)
 * 2. Guided Practice (0.3 - 0.6)
 * 3. Exam Style (0.6 - 0.85)
 * 4. Mastery (0.85 - 1.0)
 */

export type CognitiveLevel = 1 | 2 | 3 | 4

export interface CognitiveLevelInfo {
    level: CognitiveLevel
    label: string
    description: string
    color: string
}

export const COGNITIVE_LEVELS: Record<CognitiveLevel, CognitiveLevelInfo> = {
    1: {
        level: 1,
        label: 'Recognition',
        description: 'Focus on identifying concepts and basic definitions.',
        color: '#3B82F6' // Blue
    },
    2: {
        level: 2,
        label: 'Guided Practice',
        description: 'Apply concepts with hints and scaffolding.',
        color: '#8B5CF6' // Purple
    },
    3: {
        level: 3,
        label: 'Exam Style',
        description: 'Timed questions with standard difficulty.',
        color: '#F59E0B' // Amber
    },
    4: {
        level: 4,
        label: 'Mastery',
        description: 'Complex scenarios and structured questions.',
        color: '#10B981' // Emerald
    }
}

/**
 * Calculate cognitive level based on mastery score (0-1)
 */
export const getCognitiveLevel = (mastery: number): CognitiveLevel => {
    if (mastery >= 0.85) return 4
    if (mastery >= 0.6) return 3
    if (mastery >= 0.3) return 2
    return 1
}

/**
 * Get color for a specific level dot
 */
export const getLevelDotColor = (
    dotLevel: CognitiveLevel,
    currentMastery: number
): string => {
    const currentLevel = getCognitiveLevel(currentMastery)

    // If we've passed this level
    if (currentLevel > dotLevel) return COGNITIVE_LEVELS[dotLevel].color

    // If we're exactly at this level
    if (currentLevel === dotLevel) return COGNITIVE_LEVELS[dotLevel].color

    // Future level
    return 'var(--border-subtle)'
}

/**
 * Check if a level is unlocked
 */
export const isLevelUnlocked = (
    level: CognitiveLevel,
    mastery: number
): boolean => {
    const currentLevel = getCognitiveLevel(mastery)
    return level <= currentLevel
}
