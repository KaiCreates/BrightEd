/**
 * BrightEd Stories Engine — Choice → Consequence
 * Rules-driven. Log decisions → resolve → immediate/delayed outcomes.
 * Affects money, reputation, access.
 */

import { emit } from './events';
import type { ConsequenceEffect } from './types';

export type RuleHandler = (ctx: {
  choiceId: string;
  payload: Record<string, unknown>;
  sessionId: string;
  profile: { skills: Record<string, number>; reputation: Record<string, number> };
}) => {
  immediate?: ConsequenceEffect[];
  delayed?: Array<{ delayMinutes: number; ruleId: string; effects: ConsequenceEffect[] }>;
};

const rules = new Map<string, RuleHandler>();

export function registerRule(ruleId: string, handler: RuleHandler): void {
  rules.set(ruleId, handler);
}

export function getRule(ruleId: string): RuleHandler | undefined {
  return rules.get(ruleId);
}

/**
 * Resolve consequences for a choice. Returns immediate effects and delayed schedules.
 */
export function resolveChoice(ctx: {
  choiceId: string;
  payload: Record<string, unknown>;
  sessionId: string;
  profile: { skills: Record<string, number>; reputation: Record<string, number> };
}): {
  immediate: ConsequenceEffect[];
  delayed: Array<{ delayMinutes: number; ruleId: string; effects: ConsequenceEffect[] }>;
} {
  const handler = rules.get(ctx.choiceId) ?? rules.get('default');
  const result = handler
    ? handler(ctx)
    : { immediate: [], delayed: [] };
  const immediate = result.immediate ?? [];
  const delayed = result.delayed ?? [];
  emit('decision', {
    choiceId: ctx.choiceId,
    sessionId: ctx.sessionId,
    immediateCount: immediate.length,
    delayedCount: delayed.length,
  });
  return { immediate, delayed };
}
