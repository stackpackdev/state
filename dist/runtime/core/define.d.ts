import type { ZodType } from 'zod';
import type { z } from 'zod';
import type { Middleware, Store, StoreDependencies } from './types.js';
import type { PersistOptions } from './persist.js';
import type { EffectDeclaration } from './effects.js';
import type { PublishCondition, StoreEventHandler } from './pubsub.js';
import type { SelectorTree } from './selectors.js';
export interface DefineStoreOptions<S extends ZodType> {
    name: string;
    schema: S;
    initial: z.infer<S>;
    when?: Record<string, (state: z.infer<S>) => boolean>;
    gates?: Record<string, (state: z.infer<S>) => boolean>;
    computed?: Record<string, (state: z.infer<S>) => unknown>;
    properties?: Record<string, (state: z.infer<S>) => boolean>;
    middleware?: Middleware[];
    dependencies?: StoreDependencies;
    /** Declared transitions for mode-based stores. Keys: "from -> to", values: transition names. */
    transitions?: Record<string, string>;
    historyLimit?: number;
    batchMs?: number;
    /** Persistence configuration */
    persist?: PersistOptions<z.infer<S>>;
    /** Effect declarations — reactive side effects triggered by state changes */
    effects?: Record<string, EffectDeclaration<z.infer<S>>>;
    /** Undo configuration. If provided, snapshots are stored for undo/redo. */
    undo?: {
        limit: number;
    };
    /** Pub/Sub: events this store publishes */
    publishes?: Record<string, PublishCondition<z.infer<S>>>;
    /** Pub/Sub: events this store subscribes to */
    subscribes?: Record<string, StoreEventHandler>;
}
export interface DefineStoreResult<S extends ZodType> {
    store: Store<z.infer<S>>;
    schema: S;
    select: SelectorTree<z.infer<S>>;
}
export declare function defineStore<S extends ZodType>(options: DefineStoreOptions<S>): DefineStoreResult<S>;
//# sourceMappingURL=define.d.ts.map