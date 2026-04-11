// Core store: create, read, write, subscribe
// The heart of state-agent's runtime, extracted from:
//   - Data.js: DataContexts registry (line 74), reducer (lines 32-72),
//     listener system (lines 93-143), touched tracking, path-based access
//   - Flow.js: action history (lines 143-145), has() pattern (lines 93-106)
//   - walk.js: middleware enter/leave (visitor pattern)

import { produce } from 'immer'
import { z } from 'zod'
import type { ZodType } from 'zod'
import type {
  Action,
  Actor,
  ImpactAnalysis,
  Listener,
  ListenerMeta,
  Store,
  StoreDependencies,
  StoreOptions,
  StorePathSchema,
  StoreRegistry,
  Unsubscribe,
} from './types.js'
import { getPath, setPath, deletePath, hasPath } from './path.js'
import { canAct, getDefaultActor } from './actor.js'
import { createHistory } from './history.js'
import { createMiddlewarePipeline } from './middleware.js'
import { createWhenEvaluator, createGateEvaluator } from './when.js'
import { createComputedEvaluator } from './computed.js'
import { createBatcher } from './batch.js'
import { introspectSystem } from './introspect.js'
import { buildSelectorTree } from './selectors.js'
import { extractModes, createModeError } from './modes.js'
import { createTransitionGraph } from './transitions.js'
import type { TransitionGraph } from './transitions.js'
import { createOptimisticQueue } from './optimistic.js'
import type { OptimisticOptions, OptimisticResult } from './optimistic.js'
import { createPersistMiddleware } from './persist.js'
import { createEffectRunner } from './effects.js'
import type { EffectRunner } from './effects.js'
import { eventBus } from './pubsub.js'

// ─── Global Registry ─────────────────────────────────────────
// From DataContexts = {} (Data.js line 74): lazy, named, global

const registry: Map<string, Store> = new Map()

export const storeRegistry: StoreRegistry = {
  get<T = any>(name: string): Store<T> | undefined {
    return registry.get(name) as Store<T> | undefined
  },
  getAll() {
    return new Map(registry)
  },
  has(name: string) {
    return registry.has(name)
  },
  register(store: Store) {
    registry.set(store.name, store)
  },
  unregister(name: string) {
    registry.delete(name)
  },
  clear() {
    registry.clear()
  },

  /**
   * Compute the full impact of changing a store.
   * Traverses the dependency graph to find all affected stores.
   * This is the core operation for agent reasoning at scale.
   */
  impactOf(storeName: string): ImpactAnalysis {
    const readers: string[] = []
    const gatedStores: string[] = []
    const triggered: string[] = []
    const visited = new Set<string>()

    function traverse(name: string) {
      if (visited.has(name)) return
      visited.add(name)

      for (const [otherName, otherStore] of registry) {
        if (otherName === name) continue
        const deps = otherStore.getDependencies()

        if (deps.reads.includes(name)) {
          readers.push(otherName)
        }
        if (deps.gatedBy.includes(name)) {
          gatedStores.push(otherName)
          // Gated stores cascade — their dependents are also affected
          traverse(otherName)
        }
        if (deps.triggers.includes(name)) {
          triggered.push(otherName)
          traverse(otherName)
        }
      }
    }

    traverse(storeName)

    return {
      readers,
      gatedStores,
      triggered,
      allAffected: Array.from(visited).filter(n => n !== storeName),
    }
  },

  introspect() {
    return introspectSystem(storeRegistry)
  },
}

// Wire the event bus to resolve stores from the registry
eventBus._setStoreResolver((name) => registry.get(name))

// ─── Action ID ───────────────────────────────────────────────

let actionCounter = 0
function createActionId(): string {
  return `action_${++actionCounter}_${Date.now()}`
}

// ─── Create Store ────────────────────────────────────────────

export function createStore<T = any>(options: StoreOptions<T>): Store<T> {
  const {
    name,
    initial,
    stateSchema,
    schema,
    middleware: middlewareList = [],
    historyLimit = 10_000,
    batchMs = 0,
    properties,
  } = options

  // Validate initial state against Zod schema if provided
  if (stateSchema) {
    const result = stateSchema.safeParse(initial)
    if (!result.success) {
      throw new Error(
        `[state-agent] Store "${name}": initial state fails schema validation:\n` +
        result.error.issues.map(i => `  ${i.path.join('.')}: ${i.message}`).join('\n')
      )
    }
  }

  // Persistence: set up middleware and hydrate before initial state
  const allMiddleware = [...middlewareList]
  let hydratedState: T | undefined
  if (options.persist) {
    const { middleware: persistMw, hydrate } = createPersistMiddleware<T>(
      options.persist,
      stateSchema
    )
    allMiddleware.push(persistMw)
    hydratedState = hydrate()
  }

  // Internal state — from Data.js dual-state pattern (lines 83-84)
  let state: T = hydratedState !== undefined ? hydratedState : initial
  let touched = new Set<string>()

  // Subsystems
  const history = createHistory(historyLimit)
  const pipeline = createMiddlewarePipeline(allMiddleware)
  const whenEval = createWhenEvaluator(options.when)
  const gateEval = createGateEvaluator(options.gates)
  const computedEval = createComputedEvaluator(options.computed)

  // Store metadata for agent traversal
  const dependencies: StoreDependencies = options.dependencies ?? {
    reads: [],
    gatedBy: [],
    triggers: [],
  }
  const zodSchema: ZodType<T> | undefined = stateSchema
  const pathSchema: StorePathSchema | undefined = options.pathSchema

  // Detect discriminated union modes for transition logging
  const modeInfo = stateSchema ? extractModes(stateSchema) : null

  // Build transition graph if transitions are declared
  const transitionGraph: TransitionGraph | null =
    options.transitions ? createTransitionGraph(options.transitions) : null

  // Subscriptions — from Data.js listener system (lines 92-100)
  let listeners: Array<{ listener: Listener<T>; path?: string }> = []

  // Undo/redo snapshot stacks (opt-in via options.undo)
  const undoEnabled = !!options.undo
  const undoLimit = options.undo?.limit ?? 0
  const undoStack: T[] = []
  const redoStack: T[] = []

  // Flow state (optional) — from Flow.js flowDefinition
  let flowState: Record<string, string> = {}
  if (schema) {
    for (const [path, states] of Object.entries(schema)) {
      if (states.length > 0) {
        flowState[path] = states[0] // default to first state
      }
    }
  }

  // ─── Internal: Apply Action ──────────────────────────────

  function reduce(action: Action): void {
    switch (action.type) {
      case 'SET': {
        if (action.path) {
          state = produce(state, (draft: any) => {
            setPath(draft, action.path!, action.value)
          })
          touched = new Set([...touched, action.path])
        }
        break
      }

      case 'SET_FN': {
        if (action.fn) {
          state = produce(state, action.fn)
          if (action.path) {
            touched = new Set([...touched, action.path])
          }
        }
        break
      }

      case 'RESET': {
        state = action.value as T
        touched = new Set()
        break
      }

      case 'DELETE': {
        if (action.path) {
          state = produce(state, (draft: any) => {
            deletePath(draft, action.path!)
          })
        }
        break
      }

      case 'FLOW': {
        if (action.path && action.value && schema) {
          const validStates = schema[action.path]
          const targetState = action.value as string
          if (validStates?.includes(targetState)) {
            flowState = { ...flowState, [action.path]: targetState }
          }
        }
        break
      }

      default:
        break
    }
  }

  function applyAction(action: Action): void {
    const prevState = state

    // Capture undo snapshot before mutation (skip if action.meta.skipUndo)
    const shouldUndo = undoEnabled && !action.meta?.skipUndo
    if (shouldUndo) {
      undoStack.push(structuredClone(prevState))
      if (undoStack.length > undoLimit) {
        undoStack.shift() // drop oldest snapshot
      }
      // Clear redo stack on new action (standard undo behavior)
      redoStack.length = 0
    }

    // Run middleware pipeline: enter → apply → leave
    const { cancelled, action: processedAction } = pipeline.run(
      action,
      state,
      (finalAction) => {
        reduce(finalAction)
        return state
      }
    )

    if (cancelled) {
      if (shouldUndo) undoStack.pop() // remove unused snapshot
      return
    }

    // If state didn't change, remove the unnecessary snapshot
    if (shouldUndo && state === prevState) {
      undoStack.pop()
    }

    // Validate resulting state against Zod schema
    if (zodSchema && state !== prevState) {
      const result = zodSchema.safeParse(state)
      if (!result.success) {
        // Roll back to previous state
        state = prevState
        if (shouldUndo) undoStack.pop() // remove snapshot for rejected mutation
        if (process.env.NODE_ENV === 'development') {
          console.warn(
            `[state-agent] Store "${name}": mutation rejected by schema:\n` +
            result.error.issues.map(i => `  ${i.path.join('.')}: ${i.message}`).join('\n')
          )
        }
        return
      }
    }

    // Log mode transitions for discriminated union stores
    if (modeInfo && state !== prevState) {
      const prevMode = (prevState as any)?.[modeInfo.discriminant]
      const nextMode = (state as any)?.[modeInfo.discriminant]
      if (prevMode !== nextMode && prevMode !== undefined && nextMode !== undefined) {
        // Enforce transition graph if declared
        if (transitionGraph && !transitionGraph.canTransition(prevMode, nextMode)) {
          state = prevState
          if (shouldUndo) undoStack.pop() // remove snapshot for rejected transition
          const validTargetsList = transitionGraph.validTargets(prevMode)
          const validDesc = validTargetsList.length > 0
            ? validTargetsList.map(t => {
                const tName = transitionGraph.transitionName(prevMode, t)
                return `"${prevMode} -> ${t}"${tName ? ` (${tName})` : ''}`
              }).join(', ')
            : 'none'
          console.warn(
            `[state-agent] Store "${name}": transition "${prevMode} -> ${nextMode}" is not declared.\n` +
            `Valid transitions from "${prevMode}": [${validDesc}]`
          )
          return
        }

        if (process.env.NODE_ENV === 'development') {
          console.info(
            `[state-agent] Store "${name}": mode transition "${prevMode}" -> "${nextMode}" (discriminant: "${modeInfo.discriminant}")`
          )
        }
      }
    }

    // Check properties after mutation
    if (properties && state !== prevState) {
      for (const [propName, check] of Object.entries(properties)) {
        try {
          if (!check(state)) {
            console.warn(
              `[state-agent] Store "${name}": property "${propName}" violated after ${processedAction.type}` +
              (processedAction.path ? ` at "${processedAction.path}"` : '')
            )
          }
        } catch (e) {
          console.warn(
            `[state-agent] Store "${name}": property "${propName}" threw during check: ${e}`
          )
        }
      }
    }

    // Record in history
    history.push(processedAction)

    // Notify listeners — from Data.js lines 102-143
    // Sorted listeners fire synchronously after state change
    const meta: ListenerMeta = {
      action: processedAction,
      has: (path: string) => hasPath(state, path),
    }

    for (const { listener, path } of listeners) {
      if (path) {
        const prevVal = getPath(prevState, path)
        const nextVal = getPath(state, path)
        if (prevVal !== nextVal) {
          listener(state, prevState, meta)
        }
      } else {
        if (state !== prevState) {
          listener(state, prevState, meta)
        }
      }
    }

    // Pub/Sub: check and emit events if this store has publishers
    if (hasPublishers && state !== prevState) {
      eventBus.checkAndEmit(name, prevState, state)
    }
  }

  // ─── Batcher (optional) ──────────────────────────────────
  // From Flow.js 25ms buffered dispatch (lines 117-141)

  const batcher = batchMs > 0
    ? createBatcher(actions => {
        for (const action of actions) {
          applyAction(action)
        }
      }, batchMs)
    : null

  function dispatch(action: Action): void {
    if (batcher) {
      batcher.queue(action.path ?? action.type, action)
    } else {
      applyAction(action)
    }
  }

  // ─── Store Interface ─────────────────────────────────────

  const store: Store<T> = {
    get name() {
      return name
    },

    getState() {
      return state
    },

    get<V = unknown>(path?: string): V {
      return getPath(state, path) as V
    },

    set(path: string, value: unknown, actor?: Actor, options?: { skipUndo?: boolean }) {
      const resolved = actor ?? getDefaultActor()
      if (!canAct(resolved, 'write', path)) {
        if (process.env.NODE_ENV === 'development') {
          console.warn(
            `[state-agent] Actor "${resolved.name}" denied write to "${path}" in store "${name}"`
          )
        }
        return
      }

      dispatch({
        id: createActionId(),
        type: 'SET',
        path,
        value,
        actor: resolved,
        timestamp: Date.now(),
        meta: options?.skipUndo ? { skipUndo: true } : undefined,
      })
    },

    update(fn: (draft: T) => void, actor?: Actor, options?: { skipUndo?: boolean }) {
      const resolved = actor ?? getDefaultActor()
      if (!canAct(resolved, 'write', '*')) {
        if (process.env.NODE_ENV === 'development') {
          console.warn(
            `[state-agent] Actor "${resolved.name}" denied update in store "${name}"`
          )
        }
        return
      }

      dispatch({
        id: createActionId(),
        type: 'SET_FN',
        fn,
        actor: resolved,
        timestamp: Date.now(),
        meta: options?.skipUndo ? { skipUndo: true } : undefined,
      })
    },

    reset(value: T, actor?: Actor) {
      const resolved = actor ?? getDefaultActor()
      dispatch({
        id: createActionId(),
        type: 'RESET',
        value,
        actor: resolved,
        timestamp: Date.now(),
      })
    },

    delete(path: string, actor?: Actor) {
      const resolved = actor ?? getDefaultActor()
      if (!canAct(resolved, 'delete', path)) {
        if (process.env.NODE_ENV === 'development') {
          console.warn(
            `[state-agent] Actor "${resolved.name}" denied delete at "${path}" in store "${name}"`
          )
        }
        return
      }

      dispatch({
        id: createActionId(),
        type: 'DELETE',
        path,
        actor: resolved,
        timestamp: Date.now(),
      })
    },

    subscribe(listener: Listener<T>, path?: string): Unsubscribe {
      const entry = { listener, path }
      listeners.push(entry)
      return () => {
        listeners = listeners.filter(l => l !== entry)
      }
    },

    has(path: string) {
      // Two modes:
      // 1. Flow state: check if a flow path has a specific state
      if (schema && path in flowState) return true
      // 2. Data state: check if a path exists in state
      return hasPath(state, path)
    },

    getHistory() {
      return history.getAll()
    },

    getWhen() {
      return whenEval.evaluate(state)
    },

    isWhen(conditionName: string) {
      return whenEval.check(conditionName, state)
    },

    getGates() {
      return gateEval.evaluate(state)
    },

    isGated(gateName: string) {
      return gateEval.check(gateName, state)
    },

    computed<V = unknown>(name: string): V {
      return computedEval.get<V>(name, state)
    },

    getComputed() {
      return computedEval.getAll(state)
    },

    getDependencies() {
      return { ...dependencies }
    },

    getSchema() {
      return zodSchema
    },

    getProperties() {
      if (!properties) return {}
      const results: Record<string, boolean> = {}
      for (const [propName, check] of Object.entries(properties)) {
        try {
          results[propName] = check(state)
        } catch {
          results[propName] = false
        }
      }
      return results
    },

    getPathSchema() {
      return pathSchema ? { ...pathSchema } : undefined
    },

    undo(count = 1, actor?: Actor): number {
      if (!undoEnabled || undoStack.length === 0) return 0
      const actual = Math.min(count, undoStack.length)
      const prevState = state
      for (let i = 0; i < actual; i++) {
        redoStack.push(structuredClone(state))
        state = undoStack.pop()!
      }
      // Notify listeners
      if (state !== prevState) {
        const undoActor: Actor = actor ?? { id: 'system', type: 'system', name: 'undo' }
        const undoAction: Action = {
          id: createActionId(),
          type: 'UNDO' as any,
          actor: undoActor,
          timestamp: Date.now(),
          meta: { undoCount: actual },
        }
        const meta: ListenerMeta = {
          action: undoAction,
          has: (path: string) => hasPath(state, path),
        }
        for (const { listener, path } of listeners) {
          if (path) {
            const prevVal = getPath(prevState, path)
            const nextVal = getPath(state, path)
            if (prevVal !== nextVal) {
              listener(state, prevState, meta)
            }
          } else {
            listener(state, prevState, meta)
          }
        }
      }
      return actual
    },

    redo(count = 1, actor?: Actor): number {
      if (!undoEnabled || redoStack.length === 0) return 0
      const actual = Math.min(count, redoStack.length)
      const prevState = state
      for (let i = 0; i < actual; i++) {
        undoStack.push(structuredClone(state))
        state = redoStack.pop()!
      }
      // Notify listeners
      if (state !== prevState) {
        const redoActor: Actor = actor ?? { id: 'system', type: 'system', name: 'redo' }
        const redoAction: Action = {
          id: createActionId(),
          type: 'REDO' as any,
          actor: redoActor,
          timestamp: Date.now(),
          meta: { redoCount: actual },
        }
        const meta: ListenerMeta = {
          action: redoAction,
          has: (path: string) => hasPath(state, path),
        }
        for (const { listener, path } of listeners) {
          if (path) {
            const prevVal = getPath(prevState, path)
            const nextVal = getPath(state, path)
            if (prevVal !== nextVal) {
              listener(state, prevState, meta)
            }
          } else {
            listener(state, prevState, meta)
          }
        }
      }
      return actual
    },

    canUndo(): boolean {
      return undoEnabled && undoStack.length > 0
    },

    canRedo(): boolean {
      return undoEnabled && redoStack.length > 0
    },

    clearUndoStack() {
      undoStack.length = 0
      redoStack.length = 0
    },

    optimistic: null as any,

    destroy() {
      if (effectRunner) effectRunner.stop()
      eventBus.unregister(name)
      listeners = []
      history.clear()
      if (batcher) batcher.cancel()
      registry.delete(name)
    },
  }

  // Optimistic update queue — one per store
  const optimisticQueue = createOptimisticQueue<T>()
  store.optimistic = (opts: OptimisticOptions<T>): Promise<OptimisticResult> => {
    return optimisticQueue.enqueue(store, opts)
  }

  // Add transition methods if transitions are declared
  if (transitionGraph && modeInfo) {
    store.canTransition = (from: string, to: string) => transitionGraph.canTransition(from, to)
    store.validTargets = (from?: string) => {
      const mode = from ?? (state as any)?.[modeInfo.discriminant]
      return mode ? transitionGraph.validTargets(mode) : []
    }
  }

  // Build auto-generated selector tree from Zod schema
  if (zodSchema && (zodSchema instanceof z.ZodObject || zodSchema instanceof z.ZodDiscriminatedUnion)) {
    ;(store as any).select = buildSelectorTree(zodSchema)
  }

  // Effect runner (optional) — reactive side effects on state changes
  let effectRunner: EffectRunner<T> | null = null
  if (options.effects) {
    effectRunner = createEffectRunner<T>(options.effects)
    effectRunner.start(store)
  }

  // Pub/Sub registration (optional) — cross-store event protocol
  const hasPublishers = !!options.publishes
  if (options.publishes) {
    eventBus.registerPublisher(name, options.publishes)
  }
  if (options.subscribes) {
    eventBus.registerSubscriber(name, options.subscribes)
  }

  // Attach runtime metadata for introspection (V2-2)
  ;(store as any).__meta = {
    modeInfo: modeInfo ?? undefined,
    transitionGraph: transitionGraph ?? undefined,
    effectRunner: effectRunner ?? undefined,
    selectorPaths: (store as any).select ? collectSelectorPaths((store as any).select) : undefined,
    hasProperties: !!properties,
    undoEnabled,
    undoLimit,
    publishEventNames: options.publishes ? Object.keys(options.publishes) : undefined,
    subscribeEventNames: options.subscribes ? Object.keys(options.subscribes) : undefined,
  }

  // Register in global registry — from DataContexts pattern
  registry.set(name, store as Store)

  return store
}

// ─── Helper: Collect selector paths from tree ─────────────────

function collectSelectorPaths(tree: any, paths: string[] = []): string[] {
  for (const key of Object.keys(tree)) {
    if (key.startsWith('$')) continue
    const node = tree[key]
    if (node && node.$path) {
      paths.push(node.$path)
      collectSelectorPaths(node, paths)
    }
  }
  return paths
}

// ─── Convenience: Get Store by Name ──────────────────────────

export function getStore<T = any>(name: string): Store<T> | undefined {
  return registry.get(name) as Store<T> | undefined
}

export function getAllStores(): Map<string, Store> {
  return new Map(registry)
}
