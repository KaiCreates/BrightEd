/**
 * BrightEd Stories Engine — Shared types
 * Subject-agnostic, consequence-based simulations.
 */

export type AgeBracket = 'junior' | 'secondary' | 'senior' | 'adult';

export type SessionState = 'active' | 'paused' | 'completed' | 'failed';

export type ConsequenceType = 'immediate' | 'delayed';

export interface Skills {
  financialLiteracy: number;
  discipline: number;
  communication: number;
  [key: string]: number;
}

export interface ReputationMap {
  [id: string]: number;
}

export interface InventoryMap {
  [itemId: string]: number;
}

export interface ActiveConsequence {
  id: string;
  type: string;
  expiresAt: string; // ISO
  effect: Record<string, unknown>;
}

export interface PlayerResources {
  bCoins: number;
  timeUnits: number;
  inventory: InventoryMap;
  energy: number;
}

export interface ConsequenceEffect {
  system: 'resources' | 'reputation' | 'access' | 'state';
  key: string;
  delta: number;
}

export interface StoryConfig {
  timeMultiplier: number; // real minutes per sim day
  registrationDelayMinutes: number;
  loanApprovalDelayMinutes: number;
  [key: string]: unknown;
}

export interface BusinessSimState {
  registrationStatus: 'none' | 'pending' | 'approved';
  registrationSubmittedAt?: string;
  businessName?: string;
  cashBalance: number;
  inventory: InventoryMap;
  loans: Array<{
    id: string;
    principal: number;
    rate: number;
    dueAt: string;
    paid: number;
  }>;
  taxObligations: Array<{
    period: string;
    amount: number;
    paid: number;
    dueAt: string;
  }>;
  marketExposure: number;
  lastMarketUpdate: string;
}

export interface DifficultyContext {
  ageBracket: AgeBracket;
  skillLevel: number;
  riskAppetite: number;
  pastDecisions?: string[];
}

export interface ReflectionPayload {
  sessionId: string;
  storyId: string;
  eventType: string;
  decisionId?: string;
  experienceLog: string;
  teachableMoments: string[];
  snapshot: Record<string, unknown>;
  at: string;
}
