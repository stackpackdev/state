import type { Actor, Listener, Store } from '../core/types.js';
import type { SelectorNode } from '../core/selectors.js';
export declare function useActor(actor?: Actor): Actor;
export declare function useSelect<V>(storeName: string, selector: SelectorNode<V>): V;
export interface UseStoreResult<T = any> {
    /** Current state value */
    value: T;
    /** Change state at a path — actor optional (falls back to default) */
    change: (path: string, value: unknown, actor?: Actor) => void;
    /** Update state with Immer mutation — actor optional (falls back to default) */
    update: (fn: (draft: T) => void, actor?: Actor) => void;
    /** Reset state to a new value — actor optional (falls back to default) */
    reset: (value: T, actor?: Actor) => void;
    /** Check if a flow state or path is active */
    has: (path: string) => boolean;
    /** When conditions evaluated against current state */
    when: Record<string, boolean>;
    /** Action history */
    history: ReturnType<Store['getHistory']>;
}
export declare function useStore<T = any>(name: string, actor?: Actor): UseStoreResult<T>;
export declare function useValue<V = unknown>(storeName: string, path?: string): V;
export declare function useChange(storeName: string, actor?: Actor): (path: string, value: unknown) => void;
export declare function useUpdate<T = any>(storeName: string, actor?: Actor): (fn: (draft: T) => void) => void;
export declare function useWhen(storeName: string): Record<string, boolean>;
export declare function useGate(storeName: string, gateName?: string): Record<string, boolean> | boolean;
export declare function useComputed<V = unknown>(storeName: string, name: string): V;
export declare function useFlow(storeName: string, actor?: Actor): {
    current: any;
    has: (path: string) => boolean;
    go: (path: string, state: string) => void;
};
export declare function useAgentStatus(storeName: string, agentId: string): string | undefined;
export declare function useStoreListener<T = any>(storeName: string, listener: Listener<T>, path?: string): void;
//# sourceMappingURL=hooks.d.ts.map