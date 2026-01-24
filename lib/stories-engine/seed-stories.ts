/**
 * Ensure default stories and NPCs exist. Idempotent.
 */

import { ensureDefaultStory } from '@/lib/stories-store';

export async function ensureDefaultStories() {
  await ensureDefaultStory();
}
