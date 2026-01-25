export type BrightOSLiveSession = {
  id: string;
  mode: 'csec' | 'malware-incident';
  missionId?: string;
  startedAt: string;
  endedAt?: string;
  status: 'started' | 'completed' | 'abandoned';
  xpEarned?: number;
  notes?: string;
};

const STORAGE_KEY = 'brightos_live_sessions_v1';

function uid(prefix: string) {
  return `${prefix}_${Math.random().toString(16).slice(2)}_${Date.now()}`;
}

function readAll(): BrightOSLiveSession[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(Boolean) as BrightOSLiveSession[];
  } catch {
    return [];
  }
}

function writeAll(list: BrightOSLiveSession[]) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(list.slice(0, 300)));
}

export function startLiveSession(mode: BrightOSLiveSession['mode'], missionId?: string) {
  const session: BrightOSLiveSession = {
    id: uid('sess'),
    mode,
    missionId,
    startedAt: new Date().toISOString(),
    status: 'started',
  };
  const all = readAll();
  writeAll([session, ...all]);
  return session;
}

export function endLiveSession(sessionId: string, update: Pick<BrightOSLiveSession, 'status'> & Partial<Pick<BrightOSLiveSession, 'xpEarned' | 'notes'>>) {
  const all = readAll();
  const next = all.map((s) =>
    s.id === sessionId
      ? {
          ...s,
          ...update,
          endedAt: new Date().toISOString(),
        }
      : s
  );
  writeAll(next);
}

export function getLiveSessions() {
  return readAll().sort((a, b) => b.startedAt.localeCompare(a.startedAt));
}

export function clearLiveSessions() {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(STORAGE_KEY);
}
