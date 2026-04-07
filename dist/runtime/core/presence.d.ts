import type { PresenceRecord } from './types.js';
export interface PresenceTrackerOptions {
    /**
     * Default timeout for leaving phase in ms.
     * After this duration, leaving items are auto-removed.
     * Set 0 for manual-only removal (must call done()).
     * Default: 0
     */
    timeout?: number;
    /** Called when a record completes leaving and is fully removed */
    onRemoved?: (key: string) => void;
    /**
     * When true, notifications are coalesced via queueMicrotask.
     * Multiple entered()/done() calls within the same tick produce one notification.
     * Adds ~1 microtask delay. Default: false.
     */
    coalesce?: boolean;
}
export interface PresenceTracker<T> {
    /**
     * Sync the tracker with the current truth from state.
     *
     * Three-way diff:
     * - Items in `next` but not tracked → phase: 'entering'
     * - Items tracked but not in `next` → phase: 'leaving' (starts timeout)
     * - Items in `next` that were 'leaving' → leave cancelled, back to 'entering'
     * - Items in both with phase 'entering' or 'present' → value updated, phase unchanged
     *
     * Returns the full list including departing items, in stable order.
     */
    sync(next: T[], keyFn: (item: T) => string): PresenceRecord<T>[];
    /**
     * Sync with a single boolean (convenience for gate-based presence).
     * Equivalent to sync(active ? [SENTINEL] : [], () => KEY).
     */
    syncBoolean(active: boolean): PresenceRecord<boolean>[];
    /** Signal that an item's enter animation is complete → phase becomes 'present' */
    entered(key: string): void;
    /** Signal that multiple items' enter animations are complete → batch transition to 'present' */
    enteredBatch(keys: string[]): void;
    /** Signal that an item's leave animation is complete → record removed */
    done(key: string): void;
    /** Signal that multiple items' leave animations are complete → batch removal */
    doneBatch(keys: string[]): void;
    /** Remove all leaving items immediately */
    flush(): void;
    /** Current snapshot of all records */
    records(): PresenceRecord<T>[];
    /** Subscribe to changes. Returns unsubscribe function. */
    subscribe(listener: (records: PresenceRecord<T>[]) => void): () => void;
    /** Monotonically increasing counter, incremented on every mutation */
    readonly generation: number;
    /** Destroy: clear all timeouts and listeners */
    destroy(): void;
}
export declare function createPresenceTracker<T = any>(options?: PresenceTrackerOptions): PresenceTracker<T>;
//# sourceMappingURL=presence.d.ts.map