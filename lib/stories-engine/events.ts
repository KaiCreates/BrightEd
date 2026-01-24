/**
 * BrightEd Stories Engine — Event bus
 * Internal event-driven flow: decisions, time ticks, consequences, NPC reactions.
 */

export type StoriesEventType =
  | 'decision'
  | 'consequence_immediate'
  | 'consequence_delayed'
  | 'time_tick'
  | 'npc_reaction'
  | 'reflection_checkpoint';

export interface StoriesEvent {
  type: StoriesEventType;
  payload: Record<string, unknown>;
  at: number;
}

type Listener = (event: StoriesEvent) => void | Promise<void>;

const listeners = new Map<StoriesEventType, Set<Listener>>();

export function subscribe(type: StoriesEventType, fn: Listener): () => void {
  if (!listeners.has(type)) listeners.set(type, new Set());
  listeners.get(type)!.add(fn);
  return () => listeners.get(type)?.delete(fn);
}

export function emit(type: StoriesEventType, payload: Record<string, unknown>): void {
  const ev: StoriesEvent = { type, payload, at: Date.now() };
  listeners.get(type)?.forEach((fn) => {
    try {
      const r = fn(ev);
      if (r && typeof (r as Promise<unknown>).then === 'function') {
        (r as Promise<unknown>).catch((e) => console.error('[StoriesEngine] listener error', e));
      }
    } catch (e) {
      console.error('[StoriesEngine] listener error', e);
    }
  });
}

export function emitAsync(type: StoriesEventType, payload: Record<string, unknown>): Promise<void> {
  const ev: StoriesEvent = { type, payload, at: Date.now() };
  const fns = Array.from(listeners.get(type) ?? []);
  return Promise.all(
    fns.map((fn) =>
      Promise.resolve(fn(ev)).catch((e) => console.error('[StoriesEngine] listener error', e))
    )
  ).then(() => undefined);
}
