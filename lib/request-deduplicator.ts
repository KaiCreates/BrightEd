/**
 * Request Deduplicator
 * Prevents duplicate concurrent requests for the same resource.
 * When multiple components request the same data simultaneously,
 * only one actual request is made and all callers receive the same result.
 */

const pendingRequests = new Map<string, Promise<any>>();

/**
 * Execute a fetch operation with deduplication.
 * If an identical request is already in flight, returns the existing promise.
 * 
 * @param key - Unique identifier for the request (e.g., 'learning-path-userId')
 * @param fetcher - Async function that performs the actual fetch
 * @returns Promise resolving to the fetch result
 * 
 * @example
 * const data = await deduplicatedFetch(
 *   `learning-path-${userId}`,
 *   () => fetch('/api/learning-path').then(r => r.json())
 * );
 */
export async function deduplicatedFetch<T>(
    key: string,
    fetcher: () => Promise<T>
): Promise<T> {
    // If request is already in flight, return existing promise
    if (pendingRequests.has(key)) {
        return pendingRequests.get(key)! as Promise<T>;
    }

    // Start new request and track it
    const promise = fetcher().finally(() => {
        // Clean up after request completes (success or failure)
        pendingRequests.delete(key);
    });

    pendingRequests.set(key, promise);
    return promise;
}

/**
 * Check if a request is currently pending
 * @param key - The request key to check
 */
export function isRequestPending(key: string): boolean {
    return pendingRequests.has(key);
}

/**
 * Get the number of pending requests
 * Useful for debugging and monitoring
 */
export function getPendingRequestCount(): number {
    return pendingRequests.size;
}

/**
 * Clear all pending requests
 * Use with caution - mainly for testing or cleanup
 */
export function clearPendingRequests(): void {
    pendingRequests.clear();
}
