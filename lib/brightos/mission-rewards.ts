type CooldownWindow = {
  until: number; // epoch ms
  reason: string;
};

type DailyCount = {
  dayKey: string; // YYYY-MM-DD
  completed: string[];
};

const STORAGE_KEY = 'brightos_mission_rewards_v2';

function dayKey(d: Date) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function readState(): { daily: DailyCount; cooldown: CooldownWindow | null } {
  if (typeof window === 'undefined') {
    return { daily: { dayKey: dayKey(new Date()), completed: [] }, cooldown: null };
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { daily: { dayKey: dayKey(new Date()), completed: [] }, cooldown: null };

    const parsed = JSON.parse(raw) as { daily?: DailyCount; cooldown?: CooldownWindow | null };
    const today = dayKey(new Date());
    const daily =
      parsed.daily && parsed.daily.dayKey === today
        ? { dayKey: today, completed: Array.isArray((parsed.daily as any).completed) ? (parsed.daily as any).completed : [] }
        : { dayKey: today, completed: [] };
    let cooldown = parsed.cooldown && typeof parsed.cooldown.until === 'number' ? parsed.cooldown : null;

    let changed = false;

    if (cooldown && Date.now() >= cooldown.until) {
      cooldown = null;
      changed = true;
    }

    if (cooldown && daily.completed.length < 5) {
      cooldown = null;
      changed = true;
    }

    if (changed) {
      writeState({ daily, cooldown });
    }

    return { daily, cooldown };
  } catch {
    return { daily: { dayKey: dayKey(new Date()), completed: [] }, cooldown: null };
  }
}

function writeState(state: { daily: DailyCount; cooldown: CooldownWindow | null }) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function getMissionCooldown() {
  const { cooldown } = readState();
  if (!cooldown) return null;
  if (Date.now() >= cooldown.until) return null;
  return cooldown;
}

export function getMissionsCompletedTodayCount() {
  const { daily } = readState();
  return daily.completed.length;
}

export function registerMissionCompletionAndMaybeCooldown(objectiveId: string, opts?: { cooldownMinutes?: number }) {
  const minutesRaw = opts?.cooldownMinutes ?? (Math.floor(Math.random() * 6) + 5);
  const minutes = Math.max(5, Math.min(10, Math.round(minutesRaw)));

  const now = Date.now();
  const state = readState();
  const today = dayKey(new Date());

  const daily: DailyCount = state.daily.dayKey === today ? { ...state.daily } : { dayKey: today, completed: [] };
  const set = new Set(daily.completed);
  if (objectiveId) set.add(objectiveId);
  daily.completed = Array.from(set);

  let cooldown: CooldownWindow | null = null;

  if (daily.completed.length === 5) {
    cooldown = {
      until: now + minutes * 60_000,
      reason: `Daily mission limit reached (${daily.completed.length}). Cooldown active.`,
    };
  } else if (daily.completed.length > 5) {
    cooldown = state.cooldown;
  }

  writeState({ daily, cooldown });

  return {
    dailyCount: daily.completed.length,
    cooldown,
  };
}
