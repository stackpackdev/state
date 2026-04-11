import type { ZodType } from 'zod';
import type { PersistOptions } from './persist.js';
import type { EffectDeclaration } from './effects.js';
import type { PublishCondition, StoreEventHandler } from './pubsub.js';
export type ActorType = 'human' | 'agent' | 'system';
export type ActorStatus = 'idle' | 'thinking' | 'acting' | 'waiting' | 'error';
export interface Actor {
    id: string;
    type: ActorType;
    name: string;
    permissions?: Permission[];
    status?: ActorStatus;
    meta?: Record<string, unknown>;
}
export interface Permission {
    /** Glob patterns for state paths: 'ui.*', 'todos.items', '*' */
    paths: string[];
    actions: PermissionAction[];
}
export type PermissionAction = 'read' | 'write' | 'delete';
export type ActionType = 'SET' | 'SET_FN' | 'RESET' | 'DELETE' | 'FLOW' | (string & {});
export interface Action<T = unknown> {
    id: string;
    type: ActionType;
    /** Dot-path into state, e.g. 'items.0.text' */
    path?: string;
    /** New value for SET actions */
    value?: T;
    /** Mutation function for SET_FN actions (used with Immer produce) */
    fn?: (draft: any) => void;
    /** Who performed this action */
    actor: Actor;
    timestamp: number;
    /** Extensible metadata */
    meta?: Record<string, unknown>;
}
export interface StoreOptions<T = any> {
    name: string;
    initial: T;
    /** Zod schema for the state shape — validates initial state and mutations */
    stateSchema?: ZodType<T>;
    /** Valid flow states per path — from Flow.js flowDefinition */
    schema?: FlowSchema;
    /** When conditions — style-edge predicates (no tree mutation, just re-render) */
    when?: Record<string, (state: T) => boolean>;
    /** Gate conditions — mount-edge predicates (controls component mounting/unmounting) */
    gates?: Record<string, (state: T) => boolean>;
    /** Computed/derived values — memoized functions of state */
    computed?: Record<string, (state: T) => unknown>;
    /** Validation rules — from Data.js validation pipeline */
    validate?: Record<string, (value: any, state?: T) => boolean>;
    /** Middleware pipeline — from walk.js visitor enter/leave pattern */
    middleware?: Middleware[];
    /** Max actions in history — from Flow.js MAX_ACTIONS = 10000 */
    historyLimit?: number;
    /** Batch delay in ms — from Flow.js 25ms buffer. 0 = off */
    batchMs?: number;
    /** Format transforms — from Data.js formatIn/formatOut */
    transforms?: Record<string, Transform>;
    /** Store dependency metadata — inferred by the agent designer */
    dependencies?: StoreDependencies;
    /** Invariant properties checked after every mutation.
     *  Return true if the property holds, false if violated. */
    properties?: Record<string, (state: T) => boolean>;
    /** Declared transitions for mode-based stores. Keys: "from -> to", values: transition names. */
    transitions?: Record<string, string>;
    /** @deprecated Use stateSchema (Zod) instead. Path schema for deterministic traversal. */
    pathSchema?: StorePathSchema;
    /** Persistence configuration */
    persist?: PersistOptions<T>;
    /** Effect declarations — reactive side effects triggered by state changes */
    effects?: Record<string, EffectDeclaration<T>>;
    /** Undo configuration. If provided, snapshots are stored for undo/redo. */
    undo?: {
        limit: number;
    };
    /** Pub/Sub: events this store publishes (condition checked on every state change) */
    publishes?: Record<string, PublishCondition<T>>;
    /** Pub/Sub: events this store subscribes to (format: "storeName.eventName") */
    subscribes?: Record<string, StoreEventHandler>;
}
export interface Store<T = any> {
    readonly name: string;
    getState(): T;
    /** Path-based read — from Data.js lodash get pattern */
    get<V = unknown>(path?: string): V;
    /** Path-based write — actor optional (falls back to default human actor). Pass { skipUndo: true } to exclude from undo history. */
    set(path: string, value: unknown, actor?: Actor, options?: {
        skipUndo?: boolean;
    }): void;
    /** Immer mutation — actor optional (falls back to default human actor). Pass { skipUndo: true } to exclude from undo history. */
    update(fn: (draft: T) => void, actor?: Actor, options?: {
        skipUndo?: boolean;
    }): void;
    /** Reset to new value — actor optional (falls back to default human actor) */
    reset(value: T, actor?: Actor): void;
    /** Delete a path from state — actor optional (falls back to default human actor) */
    delete(path: string, actor?: Actor): void;
    /** Subscribe to changes — from Data.js listener system */
    subscribe(listener: Listener<T>, path?: string): Unsubscribe;
    /** Check flow state — from Flow.js has() pattern */
    has(path: string): boolean;
    /** Get action history — from Flow.js action history */
    getHistory(): Action[];
    /** Evaluate when conditions (style-edge: no tree mutation) */
    getWhen(): Record<string, boolean>;
    /** Evaluate a single when condition */
    isWhen(name: string): boolean;
    /** Evaluate gate conditions (mount-edge: controls component mounting) */
    getGates(): Record<string, boolean>;
    /** Evaluate a single gate condition */
    isGated(name: string): boolean;
    /** Get a computed value by name */
    computed<V = unknown>(name: string): V;
    /** Get all computed values */
    getComputed(): Record<string, unknown>;
    /** Get store dependency metadata for agent traversal */
    getDependencies(): StoreDependencies;
    /** Get the Zod schema for this store's state */
    getSchema(): ZodType<T> | undefined;
    /** @deprecated Use getSchema() instead. Get path schema for deterministic traversal. */
    getPathSchema(): StorePathSchema | undefined;
    /** Get property check results */
    getProperties(): Record<string, boolean>;
    /** Check if a mode transition is valid (only for stores with transitions) */
    canTransition?(from: string, to: string): boolean;
    /** Get valid transition targets from current/given mode */
    validTargets?(from?: string): string[];
    /** Auto-generated selector tree from schema (available when stateSchema is a ZodObject) */
    readonly select?: any;
    /** Apply a mutation optimistically, then commit or rollback */
    optimistic(options: import('./optimistic.js').OptimisticOptions<T>): Promise<import('./optimistic.js').OptimisticResult>;
    /** Undo the last N actions. Returns the number actually undone. */
    undo(count?: number, actor?: Actor): number;
    /** Redo the last N undone actions. Returns the number actually redone. */
    redo(count?: number, actor?: Actor): number;
    /** Check if undo is available */
    canUndo(): boolean;
    /** Check if redo is available */
    canRedo(): boolean;
    /** Clear undo and redo stacks. Use after system initialization to prevent undo from reverting past startup state. */
    clearUndoStack(): void;
    /** Clean up store */
    destroy(): void;
}
export type Listener<T = any> = (nextValue: T, prevValue: T, meta: ListenerMeta) => void;
export interface ListenerMeta {
    action: Action;
    has: (path: string) => boolean;
}
export type Unsubscribe = () => void;
export interface Middleware {
    name: string;
    /** Called before action is applied. Return null to cancel, or modified action. */
    enter?: (action: Action, state: any) => Action | null;
    /** Called after action is applied. For side effects, logging, sync. */
    leave?: (action: Action, prevState: any, nextState: any) => void;
}
export interface FlowSchema {
    /** Valid states per path: { '/checkout': ['Cart', 'Shipping', 'Payment'] } */
    [path: string]: string[];
}
export interface FlowState {
    /** Current state per path: { '/checkout': 'Cart' } */
    [path: string]: string;
}
export type FlowMode = 'separate' | 'together';
export interface FlowOptions {
    name: string;
    /** 'separate' = one child active at a time (route-like), 'together' = all render, gated by conditions */
    mode?: FlowMode;
    states: string[];
    initial: string;
    /** Nested sub-flows for tree-addressable state machines */
    children?: Record<string, FlowOptions>;
}
export interface Flow {
    readonly name: string;
    /** Flow mode: 'separate' (one active) or 'together' (all render, gated) */
    readonly mode: FlowMode;
    /** Current active state */
    current(): string;
    /** Navigate to a state — supports path-based addressing: go('/Dashboard/Settings', actor) */
    go(state: string, actor: Actor): void;
    /** Check if a state is active — from Flow.js has() */
    has(state: string): boolean;
    /** Get all valid states */
    states(): string[];
    /** Resolve a child flow by path */
    resolve(path: string): Flow | undefined;
    /** Get the full active chain: ['app/Dashboard', 'dashboard/Settings'] */
    activeChain(): string[];
    /** Get all child flows */
    children(): Record<string, Flow>;
    /** Subscribe to flow changes */
    subscribe(listener: (current: string, prev: string, actor: Actor) => void): Unsubscribe;
    /** Get transition history */
    getHistory(): Array<{
        from: string;
        to: string;
        actor: Actor;
        timestamp: number;
    }>;
}
export interface Transform<In = any, Out = any> {
    /** Transform value on read (formatIn) */
    read?: (value: In, state: any) => Out;
    /** Transform value on write (formatOut) */
    write?: (value: Out, state: any) => In;
}
export interface TogetherOptions {
    name: string;
    stores: Record<string, Store>;
    flow?: Flow;
}
export interface Together {
    readonly name: string;
    readonly stores: Record<string, Store>;
    readonly flow?: Flow;
    /** Get a store by key */
    store<T = any>(key: string): Store<T>;
    /** Destroy all stores in the group */
    destroy(): void;
}
export interface OptimisticUpdate {
    id: string;
    actor: Actor;
    /** State snapshot before the optimistic write */
    snapshot: unknown;
    /** Actions applied optimistically */
    actions: Action[];
    status: 'pending' | 'confirmed' | 'rolled-back';
}
export interface StoreRegistry {
    get<T = any>(name: string): Store<T> | undefined;
    getAll(): Map<string, Store>;
    has(name: string): boolean;
    register(store: Store): void;
    unregister(name: string): void;
    clear(): void;
    /** Get the full impact of changing a store — returns all affected store names */
    impactOf(storeName: string): ImpactAnalysis;
    /** Return a structured description of the entire state system */
    introspect(): import('./introspect.js').SystemIntrospection;
}
export interface StoreDependencies {
    /** Stores this store reads data from (data dependency) */
    reads: string[];
    /** Stores whose gates control whether this store's components mount */
    gatedBy: string[];
    /** Stores that should refresh/invalidate when this store changes */
    triggers: string[];
}
export interface ImpactAnalysis {
    /** Stores that will re-render (read this store's data) */
    readers: string[];
    /** Stores whose components will mount/unmount (gated by this store) */
    gatedStores: string[];
    /** Stores that will be triggered to refresh */
    triggered: string[];
    /** Full transitive closure of all affected stores */
    allAffected: string[];
}
export type PathSchemaType = 'string' | 'number' | 'boolean' | 'object' | 'array' | 'enum' | 'union' | 'null' | 'any';
export interface PathSchemaEntry {
    type: PathSchemaType;
    /** For arrays: the type of items */
    itemType?: string;
    /** For objects: field names */
    fields?: string[];
    /** For enums: valid values */
    values?: string[];
    /** For unions: member types */
    members?: string[];
    /** Whether this path can be null */
    nullable?: boolean;
    /** Validation rule as a string expression */
    validation?: string;
}
/** Map of dot-paths to their schema entries. Use '*' for array indices. */
export type StorePathSchema = Record<string, PathSchemaEntry>;
export type PresencePhase = 'entering' | 'present' | 'leaving';
export interface PresenceRecord<T = any> {
    /** Stable identity key */
    key: string;
    /** The actual data value (frozen at leave time for leaving items) */
    value: T;
    /** Current lifecycle phase */
    phase: PresencePhase;
    /** Timestamp when this phase started (ms) */
    at: number;
}
//# sourceMappingURL=types.d.ts.map