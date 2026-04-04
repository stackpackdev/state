import type { ZodType } from 'zod';
import type { Middleware } from './types.js';
export interface PersistOptions<T = any> {
    /** Storage key */
    key: string;
    /** Storage adapter. Default: in-memory (for Node.js/testing) */
    storage?: StorageAdapter;
    /** Only persist these paths (default: entire state) */
    paths?: string[];
    /** Schema version for migrations */
    version?: number;
    /** Migration function: receives persisted data and stored version, returns migrated state */
    migrate?: (persisted: unknown, version: number) => T;
    /** Debounce writes in ms. Default: 100 */
    debounceMs?: number;
}
export interface StorageAdapter {
    getItem(key: string): string | null;
    setItem(key: string, value: string): void;
    removeItem(key: string): void;
}
/** In-memory storage adapter for testing and Node.js environments */
export declare function createMemoryStorage(): StorageAdapter;
/** Create persist middleware + hydration function */
export declare function createPersistMiddleware<T>(options: PersistOptions<T>, schema?: ZodType<T>): {
    middleware: Middleware;
    hydrate: () => T | undefined;
};
//# sourceMappingURL=persist.d.ts.map