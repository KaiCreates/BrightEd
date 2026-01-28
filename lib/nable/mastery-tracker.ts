/**
 * NABLE Mastery Tracker
 * 
 * ELO-style rating system for skill mastery updates.
 * Key principles:
 * - Win against HARD questions = more points
 * - Lose against EASY questions = significant penalty
 * - Speed factor = 30% weight
 */

import { NABLE_CONSTANTS, SubSkillScore, InteractionMetrics, FluencyScore } from './types';

/**
 * Calculate speed factor based on response time
 * Returns a value between 0.0 and 1.0
 */
export function calculateSpeedFactor(
    timeToAnswer: number,
    expectedTime: number = 30
): number {
    const { FAST_RESPONSE_THRESHOLD, SLOW_RESPONSE_THRESHOLD } = NABLE_CONSTANTS;

    // Too fast might be guessing - slight penalty
    if (timeToAnswer < FAST_RESPONSE_THRESHOLD) {
        return 0.6; // Penalize speed-guessing
    }

    // Optimal range: between fast threshold and expected time
    if (timeToAnswer <= expectedTime) {
        // Linear scale from 0.8 to 1.0
        const ratio = (timeToAnswer - FAST_RESPONSE_THRESHOLD) / (expectedTime - FAST_RESPONSE_THRESHOLD);
        return 0.8 + (ratio * 0.2);
    }

    // Slower than expected but within reasonable bounds
    if (timeToAnswer <= SLOW_RESPONSE_THRESHOLD) {
        // Linear decay from 1.0 to 0.5
        const ratio = (timeToAnswer - expectedTime) / (SLOW_RESPONSE_THRESHOLD - expectedTime);
        return 1.0 - (ratio * 0.5);
    }

    // Very slow - struggling
    return 0.4;
}

/**
 * Calculate current fluency score
 * Formula: (Correctness * 0.7) + (Speed_Factor * 0.3)
 */
export function calculateFluency(
    correct: boolean,
    timeToAnswer: number,
    expectedTime: number = 30
): FluencyScore {
    const { FLUENCY_CORRECTNESS_WEIGHT, FLUENCY_SPEED_WEIGHT } = NABLE_CONSTANTS;

    const correctnessComponent = correct ? 1.0 : 0.0;
    const speedComponent = calculateSpeedFactor(timeToAnswer, expectedTime);

    const value = (correctnessComponent * FLUENCY_CORRECTNESS_WEIGHT) +
        (speedComponent * FLUENCY_SPEED_WEIGHT);

    return {
        value,
        correctnessComponent,
        speedComponent
    };
}

/**
 * Calculate ELO-style expected score
 * Higher expected score when your mastery > question difficulty
 */
function calculateExpectedScore(
    mastery: number,
    questionDifficulty: number
): number {
    // Normalize difficulty to 0-1 scale (from 0-10)
    const normalizedDifficulty = questionDifficulty / 10;

    // ELO formula adapted for mastery vs difficulty
    const diff = mastery - normalizedDifficulty;
    return 1 / (1 + Math.pow(10, -diff * 4));
}

/**
 * Update mastery using ELO-style system
 * 
 * @param currentMastery - Current mastery level (0.0 - 1.0)
 * @param questionDifficulty - Question difficulty (0.0 - 10.0)
 * @param correct - Whether the answer was correct
 * @param timeToAnswer - Time taken to answer in seconds
 * @returns New mastery and delta
 */
export function updateMastery(
    currentMastery: number,
    questionDifficulty: number,
    correct: boolean,
    timeToAnswer: number,
    expectedTime: number = 30
): { newMastery: number; delta: number; fluency: FluencyScore } {
    const { ELO_K_FACTOR, ELO_DIFFICULTY_BONUS } = NABLE_CONSTANTS;

    // Calculate fluency
    const fluency = calculateFluency(correct, timeToAnswer, expectedTime);

    // Calculate expected score
    const expected = calculateExpectedScore(currentMastery, questionDifficulty);

    // Actual score (weighted by speed)
    const actual = correct ? fluency.value : 0;

    // Base delta
    let delta = (ELO_K_FACTOR / 100) * (actual - expected);

    // Difficulty bonus/penalty
    const normalizedDifficulty = questionDifficulty / 10;

    if (correct) {
        // Bonus for beating hard questions
        if (normalizedDifficulty > currentMastery) {
            const diffBonus = (normalizedDifficulty - currentMastery) * ELO_DIFFICULTY_BONUS;
            delta += diffBonus * 0.1;
        }
    } else {
        // Extra penalty for failing easy questions
        if (normalizedDifficulty < currentMastery) {
            const diffPenalty = (currentMastery - normalizedDifficulty) * ELO_DIFFICULTY_BONUS;
            delta -= diffPenalty * 0.1;
        }
    }

    // Apply delta with bounds
    const newMastery = Math.max(0, Math.min(1, currentMastery + delta));

    return {
        newMastery,
        delta: newMastery - currentMastery,
        fluency
    };
}

/**
 * Update confidence based on consistency of performance
 */
export function updateConfidence(
    currentConfidence: number,
    correct: boolean,
    expectedToPass: boolean
): number {
    // Confidence increases when performance matches expectations
    const matchedExpectation = correct === expectedToPass;

    let delta: number;
    if (matchedExpectation) {
        // Performance as expected - confidence increases
        delta = 0.05;
    } else if (correct && !expectedToPass) {
        // Exceeded expectations - moderate confidence boost
        delta = 0.08;
    } else {
        // Failed when expected to pass - confidence drops
        delta = -0.1;
    }

    return Math.max(0, Math.min(1, currentConfidence + delta));
}

/**
 * Update streak count based on answer correctness
 */
export function updateStreak(
    currentStreak: number,
    correct: boolean
): number {
    if (correct) {
        return currentStreak + 1;
    }
    return 0; // Reset on wrong answer
}

/**
 * Full sub-skill update function
 */
export function updateSubSkillScore(
    current: SubSkillScore,
    metrics: InteractionMetrics,
    expectedTime: number = 30
): SubSkillScore {
    const correct = metrics.selectedAnswer === metrics.correctAnswer;

    // Update mastery
    const masteryResult = updateMastery(
        current.mastery,
        metrics.questionDifficulty,
        correct,
        metrics.timeToAnswer,
        expectedTime
    );

    // Update confidence
    const expectedToPass = current.mastery >= (metrics.questionDifficulty / 10);
    const newConfidence = updateConfidence(current.confidence, correct, expectedToPass);

    // Update streak
    const newStreak = updateStreak(current.streakCount, correct);

    // Update error history (only on errors)
    const newErrorHistory = correct
        ? current.errorHistory
        : [...current.errorHistory.slice(-9), metrics.errorType!].filter(Boolean) as SubSkillScore['errorHistory'];

    // Reset memory decay on test
    const newMemoryDecay = 0;

    return {
        mastery: masteryResult.newMastery,
        confidence: newConfidence,
        lastTested: new Date().toISOString(),
        errorHistory: newErrorHistory,
        streakCount: newStreak,
        memoryDecay: newMemoryDecay,
        theoreticalOnly: current.theoreticalOnly
    };
}

/**
 * Create initial sub-skill score for new users
 */
export function createInitialSubSkillScore(
    initialMastery: number = 0.3, // Global default if unknown
    initialConfidence: number = 0.5
): SubSkillScore {
    return {
        mastery: initialMastery,
        confidence: initialConfidence,
        lastTested: new Date().toISOString(),
        errorHistory: [],
        streakCount: 0,
        memoryDecay: 0,
        theoreticalOnly: false
    };
}

/**
 * Calculate aggregate mastery across multiple sub-skills
 */
export function calculateAggregateMastery(
    subSkillScores: SubSkillScore[]
): { averageMastery: number; averageConfidence: number; weakestSkills: string[] } {
    if (subSkillScores.length === 0) {
        return {
            averageMastery: 0.5,
            averageConfidence: 0.5,
            weakestSkills: []
        };
    }

    const totalMastery = subSkillScores.reduce((sum, s) => sum + s.mastery, 0);
    const totalConfidence = subSkillScores.reduce((sum, s) => sum + s.confidence, 0);

    const averageMastery = totalMastery / subSkillScores.length;
    const averageConfidence = totalConfidence / subSkillScores.length;

    // Find skills below average
    const weakThreshold = averageMastery - 0.15;
    const weakestSkills = subSkillScores
        .filter(s => s.mastery < weakThreshold)
        .map((_, i) => i.toString()); // Would need actual skill IDs in real usage

    return {
        averageMastery,
        averageConfidence,
        weakestSkills
    };
}
