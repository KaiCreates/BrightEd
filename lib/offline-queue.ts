/**
 * Offline Queue with IndexedDB
 * Queues failed write operations for retry when the device comes back online.
 * Uses IndexedDB for persistence across browser sessions.
 */

// IndexedDB schema types
interface PendingWrite {
    id: string;
    endpoint: string;
    method: 'POST' | 'PUT' | 'PATCH' | 'DELETE';
    data: any;
    timestamp: number;
    retries: number;
    maxRetries: number;
}

interface OfflineQueueDB {
    pendingWrites: PendingWrite[];
}

const DB_NAME = 'brighted-offline';
const DB_VERSION = 1;
const STORE_NAME = 'pending-writes';

class OfflineQueueClass {
    private db: IDBDatabase | null = null;
    private isInitialized = false;
    private initPromise: Promise<void> | null = null;

    /**
     * Initialize the IndexedDB database
     */
    async init(): Promise<void> {
        if (this.isInitialized) return;
        if (this.initPromise) return this.initPromise;

        if (typeof window === 'undefined' || !('indexedDB' in window)) {
            console.warn('IndexedDB not available');
            return;
        }

        this.initPromise = new Promise<void>((resolve, reject) => {
            const request = indexedDB.open(DB_NAME, DB_VERSION);

            request.onerror = () => {
                console.error('Failed to open offline queue database');
                reject(request.error);
            };

            request.onsuccess = () => {
                this.db = request.result;
                this.isInitialized = true;
                resolve();
            };

            request.onupgradeneeded = (event) => {
                const db = (event.target as IDBOpenDBRequest).result;

                if (!db.objectStoreNames.contains(STORE_NAME)) {
                    const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
                    store.createIndex('timestamp', 'timestamp', { unique: false });
                    store.createIndex('endpoint', 'endpoint', { unique: false });
                }
            };
        });

        return this.initPromise;
    }

    /**
     * Add a write operation to the queue
     */
    async enqueue(
        endpoint: string,
        data: any,
        method: 'POST' | 'PUT' | 'PATCH' | 'DELETE' = 'POST',
        maxRetries: number = 5
    ): Promise<string> {
        await this.init();

        if (!this.db) {
            throw new Error('Database not initialized');
        }

        const id = `${endpoint}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

        const pendingWrite: PendingWrite = {
            id,
            endpoint,
            method,
            data,
            timestamp: Date.now(),
            retries: 0,
            maxRetries
        };

        return new Promise((resolve, reject) => {
            const transaction = this.db!.transaction(STORE_NAME, 'readwrite');
            const store = transaction.objectStore(STORE_NAME);
            const request = store.put(pendingWrite);

            request.onsuccess = () => {
                // Try to sync immediately if online
                if (navigator.onLine) {
                    this.sync().catch(console.error);
                }
                resolve(id);
            };

            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Attempt to sync all pending writes
     */
    async sync(): Promise<{ success: number; failed: number }> {
        await this.init();

        if (!this.db) {
            return { success: 0, failed: 0 };
        }

        const pending = await this.getAll();
        let success = 0;
        let failed = 0;

        for (const item of pending) {
            try {
                const response = await fetch(item.endpoint, {
                    method: item.method,
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(item.data)
                });

                if (response.ok) {
                    await this.remove(item.id);
                    success++;
                } else {
                    await this.incrementRetry(item);
                    failed++;
                }
            } catch (error) {
                await this.incrementRetry(item);
                failed++;
            }
        }

        return { success, failed };
    }

    /**
     * Get all pending writes
     */
    async getAll(): Promise<PendingWrite[]> {
        await this.init();

        if (!this.db) {
            return [];
        }

        return new Promise((resolve, reject) => {
            const transaction = this.db!.transaction(STORE_NAME, 'readonly');
            const store = transaction.objectStore(STORE_NAME);
            const request = store.getAll();

            request.onsuccess = () => resolve(request.result || []);
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Get the count of pending writes
     */
    async getCount(): Promise<number> {
        await this.init();

        if (!this.db) {
            return 0;
        }

        return new Promise((resolve, reject) => {
            const transaction = this.db!.transaction(STORE_NAME, 'readonly');
            const store = transaction.objectStore(STORE_NAME);
            const request = store.count();

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Remove a completed write from the queue
     */
    private async remove(id: string): Promise<void> {
        if (!this.db) return;

        return new Promise((resolve, reject) => {
            const transaction = this.db!.transaction(STORE_NAME, 'readwrite');
            const store = transaction.objectStore(STORE_NAME);
            const request = store.delete(id);

            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Increment retry count or remove if max retries exceeded
     */
    private async incrementRetry(item: PendingWrite): Promise<void> {
        if (!this.db) return;

        if (item.retries >= item.maxRetries) {
            // Give up after max retries
            await this.remove(item.id);
            console.warn(`Offline queue: Gave up on ${item.endpoint} after ${item.retries} retries`);
            return;
        }

        const updated: PendingWrite = {
            ...item,
            retries: item.retries + 1
        };

        return new Promise((resolve, reject) => {
            const transaction = this.db!.transaction(STORE_NAME, 'readwrite');
            const store = transaction.objectStore(STORE_NAME);
            const request = store.put(updated);

            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Clear all pending writes
     */
    async clear(): Promise<void> {
        await this.init();

        if (!this.db) return;

        return new Promise((resolve, reject) => {
            const transaction = this.db!.transaction(STORE_NAME, 'readwrite');
            const store = transaction.objectStore(STORE_NAME);
            const request = store.clear();

            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }
}

// Singleton instance
export const OfflineQueue = new OfflineQueueClass();

// Auto-initialize and set up sync listeners on client side
if (typeof window !== 'undefined') {
    // Initialize the queue
    OfflineQueue.init().catch(console.error);

    // Sync when coming back online
    window.addEventListener('online', () => {
        console.log('🌐 Back online - syncing pending writes...');
        OfflineQueue.sync()
            .then(({ success, failed }) => {
                if (success > 0) {
                    console.log(`✅ Synced ${success} pending writes`);
                }
                if (failed > 0) {
                    console.warn(`⚠️ ${failed} writes still pending`);
                }
            })
            .catch(console.error);
    });

    // Log when going offline
    window.addEventListener('offline', () => {
        console.log('📴 Went offline - writes will be queued');
    });
}
