type MissionCompletion = {
  objectiveId: string;
  xpEarned: number;
  completedAt: string;
};

type MissionProgressState = {
  completions: Record<string, MissionCompletion>;
};

const STORAGE_KEY = 'brightos_mission_progress_v1';

function readState(): MissionProgressState {
  if (typeof window === 'undefined') return { completions: {} };
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { completions: {} };
    const parsed = JSON.parse(raw) as MissionProgressState;
    if (!parsed || typeof parsed !== 'object') return { completions: {} };
    return {
      completions: parsed.completions && typeof parsed.completions === 'object' ? parsed.completions : {},
    };
  } catch {
    return { completions: {} };
  }
}

function writeState(next: MissionProgressState) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
}

export function markMissionCompleted(objectiveId: string, xpEarned: number) {
  const state = readState();
  const completion: MissionCompletion = { objectiveId, xpEarned, completedAt: new Date().toISOString() };
  writeState({ completions: { ...state.completions, [objectiveId]: completion } });
  return completion;
}

export function getMissionCompletion(objectiveId: string): MissionCompletion | null {
  const state = readState();
  return state.completions[objectiveId] ?? null;
}

export function getAllMissionCompletions(): MissionCompletion[] {
  const state = readState();
  return Object.values(state.completions).sort((a, b) => b.completedAt.localeCompare(a.completedAt));
}

export function clearMissionProgress() {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(STORAGE_KEY);
}
