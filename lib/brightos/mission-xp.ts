type XPRecord = {
  objectiveId: string;
  xpEarned: number;
  reason: string;
  timestamp: string;
  correct: boolean;
  difficulty: number;
};

const STORAGE_KEY = 'brighted_xp';

export function awardFixedMissionXP(objectiveId: string, xpEarned: number = 300, reason: string = 'Mission complete') {
  if (typeof window === 'undefined') return 0;

  const records: XPRecord[] = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || '[]');
  records.push({
    objectiveId,
    xpEarned,
    reason,
    timestamp: new Date().toISOString(),
    correct: true,
    difficulty: 5,
  });

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
  return xpEarned;
}
