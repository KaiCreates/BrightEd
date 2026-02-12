/**
 * BrightEd Stories Engine — Reflection checkpoints
 * Post-major-event logs, teachable moments.
 * Export structured data to Whiteboard. Never mid-action.
 */

import type { ReflectionPayload } from './types';

/**
 * Build a reflection payload for export to Whiteboard.
 */
export function buildReflection(p: {
  sessionId: string;
  storyId: string;
  eventType: string;
  decisionId?: string;
  experienceLog: string;
  teachableMoments: string[];
  snapshot: Record<string, unknown>;
}): ReflectionPayload {
  return {
    ...p,
    at: new Date().toISOString(),
  };
}

/**
 * Whiteboard export hook. In Phase 1, we persist locally;
 * later this can POST to a Whiteboard API or store in shared DB.
 */
export function exportToWhiteboard(_: ReflectionPayload): void {
  // TODO: POST /api/whiteboard/reflection or equivalent
  // For now, payload is returned to client; UI can send to Whiteboard if integrated.
}
