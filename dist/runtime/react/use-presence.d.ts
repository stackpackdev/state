import type { PresencePhase, PresenceRecord } from '../core/types.js';
export interface UsePresenceOptions {
    /**
     * Leave timeout in ms. After this duration, the element is auto-removed.
     * Set 0 for manual-only removal (must call done()).
     * Default: 300
     */
    timeout?: number;
}
export interface UsePresenceResult {
    /** Whether the element should be in the DOM (true during entering, present, AND leaving) */
    isPresent: boolean;
    /** Current phase, or null if fully removed */
    phase: PresencePhase | null;
    /** Call to signal leave animation is complete */
    done: () => void;
    /** Call to signal enter animation is complete */
    entered: () => void;
    /**
     * Ref callback — attach to DOM element for automatic CSS transitionend detection.
     * When a transitionend event fires during the 'leaving' phase, done() is called automatically.
     * Optional: ignore this if you prefer manual done() or timeout-based removal.
     */
    ref: React.RefCallback<HTMLElement>;
}
export declare function usePresence(storeName: string, gateName: string, options?: UsePresenceOptions): UsePresenceResult;
export interface UsePresenceListOptions<T = any> {
    /**
     * Leave timeout in ms. Default: 300.
     */
    timeout?: number;
    /**
     * Extract stable key from item.
     * Default: (item) => item.id
     */
    keyFn?: (item: T) => string;
}
export interface UsePresenceListResult<T> {
    /** All items including departing ones, with lifecycle metadata */
    items: PresenceRecord<T>[];
    /** Signal that a specific item's leave animation is done */
    done: (key: string) => void;
    /** Signal that a specific item's enter animation is done */
    entered: (key: string) => void;
    /** Remove all leaving items immediately */
    flush: () => void;
}
export declare function usePresenceList<T = any>(storeName: string, path: string, options?: UsePresenceListOptions<T>): UsePresenceListResult<T>;
//# sourceMappingURL=use-presence.d.ts.map