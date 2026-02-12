/**
 * BrightEd Stories Engine — Phase 1: Business & Financial Literacy
 * Start business, register (delays), cash flow, buy/sell, taxes, loans.
 * Fail realistically. No fantasy.
 */

import { registerRule } from '../consequence-engine';
import { delaySatisfied, delayRemainingMinutes, DEFAULT_TIME_CONFIG } from '../time';
import type { BusinessSimState, StoryConfig } from '../types';

export const BUSINESS_STORY_SLUG = 'business-financial-literacy';

export const INITIAL_BUSINESS_STATE: BusinessSimState = {
  registrationStatus: 'none',
  cashBalance: 500,
  inventory: {},
  loans: [],
  taxObligations: [],
  marketExposure: 0,
  lastMarketUpdate: new Date().toISOString(),
};

// ----- Rules -----

registerRule('business_register', (ctx) => {
  return {
    immediate: [],
    delayed: [
      {
        delayMinutes: (ctx.payload.delayMinutes as number) ?? DEFAULT_TIME_CONFIG.registrationDelayMinutes,
        ruleId: 'business_registration_approved',
        effects: [{ system: 'state', key: 'registrationStatus', delta: 1 }],
      },
    ],
  };
});

registerRule('business_underpay_staff', () => ({
  immediate: [
    { system: 'resources', key: 'bCoins', delta: 20 },
  ],
  delayed: [
    {
      delayMinutes: 3,
      ruleId: 'morale_drop_productivity',
      effects: [
        { system: 'resources', key: 'bCoins', delta: -50 },
      ],
    },
  ],
}));

registerRule('business_ignore_taxes', () => ({
  immediate: [],
  delayed: [
    {
      delayMinutes: 5,
      ruleId: 'audit_risk',
      effects: [
        { system: 'resources', key: 'bCoins', delta: -100 },
        { system: 'reputation', key: 'regulator', delta: -20 },
      ],
    },
  ],
}));

registerRule('business_take_loan', (ctx) => {
  const principal = (ctx.payload.principal as number) ?? 200;
  const _rate = 0.05;
  return {
    immediate: [{ system: 'resources', key: 'bCoins', delta: principal }],
    delayed: [],
  };
});

registerRule('default', () => ({ immediate: [], delayed: [] }));

// ----- Helpers -----

export function tickRegistration(
  state: BusinessSimState,
  config: StoryConfig,
  now: Date = new Date()
): BusinessSimState {
  if (state.registrationStatus !== 'pending' || !state.registrationSubmittedAt) return state;
  const delay = config.registrationDelayMinutes ?? DEFAULT_TIME_CONFIG.registrationDelayMinutes;
  if (!delaySatisfied(new Date(state.registrationSubmittedAt), delay, now)) return state;
  return {
    ...state,
    registrationStatus: 'approved',
  };
}

export function registrationRemainingMinutes(
  state: BusinessSimState,
  config: StoryConfig,
  now: Date = new Date()
): number | null {
  if (state.registrationStatus !== 'pending' || !state.registrationSubmittedAt) return null;
  const delay = config.registrationDelayMinutes ?? DEFAULT_TIME_CONFIG.registrationDelayMinutes;
  return delayRemainingMinutes(new Date(state.registrationSubmittedAt), delay, now);
}

export function marketFluctuation(exposure: number): number {
  const drift = (Math.random() - 0.48) * 0.1;
  return Math.round(exposure * drift);
}

export function simpleTax(profit: number, rate: number = 0.15): number {
  return Math.max(0, Math.round(profit * rate));
}
