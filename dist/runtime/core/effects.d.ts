import type { Actor, Store } from './types.js';
export interface EffectDeclaration<T = any> {
    /** Dot-path to watch, or "modeA -> modeB" for transition triggers */
    watch: string;
    /** The effect handler */
    handler: (context: EffectContext<T>) => Promise<void> | void;
    /** Debounce in ms. Default: 0 (immediate) */
    debounce?: number;
    /** Retry configuration */
    retry?: {
        max: number;
        backoff?: 'linear' | 'exponential';
    };
}
export interface EffectContext<T = any> {
    state: T;
    prevState: T;
    store: Store<T>;
    signal: AbortSignal;
    actor: Actor;
}
export type EffectStatus = 'idle' | 'running' | 'debouncing' | 'retrying' | 'error';
export interface EffectRunner<T = any> {
    /** Start watching for triggers */
    start(store: Store<T>): void;
    /** Stop all effects and cancel pending ones */
    stop(): void;
    /** Get status of all effects */
    status(): Record<string, EffectStatus>;
}
export declare function createEffectRunner<T>(declarations: Record<string, EffectDeclaration<T>>): EffectRunner<T>;
//# sourceMappingURL=effects.d.ts.map