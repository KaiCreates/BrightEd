/**
 * Client-Side Cache Manager
 * Manages localStorage caching with TTL and automatic invalidation
 */

export const CACHE_KEYS = {
  USER_PROGRESS: 'user_progress',
  LEARNING_PATH: 'learning_path',
  NABLE_STATE: 'nable_state',
  LEADERBOARD: 'leaderboard',
  QUESTIONS: 'questions',
  BUSINESS_STATE: 'business_state',
  OBJECTIVE_IDS: 'objective_ids'
} as const;

export const CACHE_TTL = {
  USER_PROGRESS: 5 * 60 * 1000, // 5 minutes
  LEARNING_PATH: 60 * 60 * 1000, // 1 hour
  NABLE_STATE: 2 * 60 * 1000, // 2 minutes
  LEADERBOARD: 15 * 60 * 1000, // 15 minutes
  QUESTIONS: 10 * 60 * 1000, // 10 minutes
  BUSINESS_STATE: 30 * 1000, // 30 seconds
  OBJECTIVE_IDS: 24 * 60 * 60 * 1000 // 24 hours
} as const;

interface CacheItem<T> {
  data: T;
  timestamp: number;
  ttl: number;
  version?: string;
}

export class CacheManager {
  private static readonly VERSION = '1.0.0';

  /**
   * Set a cache item with optional TTL
   */
  static set<T>(key: string, data: T, ttl?: number): void {
    if (typeof window === 'undefined') return;

    const item: CacheItem<T> = {
      data,
      timestamp: Date.now(),
      ttl: ttl || CACHE_TTL[key as keyof typeof CACHE_TTL] || 5 * 60 * 1000,
      version: this.VERSION
    };

    try {
      localStorage.setItem(key, JSON.stringify(item));
    } catch (error) {
      // Handle quota exceeded
      console.warn('Cache storage full, clearing old items:', error);
      this.clearExpired();

      try {
        localStorage.setItem(key, JSON.stringify(item));
      } catch {
        console.error('Failed to cache item after cleanup');
      }
    }
  }

  /**
   * Get a cache item if it exists and hasn't expired
   */
  static get<T>(key: string): T | null {
    if (typeof window === 'undefined') return null;

    const item = localStorage.getItem(key);
    if (!item) return null;

    try {
      const parsed: CacheItem<T> = JSON.parse(item);

      // Check version compatibility
      if (parsed.version !== this.VERSION) {
        localStorage.removeItem(key);
        return null;
      }

      // Check expiration
      const age = Date.now() - parsed.timestamp;
      if (age > parsed.ttl) {
        localStorage.removeItem(key);
        return null;
      }

      return parsed.data;
    } catch (error) {
      console.warn('Failed to parse cache item:', error);
      localStorage.removeItem(key);
      return null;
    }
  }

  /**
   * Invalidate a specific cache key
   */
  static invalidate(key: string): void {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(key);
  }

  /**
   * Invalidate multiple cache keys
   */
  static invalidateMultiple(keys: string[]): void {
    if (typeof window === 'undefined') return;
    keys.forEach(key => localStorage.removeItem(key));
  }

  /**
   * Clear all expired cache items
   */
  static clearExpired(): void {
    if (typeof window === 'undefined') return;

    const keys = Object.keys(localStorage);
    keys.forEach(key => {
      try {
        const item = localStorage.getItem(key);
        if (!item) return;

        const parsed: CacheItem<unknown> = JSON.parse(item);
        const age = Date.now() - parsed.timestamp;

        if (age > parsed.ttl) {
          localStorage.removeItem(key);
        }
      } catch {
        // Invalid item, remove it
        localStorage.removeItem(key);
      }
    });

  }

  /**
   * Clear all cache items
   */
  static clearAll(): void {
    if (typeof window === 'undefined') return;

    const keys = Object.values(CACHE_KEYS);
    keys.forEach(key => localStorage.removeItem(key));

  }

  /**
   * Get cache statistics
   */
  static getStats(): {
    totalItems: number;
    totalSize: number;
    items: Array<{ key: string; size: number; age: number; expired: boolean }>;
  } {
    if (typeof window === 'undefined') {
      return { totalItems: 0, totalSize: 0, items: [] };
    }

    const keys = Object.keys(localStorage);
    let totalSize = 0;
    const items: Array<{ key: string; size: number; age: number; expired: boolean }> = [];

    keys.forEach(key => {
      const item = localStorage.getItem(key);
      if (!item) return;

      const size = new Blob([item]).size;
      totalSize += size;

      try {
        const parsed: CacheItem<unknown> = JSON.parse(item);
        const age = Date.now() - parsed.timestamp;
        const expired = age > parsed.ttl;

        items.push({ key, size, age, expired });
      } catch {
        items.push({ key, size, age: 0, expired: true });
      }
    });

    return {
      totalItems: items.length,
      totalSize,
      items: items.sort((a, b) => b.size - a.size)
    };
  }

  /**
   * Check if cache is available
   */
  static isAvailable(): boolean {
    if (typeof window === 'undefined') return false;

    try {
      const test = '__cache_test__';
      localStorage.setItem(test, test);
      localStorage.removeItem(test);
      return true;
    } catch {
      return false;
    }
  }
}

// Auto-cleanup expired items on page load
if (typeof window !== 'undefined') {
  // Run cleanup after 2 seconds to not block initial load
  setTimeout(() => {
    CacheManager.clearExpired();
  }, 2000);

  // Run cleanup every 5 minutes
  setInterval(() => {
    CacheManager.clearExpired();
  }, 5 * 60 * 1000);
}
