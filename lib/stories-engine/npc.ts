/**
 * BrightEd Stories Engine — NPC system
 * Roles (banker, supplier, regulator, client, teacher).
 * Memory of past interactions. React to reputation & tone. Bureaucracy, realism.
 */

import { getNPCMemory, recordNPCInteraction } from '@/lib/stories-store';

export type NPCRole = 'banker' | 'supplier' | 'regulator' | 'client' | 'teacher';

export interface NPCConfig {
  bureaucracyLevel: number; // 0–1
  responseCurve: 'linear' | 'threshold';
  [key: string]: unknown;
}

export interface NPCMemoryEntry {
  at: string;
  action: string;
  outcome: string;
  tone: 'polite' | 'neutral' | 'aggressive';
}

function parseJson<T>(raw: any, fallback: T): T {
  if (!raw) return fallback;
  if (typeof raw !== 'string') return raw as T;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export async function getOrCreateNPCMemory(userId: string, npcId: string) {
  return getNPCMemory(userId, npcId);
}

export async function recordInteraction(
  userId: string,
  npcId: string,
  entry: NPCMemoryEntry
) {
  const existing = await getNPCMemory(userId, npcId);
  const interactions: NPCMemoryEntry[] = existing
    ? parseJson<NPCMemoryEntry[]>(existing.interactions, [])
    : [];
  interactions.push(entry);
  const sentiment = computeSentiment(interactions);

  await recordNPCInteraction(userId, npcId, interactions.slice(-50), sentiment);
}

function computeSentiment(interactions: NPCMemoryEntry[]): number {
  let s = 0;
  for (const i of interactions.slice(-20)) {
    if (i.tone === 'polite') s += 0.1;
    if (i.tone === 'aggressive') s -= 0.15;
    if (i.outcome === 'positive') s += 0.2;
    if (i.outcome === 'negative') s -= 0.2;
  }
  return Math.max(-1, Math.min(1, s));
}

/**
 * NPC disposition toward player. Uses reputation + memory sentiment.
 */
export function disposition(
  reputation: number,
  sentiment: number,
  config: NPCConfig
): 'hostile' | 'cautious' | 'neutral' | 'friendly' | 'trusted' {
  const score = reputation * 0.5 + sentiment * 0.5;
  if (score >= 0.7) return 'trusted';
  if (score >= 0.4) return 'friendly';
  if (score >= 0) return 'neutral';
  if (score >= -0.3) return 'cautious';
  return 'hostile';
}
