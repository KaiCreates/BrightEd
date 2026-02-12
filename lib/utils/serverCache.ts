/**
 * Simple in-memory server-side cache for Next.js API routes.
 * In a production environment, this should be replaced with Redis.
 */

interface CacheEntry<T> {
    data: T;
    expiresAt: number;
}

const cache = new Map<string, CacheEntry<unknown>>();

const MAX_CACHE_SIZE = 1000;
const CLEANUP_INTERVAL = 5 * 60 * 1000; // 5 minutes
let lastCleanup = Date.now();

function cleanup() {
    const now = Date.now();
    if (now - lastCleanup < CLEANUP_INTERVAL) return;
    lastCleanup = now;

    for (const [key, entry] of cache.entries()) {
        if (now > entry.expiresAt) {
            cache.delete(key);
        }
    }

    // If still over size, clear oldest entries
    if (cache.size > MAX_CACHE_SIZE) {
        const keysToRemove = Array.from(cache.keys()).slice(0, cache.size - MAX_CACHE_SIZE);
        keysToRemove.forEach(key => cache.delete(key));
    }
}

export const serverCache = {
    set<T>(key: string, data: T, ttlMs: number = 60000): void {
        cleanup();
        cache.set(key, {
            data,
            expiresAt: Date.now() + ttlMs,
        });
    },

    get<T>(key: string): T | null {
        cleanup();
        const entry = cache.get(key);
        if (!entry) return null;

        if (Date.now() > entry.expiresAt) {
            cache.delete(key);
            return null;
        }

        return entry.data as T;
    },

    delete(key: string): void {
        cache.delete(key);
    },

    clear(): void {
        cache.clear();
    }
};
