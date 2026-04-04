// React hooks for state-agent stores
// Extracted from:
//   - Data.js useData (lines 259-292), useDataValue (lines 294-297),
//     useDataChange (lines 315-339), useDataListener (lines 241-253)
//   - Flow.js useFlow (lines 88-111), useSetFlowTo (lines 120-141)
import { useCallback, useContext, useEffect, useMemo, useRef, useSyncExternalStore } from 'react';
import { getPath } from '../core/path.js';
import { getStore } from '../core/store.js';
import { getDefaultActor } from '../core/actor.js';
import { getStoreContext } from './context.js';
// ─── Internal: Resolve store from context or registry ────────
function useResolveStore(name) {
    const Context = getStoreContext(name);
    const contextStore = useContext(Context);
    // Try context first, fall back to global registry
    const store = contextStore ?? getStore(name);
    if (!store) {
        throw new Error(`[state-agent] Store "${name}" not found. ` +
            `Wrap your component in <StoreProvider store={...}> or create the store first.`);
    }
    return store;
}
// ─── useActor ───────────────────────────────────────────────
// Returns the provided actor or falls back to the default human actor
export function useActor(actor) {
    return actor ?? getDefaultActor();
}
// ─── useSelect ────────────────────────────────────────────────
// Subscribe to a selector node from the auto-generated selector tree.
// Only re-renders when the selected path changes.
export function useSelect(storeName, selector) {
    const store = useResolveStore(storeName);
    return useSyncExternalStore(useCallback((onStoreChange) => {
        return store.subscribe(() => onStoreChange(), selector.$path);
    }, [store, selector.$path]), () => selector.$select(store.getState()), () => selector.$select(store.getState()));
}
export function useStore(name, actor) {
    const store = useResolveStore(name);
    // Subscribe to store changes using useSyncExternalStore
    const value = useSyncExternalStore(useCallback((onStoreChange) => {
        return store.subscribe(() => onStoreChange());
    }, [store]), () => store.getState(), () => store.getState());
    const change = useCallback((path, val, overrideActor) => {
        const resolved = overrideActor ?? actor ?? getDefaultActor();
        store.set(path, val, resolved);
    }, [store, actor]);
    const update = useCallback((fn, overrideActor) => {
        const resolved = overrideActor ?? actor ?? getDefaultActor();
        store.update(fn, resolved);
    }, [store, actor]);
    const reset = useCallback((val, overrideActor) => {
        const resolved = overrideActor ?? actor ?? getDefaultActor();
        store.reset(val, resolved);
    }, [store, actor]);
    const has = useCallback((path) => store.has(path), [store]);
    const when = useMemo(() => store.getWhen(), [value]);
    const history = useMemo(() => store.getHistory(), [value]);
    return { value, change, update, reset, has, when, history };
}
// ─── useValue ────────────────────────────────────────────────
// Path-specific value — mirrors Data.js useDataValue (lines 294-297)
export function useValue(storeName, path) {
    const store = useResolveStore(storeName);
    return useSyncExternalStore(useCallback((onStoreChange) => {
        return store.subscribe(() => onStoreChange(), path);
    }, [store, path]), () => (path ? getPath(store.getState(), path) : store.getState()), () => (path ? getPath(store.getState(), path) : store.getState()));
}
// ─── useChange ───────────────────────────────────────────────
// Actor-scoped mutation — mirrors Data.js useDataChange (lines 315-339)
export function useChange(storeName, actor) {
    const store = useResolveStore(storeName);
    return useCallback((path, value) => {
        const resolved = actor ?? getDefaultActor();
        store.set(path, value, resolved);
    }, [store, actor]);
}
// ─── useUpdate ───────────────────────────────────────────────
// Immer-based mutation with actor
export function useUpdate(storeName, actor) {
    const store = useResolveStore(storeName);
    return useCallback((fn) => {
        const resolved = actor ?? getDefaultActor();
        store.update(fn, resolved);
    }, [store, actor]);
}
// ─── useWhen ─────────────────────────────────────────────────
// Conditional state — from Views "when isHovered, when isFocused" scoped properties
export function useWhen(storeName) {
    const store = useResolveStore(storeName);
    return useSyncExternalStore(useCallback((onStoreChange) => store.subscribe(() => onStoreChange()), [store]), () => store.getWhen(), () => store.getWhen());
}
// ─── useGate ────────────────────────────────────────────────
// Gate conditions — mount-edge predicates that control component mounting
// An agent uses gates to know which mutations will cause mount cascades
export function useGate(storeName, gateName) {
    const store = useResolveStore(storeName);
    const gates = useSyncExternalStore(useCallback((onStoreChange) => store.subscribe(() => onStoreChange()), [store]), () => store.getGates(), () => store.getGates());
    if (gateName) {
        return gates[gateName] ?? false;
    }
    return gates;
}
// ─── useComputed ────────────────────────────────────────────
// Access a computed value from a store
export function useComputed(storeName, name) {
    const store = useResolveStore(storeName);
    return useSyncExternalStore(useCallback((onStoreChange) => store.subscribe(() => onStoreChange()), [store]), () => store.computed(name), () => store.computed(name));
}
// ─── useFlow ─────────────────────────────────────────────────
// Flow state — mirrors Flow.js useFlow (lines 88-111) + useSetFlowTo (lines 120-141)
export function useFlow(storeName, actor) {
    const store = useResolveStore(storeName);
    const current = useSyncExternalStore(useCallback((onStoreChange) => store.subscribe(() => onStoreChange()), [store]), () => store.getState(), () => store.getState());
    const has = useCallback((path) => store.has(path), [store]);
    const go = useCallback((path, state) => {
        const resolved = actor ?? getDefaultActor();
        store.set(`_flow.${path}`, state, resolved);
    }, [store, actor]);
    return { current, has, go };
}
// ─── useAgentStatus ──────────────────────────────────────────
// Watch an agent's status in a store
export function useAgentStatus(storeName, agentId) {
    const store = useResolveStore(storeName);
    return useSyncExternalStore(useCallback((onStoreChange) => store.subscribe(() => onStoreChange()), [store]), () => {
        const history = store.getHistory();
        const lastAgentAction = history.find(a => a.actor.id === agentId);
        return lastAgentAction?.actor.status;
    }, () => undefined);
}
// ─── useStoreListener ────────────────────────────────────────
// Subscribe to store changes — mirrors Data.js useDataListener (lines 241-253)
export function useStoreListener(storeName, listener, path) {
    const store = useResolveStore(storeName);
    const listenerRef = useRef(listener);
    useEffect(() => {
        listenerRef.current = listener;
    }, [listener]);
    useEffect(() => {
        return store.subscribe((next, prev, meta) => listenerRef.current(next, prev, meta), path);
    }, [store, path]);
}
//# sourceMappingURL=hooks.js.map