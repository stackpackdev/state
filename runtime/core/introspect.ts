// Agent Introspection API
// Structured runtime inspection of stores and the full state system
// Enables agents to reason about application state without parsing source code

import type { Store, StoreRegistry, StoreDependencies } from './types.js'

// ─── Introspection Types ────────────────────────────────────

export interface StoreIntrospection {
  name: string
  /** Current state value */
  state: unknown
  /** All when condition names and current values */
  when: Record<string, boolean>
  /** All gate condition names and current values */
  gates: Record<string, boolean>
  /** All computed value names and current values */
  computed: Record<string, unknown>
  /** Dependency metadata */
  dependencies: StoreDependencies
  /** Number of actions in history */
  historyLength: number

  // ─── Extended fields (V2-2) ───────────────────────────────

  /** Current mode name if store uses a discriminated union schema */
  currentMode?: string
  /** All available mode names */
  modes?: string[]
  /** Valid transition targets from the current mode */
  validTransitions?: string[]
  /** Effect names and their current status */
  effects?: Record<string, string>
  /** Available selector paths from the auto-generated tree */
  selectorPaths?: string[]
  /** Property invariant names and current check results */
  properties?: Record<string, boolean>
  /** Whether undo is enabled */
  undoEnabled?: boolean
  /** Number of undoable actions */
  undoDepth?: number
  /** Whether redo is available */
  canRedo?: boolean
  /** Event names this store publishes */
  publishes?: string[]
  /** Event names this store subscribes to */
  subscribes?: string[]
}

export interface SystemIntrospection {
  stores: Record<string, StoreIntrospection>
  storeNames: string[]
  storeCount: number
}

// ─── Introspection Functions ────────────────────────────────

/**
 * Introspect a single store, returning its current runtime state,
 * conditions, computed values, and dependency metadata.
 */
export function introspectStore(store: Store): StoreIntrospection {
  const meta = (store as any).__meta

  const result: StoreIntrospection = {
    name: store.name,
    state: store.getState(),
    when: store.getWhen(),
    gates: store.getGates(),
    computed: store.getComputed(),
    dependencies: store.getDependencies(),
    historyLength: store.getHistory().length,
  }

  if (meta) {
    // Modes
    if (meta.modeInfo) {
      const currentState = store.getState() as any
      result.currentMode = currentState?.[meta.modeInfo.discriminant]
      result.modes = meta.modeInfo.modeNames
    }

    // Transitions
    if (meta.transitionGraph) {
      if (result.currentMode) {
        result.validTransitions = meta.transitionGraph.validTargets(result.currentMode)
      }
    }

    // Effects
    if (meta.effectRunner) {
      result.effects = meta.effectRunner.status()
    }

    // Selectors
    if (meta.selectorPaths) {
      result.selectorPaths = meta.selectorPaths
    }

    // Properties
    if (meta.hasProperties) {
      result.properties = store.getProperties()
    }

    // Undo
    result.undoEnabled = meta.undoEnabled ?? false
    if (meta.undoEnabled) {
      result.canRedo = store.canRedo()
    }

    // Pub/Sub
    if (meta.publishEventNames) {
      result.publishes = meta.publishEventNames
    }
    if (meta.subscribeEventNames) {
      result.subscribes = meta.subscribeEventNames
    }
  }

  return result
}

/**
 * Introspect the entire state system via the store registry,
 * returning a structured description of all registered stores.
 */
export function introspectSystem(registry: StoreRegistry): SystemIntrospection {
  const stores: Record<string, StoreIntrospection> = {}
  const storeNames: string[] = []

  for (const [name, store] of registry.getAll()) {
    storeNames.push(name)
    stores[name] = introspectStore(store)
  }

  return {
    stores,
    storeNames,
    storeCount: storeNames.length,
  }
}
