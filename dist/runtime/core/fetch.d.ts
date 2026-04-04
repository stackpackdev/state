import type { ZodType } from 'zod';
import type { Actor, Store } from './types.js';
export type FetchStatus = 'idle' | 'loading' | 'success' | 'error';
export interface FetchState<T = unknown> {
    data: T | null;
    error: Error | null;
    status: FetchStatus;
    /** Timestamp of last successful fetch */
    fetchedAt: number | null;
    /** True when data exists but is past its TTL */
    isStale: boolean;
}
export interface FetcherOptions<T = unknown> {
    /** Unique name for this fetcher */
    name: string;
    /** The async function that fetches data */
    fn: () => Promise<T>;
    /** Zod schema to validate the response */
    schema?: ZodType<T>;
    /** Cache TTL in milliseconds. 0 = no cache. Default: 0 */
    cacheTtl?: number;
    /** Actor used for store mutations. Default: system actor named after the fetcher */
    actor?: Actor;
}
export interface Fetcher<T = unknown> {
    readonly name: string;
    /** Current fetch state */
    getState(): FetchState<T>;
    /** Execute the fetch. Returns the data or throws. */
    fetch(): Promise<T>;
    /** Refetch — ignores cache, always hits the network */
    refetch(): Promise<T>;
    /** Invalidate cache without refetching */
    invalidate(): void;
    /** Bind this fetcher to a store — writes fetch state into `storePath` */
    bind(store: Store, storePath?: string): BoundFetcher<T>;
}
export interface BoundFetcher<T = unknown> extends Fetcher<T> {
    /** Unbind from the store */
    unbind(): void;
}
export declare function createInitialFetchState<T>(): FetchState<T>;
export declare function createFetcher<T = unknown>(options: FetcherOptions<T>): Fetcher<T>;
//# sourceMappingURL=fetch.d.ts.map