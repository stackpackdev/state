import type { FetchState, FetcherOptions } from '../core/fetch.js';
export interface UseFetchOptions<T = unknown> extends Omit<FetcherOptions<T>, 'name'> {
    /** Unique key for this fetch — used for deduplication and caching */
    key: string;
    /** Fetch automatically on mount. Default: true */
    auto?: boolean;
}
export interface UseFetchResult<T = unknown> {
    data: T | null;
    error: Error | null;
    isLoading: boolean;
    isStale: boolean;
    status: FetchState<T>['status'];
    /** Trigger a fetch (uses cache if valid) */
    fetch: () => Promise<T | undefined>;
    /** Force refetch (ignores cache) */
    refetch: () => Promise<T | undefined>;
    /** Invalidate cache */
    invalidate: () => void;
}
export declare function useFetch<T = unknown>(options: UseFetchOptions<T>): UseFetchResult<T>;
/** Clear all cached fetchers — useful in tests */
export declare function clearFetcherRegistry(): void;
//# sourceMappingURL=use-fetch.d.ts.map