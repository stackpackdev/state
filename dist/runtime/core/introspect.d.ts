import type { Store, StoreRegistry, StoreDependencies } from './types.js';
export interface StoreIntrospection {
    name: string;
    /** Current state value */
    state: unknown;
    /** All when condition names and current values */
    when: Record<string, boolean>;
    /** All gate condition names and current values */
    gates: Record<string, boolean>;
    /** All computed value names and current values */
    computed: Record<string, unknown>;
    /** Dependency metadata */
    dependencies: StoreDependencies;
    /** Number of actions in history */
    historyLength: number;
    /** Current mode name if store uses a discriminated union schema */
    currentMode?: string;
    /** All available mode names */
    modes?: string[];
    /** Valid transition targets from the current mode */
    validTransitions?: string[];
    /** Effect names and their current status */
    effects?: Record<string, string>;
    /** Available selector paths from the auto-generated tree */
    selectorPaths?: string[];
    /** Property invariant names and current check results */
    properties?: Record<string, boolean>;
    /** Whether undo is enabled */
    undoEnabled?: boolean;
    /** Number of undoable actions */
    undoDepth?: number;
    /** Whether redo is available */
    canRedo?: boolean;
    /** Event names this store publishes */
    publishes?: string[];
    /** Event names this store subscribes to */
    subscribes?: string[];
}
export interface SystemIntrospection {
    stores: Record<string, StoreIntrospection>;
    storeNames: string[];
    storeCount: number;
}
/**
 * Introspect a single store, returning its current runtime state,
 * conditions, computed values, and dependency metadata.
 */
export declare function introspectStore(store: Store): StoreIntrospection;
/**
 * Introspect the entire state system via the store registry,
 * returning a structured description of all registered stores.
 */
export declare function introspectSystem(registry: StoreRegistry): SystemIntrospection;
//# sourceMappingURL=introspect.d.ts.map