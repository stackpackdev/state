// React hooks for state-agent stores
// Extracted from:
//   - Data.js useData (lines 259-292), useDataValue (lines 294-297),
//     useDataChange (lines 315-339), useDataListener (lines 241-253)
//   - Flow.js useFlow (lines 88-111), useSetFlowTo (lines 120-141)

import { useCallback, useContext, useEffect, useMemo, useRef, useSyncExternalStore } from 'react'
import type { Actor, Flow, Listener, Store, Unsubscribe } from '../core/types.js'
import type { SelectorNode } from '../core/selectors.js'
import { getPath } from '../core/path.js'
import { getStore } from '../core/store.js'
import { getDefaultActor } from '../core/actor.js'
import { getStoreContext } from './context.js'

// ─── Internal: Resolve store from context or registry ────────

function useResolveStore<T = any>(name: string): Store<T> {
  const Context = getStoreContext(name)
  const contextStore = useContext(Context)

  // Try context first, fall back to global registry
  const store = contextStore ?? getStore<T>(name)
  if (!store) {
    throw new Error(
      `[state-agent] Store "${name}" not found. ` +
      `Wrap your component in <StoreProvider store={...}> or create the store first.`
    )
  }
  return store
}

// ─── useActor ───────────────────────────────────────────────
// Returns the provided actor or falls back to the default human actor

export function useActor(actor?: Actor): Actor {
  return actor ?? getDefaultActor()
}

// ─── useSelect ────────────────────────────────────────────────
// Subscribe to a selector node from the auto-generated selector tree.
// Only re-renders when the selected path changes.

export function useSelect<V>(
  storeName: string,
  selector: SelectorNode<V>
): V {
  const store = useResolveStore(storeName)

  return useSyncExternalStore(
    useCallback(
      (onStoreChange: () => void) => {
        return store.subscribe(() => onStoreChange(), selector.$path)
      },
      [store, selector.$path]
    ),
    () => selector.$select(store.getState()),
    () => selector.$select(store.getState())
  )
}

// ─── useStore ────────────────────────────────────────────────
// Main hook — mirrors Data.js useData (lines 259-292)

export interface UseStoreResult<T = any> {
  /** Current state value */
  value: T
  /** Change state at a path — actor optional (falls back to default) */
  change: (path: string, value: unknown, actor?: Actor) => void
  /** Update state with Immer mutation — actor optional (falls back to default) */
  update: (fn: (draft: T) => void, actor?: Actor) => void
  /** Reset state to a new value — actor optional (falls back to default) */
  reset: (value: T, actor?: Actor) => void
  /** Check if a flow state or path is active */
  has: (path: string) => boolean
  /** When conditions evaluated against current state */
  when: Record<string, boolean>
  /** Action history */
  history: ReturnType<Store['getHistory']>
}

export function useStore<T = any>(
  name: string,
  actor?: Actor
): UseStoreResult<T> {
  const store = useResolveStore<T>(name)

  // Subscribe to store changes using useSyncExternalStore
  const value = useSyncExternalStore(
    useCallback(
      (onStoreChange: () => void) => {
        return store.subscribe(() => onStoreChange())
      },
      [store]
    ),
    () => store.getState(),
    () => store.getState()
  )

  const change = useCallback(
    (path: string, val: unknown, overrideActor?: Actor) => {
      const resolved = overrideActor ?? actor ?? getDefaultActor()
      store.set(path, val, resolved)
    },
    [store, actor]
  )

  const update = useCallback(
    (fn: (draft: T) => void, overrideActor?: Actor) => {
      const resolved = overrideActor ?? actor ?? getDefaultActor()
      store.update(fn, resolved)
    },
    [store, actor]
  )

  const reset = useCallback(
    (val: T, overrideActor?: Actor) => {
      const resolved = overrideActor ?? actor ?? getDefaultActor()
      store.reset(val, resolved)
    },
    [store, actor]
  )

  const has = useCallback((path: string) => store.has(path), [store])

  const when = useMemo(() => store.getWhen(), [value])
  const history = useMemo(() => store.getHistory(), [value])

  return { value, change, update, reset, has, when, history }
}

// ─── useValue ────────────────────────────────────────────────
// Path-specific value — mirrors Data.js useDataValue (lines 294-297)

export function useValue<V = unknown>(storeName: string, path?: string): V {
  const store = useResolveStore(storeName)

  return useSyncExternalStore(
    useCallback(
      (onStoreChange: () => void) => {
        return store.subscribe(() => onStoreChange(), path)
      },
      [store, path]
    ),
    () => (path ? getPath(store.getState(), path) : store.getState()) as V,
    () => (path ? getPath(store.getState(), path) : store.getState()) as V
  )
}

// ─── useChange ───────────────────────────────────────────────
// Actor-scoped mutation — mirrors Data.js useDataChange (lines 315-339)

export function useChange(storeName: string, actor?: Actor) {
  const store = useResolveStore(storeName)

  return useCallback(
    (path: string, value: unknown) => {
      const resolved = actor ?? getDefaultActor()
      store.set(path, value, resolved)
    },
    [store, actor]
  )
}

// ─── useUpdate ───────────────────────────────────────────────
// Immer-based mutation with actor

export function useUpdate<T = any>(storeName: string, actor?: Actor) {
  const store = useResolveStore<T>(storeName)

  return useCallback(
    (fn: (draft: T) => void) => {
      const resolved = actor ?? getDefaultActor()
      store.update(fn, resolved)
    },
    [store, actor]
  )
}

// ─── useWhen ─────────────────────────────────────────────────
// Conditional state — from Views "when isHovered, when isFocused" scoped properties

export function useWhen(storeName: string): Record<string, boolean> {
  const store = useResolveStore(storeName)

  return useSyncExternalStore(
    useCallback(
      (onStoreChange: () => void) => store.subscribe(() => onStoreChange()),
      [store]
    ),
    () => store.getWhen(),
    () => store.getWhen()
  )
}

// ─── useGate ────────────────────────────────────────────────
// Gate conditions — mount-edge predicates that control component mounting
// An agent uses gates to know which mutations will cause mount cascades

export function useGate(storeName: string, gateName?: string): Record<string, boolean> | boolean {
  const store = useResolveStore(storeName)

  const gates = useSyncExternalStore(
    useCallback(
      (onStoreChange: () => void) => store.subscribe(() => onStoreChange()),
      [store]
    ),
    () => store.getGates(),
    () => store.getGates()
  )

  if (gateName) {
    return gates[gateName] ?? false
  }
  return gates
}

// ─── useComputed ────────────────────────────────────────────
// Access a computed value from a store

export function useComputed<V = unknown>(storeName: string, name: string): V {
  const store = useResolveStore(storeName)

  return useSyncExternalStore(
    useCallback(
      (onStoreChange: () => void) => store.subscribe(() => onStoreChange()),
      [store]
    ),
    () => store.computed<V>(name),
    () => store.computed<V>(name)
  )
}

// ─── useFlow ─────────────────────────────────────────────────
// Flow state — mirrors Flow.js useFlow (lines 88-111) + useSetFlowTo (lines 120-141)

export function useFlow(storeName: string, actor?: Actor) {
  const store = useResolveStore(storeName)

  const current = useSyncExternalStore(
    useCallback(
      (onStoreChange: () => void) => store.subscribe(() => onStoreChange()),
      [store]
    ),
    () => store.getState(),
    () => store.getState()
  )

  const has = useCallback((path: string) => store.has(path), [store])

  const go = useCallback(
    (path: string, state: string) => {
      const resolved = actor ?? getDefaultActor()
      store.set(`_flow.${path}`, state, resolved)
    },
    [store, actor]
  )

  return { current, has, go }
}

// ─── useAgentStatus ──────────────────────────────────────────
// Watch an agent's status in a store

export function useAgentStatus(
  storeName: string,
  agentId: string
): string | undefined {
  const store = useResolveStore(storeName)

  return useSyncExternalStore(
    useCallback(
      (onStoreChange: () => void) => store.subscribe(() => onStoreChange()),
      [store]
    ),
    () => {
      const history = store.getHistory()
      const lastAgentAction = history.find(a => a.actor.id === agentId)
      return lastAgentAction?.actor.status
    },
    () => undefined
  )
}

// ─── useStoreListener ────────────────────────────────────────
// Subscribe to store changes — mirrors Data.js useDataListener (lines 241-253)

export function useStoreListener<T = any>(
  storeName: string,
  listener: Listener<T>,
  path?: string
): void {
  const store = useResolveStore<T>(storeName)
  const listenerRef = useRef(listener)

  useEffect(() => {
    listenerRef.current = listener
  }, [listener])

  useEffect(() => {
    return store.subscribe(
      (next, prev, meta) => listenerRef.current(next, prev, meta),
      path
    )
  }, [store, path])
}
