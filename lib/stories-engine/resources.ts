/**
 * BrightEd Stories Engine — Resource management
 * B-Coins, inventory, opportunity cost, maintenance, risk.
 * Resources feel tight, especially early-game.
 */

import type { PlayerResources, InventoryMap } from './types';

export function applyResourceDelta(
  current: PlayerResources,
  effects: Array<{ system: string; key: string; delta: number }>
): PlayerResources {
  const next = { ...current, inventory: { ...current.inventory } };
  for (const e of effects) {
    if (e.system !== 'resources') continue;
    if (e.key === 'bCoins') next.bCoins = Math.max(0, next.bCoins + e.delta);
    if (e.key === 'timeUnits') next.timeUnits = Math.max(0, next.timeUnits + e.delta);
    if (e.key === 'energy') next.energy = Math.max(0, Math.min(100, next.energy + e.delta));
    if (e.key.startsWith('inventory.')) {
      const itemId = e.key.replace('inventory.', '');
      const v = (next.inventory[itemId] ?? 0) + e.delta;
      if (v <= 0) delete next.inventory[itemId];
      else next.inventory[itemId] = v;
    }
  }
  return next;
}

export function canAfford(resources: PlayerResources, cost: { bCoins?: number; timeUnits?: number }): boolean {
  if (cost.bCoins != null && resources.bCoins < cost.bCoins) return false;
  if (cost.timeUnits != null && resources.timeUnits < cost.timeUnits) return false;
  return true;
}

export function deduct(
  resources: PlayerResources,
  cost: { bCoins?: number; timeUnits?: number }
): PlayerResources {
  const next = { ...resources, inventory: { ...resources.inventory } };
  if (cost.bCoins != null) next.bCoins = Math.max(0, next.bCoins - cost.bCoins);
  if (cost.timeUnits != null) next.timeUnits = Math.max(0, next.timeUnits - cost.timeUnits);
  return next;
}

export function mergeInventory(a: InventoryMap, b: InventoryMap): InventoryMap {
  const out = { ...a };
  for (const [k, v] of Object.entries(b)) {
    out[k] = (out[k] ?? 0) + v;
  }
  return out;
}
