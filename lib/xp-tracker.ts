/**
 * XP Tracking System
 * Tracks experience points earned from completing simulations
 */

export interface XPRecord {
  objectiveId: string;
  xpEarned: number;
  reason: string;
  timestamp: string;
  correct: boolean;
  difficulty: number;
}

/**
 * Calculate XP based on performance
 */
export function calculateXP(correct: boolean, difficulty: number, timeSpent: number): number {
  let baseXP = 0;
  
  if (correct) {
    // Base XP for correct answer
    baseXP = 50;
    
    // Difficulty bonus (harder = more XP)
    baseXP += difficulty * 10;
    
    // Time efficiency bonus
    if (timeSpent < 60) {
      baseXP += 20; // Quick and correct
    } else if (timeSpent < 120) {
      baseXP += 10;
    }
  } else {
    // Partial XP for incorrect (learning still happened)
    baseXP = 25;
    baseXP += difficulty * 5;
  }
  
  return Math.round(baseXP);
}

/**
 * Get total XP from localStorage
 */
export function getTotalXP(): number {
  if (typeof window === 'undefined') return 0;
  
  const xpRecords = JSON.parse(localStorage.getItem('brighted_xp') || '[]');
  return xpRecords.reduce((total: number, record: XPRecord) => total + record.xpEarned, 0);
}

/**
 * Add XP and save to localStorage
 */
export function addXP(objectiveId: string, correct: boolean, difficulty: number, timeSpent: number): number {
  if (typeof window === 'undefined') return 0;
  
  const xpEarned = calculateXP(correct, difficulty, timeSpent);
  
  const xpRecords: XPRecord[] = JSON.parse(localStorage.getItem('brighted_xp') || '[]');
  xpRecords.push({
    objectiveId,
    xpEarned,
    reason: correct ? 'Correct answer' : 'Learning attempt',
    timestamp: new Date().toISOString(),
    correct,
    difficulty
  });
  
  localStorage.setItem('brighted_xp', JSON.stringify(xpRecords));
  
  return xpEarned;
}

/**
 * Get XP history
 */
export function getXPHistory(): XPRecord[] {
  if (typeof window === 'undefined') return [];
  
  return JSON.parse(localStorage.getItem('brighted_xp') || '[]');
}
