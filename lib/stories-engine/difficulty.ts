/**
 * BrightEd Stories Engine — Difficulty scaling
 * Scale by age, past decisions, skill mastery, risk appetite.
 * No easy/hard toggle; system adapts silently.
 */

import type { AgeBracket, DifficultyContext } from './types';

const BRACKET_MULTIPLIER: Record<AgeBracket, number> = {
  junior: 0.7,
  secondary: 1,
  senior: 1.2,
  adult: 1.3,
};

/**
 * Effective difficulty multiplier for a session.
 */
export function difficultyMultiplier(ctx: DifficultyContext): number {
  const base = BRACKET_MULTIPLIER[ctx.ageBracket] ?? 1;
  const skillMod = 1 - (ctx.skillLevel / 100) * 0.3; // higher skill = slightly easier
  const riskMod = 1 + (ctx.riskAppetite / 100) * 0.2; // more risk-taking = slightly harder
  return base * skillMod * riskMod;
}

/**
 * Adjust numeric outcome (cost, delay, etc.) by difficulty.
 */
export function scaleByDifficulty(value: number, ctx: DifficultyContext): number {
  return Math.round(value * difficultyMultiplier(ctx));
}
