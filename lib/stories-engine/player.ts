/**
 * BrightEd Stories Engine — Player state
 * Age bracket, skills, reputation, resources, active consequences.
 * Persists across sessions.
 */

import { getPlayerProfile, updatePlayerProfile } from '@/lib/stories-store';
import type {
  AgeBracket,
  Skills,
  ReputationMap,
  InventoryMap,
  ActiveConsequence,
  PlayerResources,
} from './types';

const DEFAULT_SKILLS: Skills = {
  financialLiteracy: 50,
  discipline: 50,
  communication: 50,
};

function parseJson<T>(raw: string | null | any, fallback: T): T {
  if (!raw) return fallback;
  if (typeof raw !== 'string') return raw as T;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export async function getOrCreateProfile(userId: string) {
  return getPlayerProfile(userId);
}

export function parseProfile(profile: any) {
  return {
    ageBracket: profile.ageBracket as AgeBracket,
    skills: parseJson<Skills>(profile.skills, DEFAULT_SKILLS),
    reputation: parseJson<ReputationMap>(profile.reputation, {}),
    resources: {
      bCoins: profile.bCoins,
      timeUnits: profile.timeUnits,
      inventory: parseJson<InventoryMap>(profile.inventory, {}),
      energy: profile.energy,
    },
    activeConsequences: parseJson<ActiveConsequence[]>(profile.activeConsequences, []),
  };
}

export async function updateProfile(
  userId: string,
  updates: {
    ageBracket?: AgeBracket;
    skills?: Partial<Skills>;
    reputation?: Partial<ReputationMap>;
    bCoins?: number;
    timeUnits?: number;
    inventory?: InventoryMap;
    energy?: number;
    activeConsequences?: ActiveConsequence[];
    lastSimulatedAt?: Date;
  }
) {
  const profile = await getPlayerProfile(userId);
  const skills = parseJson<Skills>(profile.skills, DEFAULT_SKILLS);
  const reputation = parseJson<ReputationMap>(profile.reputation, {});
  const inventory = parseJson<InventoryMap>(profile.inventory, {});

  if (updates.skills) Object.assign(skills, updates.skills);
  if (updates.reputation) Object.assign(reputation, updates.reputation);
  if (updates.inventory) Object.assign(inventory, updates.inventory);

  const data: any = {
    ...(updates.ageBracket && { ageBracket: updates.ageBracket }),
    ...(updates.skills && { skills: JSON.stringify(skills) }),
    ...(updates.reputation && { reputation: JSON.stringify(reputation) }),
    ...(updates.bCoins !== undefined && { bCoins: updates.bCoins }),
    ...(updates.timeUnits !== undefined && { timeUnits: updates.timeUnits }),
    ...(updates.inventory && { inventory: JSON.stringify(inventory) }),
    ...(updates.energy !== undefined && { energy: updates.energy }),
    ...(updates.activeConsequences && {
      activeConsequences: JSON.stringify(updates.activeConsequences),
    }),
    ...(updates.lastSimulatedAt && { lastSimulatedAt: updates.lastSimulatedAt.toISOString() }),
  };

  await updatePlayerProfile(userId, data);
  return getPlayerProfile(userId);
}

export async function updateLastSimulated(userId: string) {
  await updatePlayerProfile(userId, { lastSimulatedAt: new Date().toISOString() });
}
