type CooldownWindow = {
  until: number; // epoch ms
  reason: string;
};

type DailyCount = {
  dayKey: string; // YYYY-MM-DD
  count: number;
};

const STORAGE_KEY = 'brightos_mission_rewards_v1';

function dayKey(d: Date) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function readState(): { daily: DailyCount; cooldown: CooldownWindow | null } {
  if (typeof window === 'undefined') {
    return { daily: { dayKey: dayKey(new Date()), count: 0 }, cooldown: null };
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { daily: { dayKey: dayKey(new Date()), count: 0 }, cooldown: null };

    const parsed = JSON.parse(raw) as { daily?: DailyCount; cooldown?: CooldownWindow | null };
    const today = dayKey(new Date());
    const daily = parsed.daily && parsed.daily.dayKey === today ? parsed.daily : { dayKey: today, count: 0 };
    const cooldown = parsed.cooldown && typeof parsed.cooldown.until === 'number' ? parsed.cooldown : null;

    return { daily, cooldown };
  } catch {
    return { daily: { dayKey: dayKey(new Date()), count: 0 }, cooldown: null };
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
  return daily.count;
}

export function registerMissionCompletionAndMaybeCooldown(opts?: { cooldownMinutes?: number }) {
  const minutesRaw = opts?.cooldownMinutes ?? (Math.floor(Math.random() * 6) + 5);
  const minutes = Math.max(5, Math.min(10, Math.round(minutesRaw)));

  const now = Date.now();
  const state = readState();
  const today = dayKey(new Date());

  const daily: DailyCount = state.daily.dayKey === today ? { ...state.daily } : { dayKey: today, count: 0 };
  daily.count += 1;

  let cooldown: CooldownWindow | null = state.cooldown;

  if (daily.count >= 5) {
    cooldown = {
      until: now + minutes * 60_000,
      reason: `Daily mission limit reached (${daily.count}). Cooldown active.`
    };
  }

  writeState({ daily, cooldown });

  return {
    dailyCount: daily.count,
    cooldown,
  };
}
