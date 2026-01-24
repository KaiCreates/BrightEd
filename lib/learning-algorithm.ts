/**
 * Deterministic Learning Algorithm
 * A transparent, persistent mastery system designed for consistency and motivation.
 */

// ============================================================================
// CONFIGURATION & TYPES
// ============================================================================

export interface UserSkillStats {
  generalLevel: number; // 0-10 scale
  consistency: number; // 0-1 scale
  topicMastery: Record<string, number>;
  behavioralSignals: {
    avgResponseTime: number;
    perfectStreaks: number;
    rapidGuessPenalty: number;
  };
}

export interface PerformanceSnapshot {
  correct: boolean;
  responseTime: number; // seconds
  questionDifficulty: number; // 1-10 scale
  tags: string[];
}

/**
 * Update user skill metrics based on performance snapshot
 * Uses ELO-like rating system for adaptive skill tracking
 */
export function updateSkillMetrics(
  currentStats: UserSkillStats,
  snapshot: PerformanceSnapshot
): UserSkillStats {
  const { correct, responseTime, questionDifficulty, tags } = snapshot;

  // Calculate expected score based on skill vs difficulty
  const skillVsDifficulty = currentStats.generalLevel - questionDifficulty;
  const expected = 1 / (1 + Math.pow(10, -skillVsDifficulty / 4));

  // K-factor for rating adjustment (higher = more volatile)
  const kFactor = 1.5;
  const actualScore = correct ? 1 : 0;
  const adjustment = kFactor * (actualScore - expected);

  // Rapid guess penalty (< 2 seconds is suspicious)
  const isRapidGuess = responseTime < 2;
  const rapidPenalty = isRapidGuess && !correct ? 0.3 : 0;

  // Update general level
  let newLevel = currentStats.generalLevel + adjustment - rapidPenalty;
  newLevel = Math.max(1, Math.min(10, newLevel)); // Clamp 1-10

  // Update topic mastery for each tag
  const newTopicMastery = { ...currentStats.topicMastery };
  for (const tag of tags) {
    const currentTopicLevel = newTopicMastery[tag] ?? 5;
    const topicAdjustment = adjustment * 0.8;
    newTopicMastery[tag] = Math.max(1, Math.min(10, currentTopicLevel + topicAdjustment));
  }

  // Update behavioral signals
  const totalResponses = Object.keys(newTopicMastery).length || 1;
  const newAvgTime = (currentStats.behavioralSignals.avgResponseTime * (totalResponses - 1) + responseTime) / totalResponses;

  return {
    generalLevel: newLevel,
    consistency: correct
      ? Math.min(1, currentStats.consistency + 0.1)
      : Math.max(0, currentStats.consistency - 0.15),
    topicMastery: newTopicMastery,
    behavioralSignals: {
      avgResponseTime: newAvgTime,
      perfectStreaks: correct ? currentStats.behavioralSignals.perfectStreaks + 1 : 0,
      rapidGuessPenalty: currentStats.behavioralSignals.rapidGuessPenalty + (isRapidGuess ? 1 : 0),
    }
  };
}

export const MASTERY_CONFIG = {
  MIN_MASTERY: 0.0,
  MAX_MASTERY: 1.0,
  DECAY_RATE: 0.02,
  WEIGHTS: {
    EASY: 0.04,
    MEDIUM: 0.07,
    HARD: 0.12,
  },
  STREAK_FREEZE_LIMIT: 1, // Optional future feature
};

export interface LearningState {
  mastery: Record<string, number>; // { objectiveId: 0.0-1.0 }
  dailyProgress: {
    date: string; // YYYY-MM-DD
    count: number;
    goal: number;
    completed: boolean;
  };
  streak: {
    current: number;
    lastCompletedDate: string | null; // YYYY-MM-DD
    longest: number;
  };
}

// ============================================================================
// MASTERY LOGIC
// ============================================================================

/**
 * Calculate new mastery level based on performance
 */
export function calculateMasteryUpdate(
  currentMastery: number,
  isCorrect: boolean,
  limitBias: 'easy' | 'medium' | 'hard' = 'medium'
): number {
  const current = currentMastery || 0.0;

  if (isCorrect) {
    // Formula: New = Old + (Weight * (1 - Old))
    // As mastery gets closer to 1.0, gains become smaller (diminishing returns)
    let weight = MASTERY_CONFIG.WEIGHTS.MEDIUM;
    if (limitBias === 'easy') weight = MASTERY_CONFIG.WEIGHTS.EASY;
    if (limitBias === 'hard') weight = MASTERY_CONFIG.WEIGHTS.HARD;

    const gain = weight * (1.0 - current);
    return Math.min(MASTERY_CONFIG.MAX_MASTERY, current + gain);
  } else {
    // Decay on failure, but clamped
    const decay = MASTERY_CONFIG.DECAY_RATE;
    return Math.max(MASTERY_CONFIG.MIN_MASTERY, current - decay);
  }
}

// ============================================================================
// STREAK & GOAL LOGIC
// ============================================================================

/**
 * Check if daily goal is reached and update daily stats
 */
export function updateDailyProgress(
  currentState: LearningState['dailyProgress'],
  increment: number = 1
): LearningState['dailyProgress'] {
  const today = new Date().toISOString().split('T')[0];
  const isNewDay = currentState.date !== today;

  let newState = isNewDay
    ? { date: today, count: 0, goal: 5, completed: false } // Reset for new day (default goal 5)
    : { ...currentState };

  newState.count += increment;

  if (newState.count >= newState.goal && !newState.completed) {
    newState.completed = true;
  }

  return newState;
}

/**
 * Update streak based on daily completion
 * Should be called ONLY when daily goal is JUST completed
 */
export function updateStreak(
  currentStreak: LearningState['streak'],
  dailyCompleted: boolean
): LearningState['streak'] {
  if (!dailyCompleted) return currentStreak;

  const today = new Date().toISOString().split('T')[0];

  // If already marked for today, don't double count
  if (currentStreak.lastCompletedDate === today) {
    return currentStreak;
  }

  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
  const lastDate = currentStreak.lastCompletedDate;

  let newCurrent = currentStreak.current;

  if (lastDate === yesterday) {
    // Consecutive day
    newCurrent += 1;
  } else {
    // Break in streak (or first streak)
    newCurrent = 1;
  }

  return {
    current: newCurrent,
    lastCompletedDate: today,
    longest: Math.max(currentStreak.longest, newCurrent),
  };
}

// ============================================================================
// OBJECTIVE SELECTION
// ============================================================================

/**
 * Recommend next objective based on lowest mastery
 * Prioritizes: 
 * 1. Unseen objectives (mastery 0)
 * 2. "In Progress" objectives (0.1 - 0.7)
 * 3. Mastered objectives (review)
 */
export function getNextRecommendedObjective(
  allObjectiveIds: string[],
  masteryMap: Record<string, number>
): string | null {
  // 1. Look for unseen IDs
  const unseen = allObjectiveIds.filter(id => !masteryMap[id]);
  if (unseen.length > 0) {
    return unseen[Math.floor(Math.random() * unseen.length)];
  }

  // 2. Look for "Growth Zone" (0.1 - 0.7)
  const growth = allObjectiveIds.filter(id => {
    const m = masteryMap[id];
    return m > 0.1 && m < 0.8;
  });
  if (growth.length > 0) {
    return growth[Math.floor(Math.random() * growth.length)];
  }

  // 3. Fallback: Review lowest mastery
  return allObjectiveIds.sort((a, b) => (masteryMap[a] || 0) - (masteryMap[b] || 0))[0] || null;
}
