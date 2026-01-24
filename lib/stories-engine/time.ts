/**
 * BrightEd Stories Engine — Time system
 * Real + simulated hybrid. Delays (registration, loans, market).
 * Offline progression where appropriate. No free skip.
 */

export const MS_PER_MINUTE = 60_000;

export interface TimeConfig {
  timeMultiplier: number; // real minutes per sim day
  registrationDelayMinutes: number;
  loanApprovalDelayMinutes: number;
}

export const DEFAULT_TIME_CONFIG: TimeConfig = {
  timeMultiplier: 1,
  registrationDelayMinutes: 0.5, // 30 seconds
  loanApprovalDelayMinutes: 5,
};

/**
 * Simulated time elapsed since `lastPlayedAt` (real UTC).
 * Returns sim-days based on timeMultiplier.
 */
export function simulatedDaysElapsed(
  lastPlayedAt: Date,
  now: Date,
  timeMultiplier: number
): number {
  const ms = now.getTime() - lastPlayedAt.getTime();
  const realMinutes = ms / MS_PER_MINUTE;
  return realMinutes / timeMultiplier;
}

/**
 * Check if a delay (e.g. registration, loan approval) has passed.
 */
export function delaySatisfied(
  submittedAt: Date,
  delayMinutes: number,
  now: Date = new Date()
): boolean {
  const ms = now.getTime() - submittedAt.getTime();
  return ms >= delayMinutes * MS_PER_MINUTE;
}

/**
 * Minutes remaining until delay is satisfied.
 */
export function delayRemainingMinutes(
  submittedAt: Date,
  delayMinutes: number,
  now: Date = new Date()
): number {
  const elapsed = (now.getTime() - submittedAt.getTime()) / MS_PER_MINUTE;
  const remaining = delayMinutes - elapsed;
  return Math.max(0, Math.ceil(remaining));
}

/**
 * Wall-clock now as ISO string.
 */
export function nowISO(): string {
  return new Date().toISOString();
}
