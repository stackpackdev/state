import type { Actor, Store } from './types.js';
export interface OptimisticOptions<T = any> {
    /** Immediately apply this mutation */
    apply: (draft: T) => void;
    /** The async operation to confirm the optimistic update */
    commit: () => Promise<unknown>;
    /** Optional: reconcile server response with optimistic state */
    reconcile?: (draft: T, response: unknown) => void;
    /** Actor performing this operation */
    actor: Actor;
}
export interface OptimisticResult {
    success: boolean;
    error?: Error;
}
export interface OptimisticQueue<T = any> {
    enqueue(store: Store<T>, options: OptimisticOptions<T>): Promise<OptimisticResult>;
    pending(): number;
    hasPending(): boolean;
}
export declare function createOptimisticQueue<T = any>(): OptimisticQueue<T>;
//# sourceMappingURL=optimistic.d.ts.map