import type { Action } from './types.js';
export interface Batcher {
    /** Queue an action for batched execution. Key deduplicates (latest wins). */
    queue(key: string, action: Action): void;
    /** Immediately flush all queued actions */
    flush(): void;
    /** Cancel all queued actions */
    cancel(): void;
    /** Number of currently queued actions */
    readonly pending: number;
}
export declare function createBatcher(applyFn: (actions: Action[]) => void, ms?: number): Batcher;
//# sourceMappingURL=batch.d.ts.map