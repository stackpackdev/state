// defineStore — ergonomic one-call store creation
// Infers types from schema, reduces boilerplate from 3 declarations to 1

import type { ZodType } from 'zod'
import type { z } from 'zod'
import type { Middleware, Store, StoreDependencies } from './types.js'
import type { PersistOptions } from './persist.js'
import type { EffectDeclaration } from './effects.js'
import type { PublishCondition, StoreEventHandler } from './pubsub.js'
import { createStore } from './store.js'
import { extractModes, deriveGatesFromModes, deriveWhenFromModes } from './modes.js'
import type { SelectorTree } from './selectors.js'

export interface DefineStoreOptions<S extends ZodType> {
  name: string
  schema: S
  initial: z.infer<S>
  when?: Record<string, (state: z.infer<S>) => boolean>
  gates?: Record<string, (state: z.infer<S>) => boolean>
  computed?: Record<string, (state: z.infer<S>) => unknown>
  properties?: Record<string, (state: z.infer<S>) => boolean>
  middleware?: Middleware[]
  dependencies?: StoreDependencies
  /** Declared transitions for mode-based stores. Keys: "from -> to", values: transition names. */
  transitions?: Record<string, string>
  historyLimit?: number
  batchMs?: number
  /** Persistence configuration */
  persist?: PersistOptions<z.infer<S>>
  /** Effect declarations — reactive side effects triggered by state changes */
  effects?: Record<string, EffectDeclaration<z.infer<S>>>
  /** Undo configuration. If provided, snapshots are stored for undo/redo. */
  undo?: { limit: number }
  /** Pub/Sub: events this store publishes */
  publishes?: Record<string, PublishCondition<z.infer<S>>>
  /** Pub/Sub: events this store subscribes to */
  subscribes?: Record<string, StoreEventHandler>
}

export interface DefineStoreResult<S extends ZodType> {
  store: Store<z.infer<S>>
  schema: S
  select: SelectorTree<z.infer<S>>
}

export function defineStore<S extends ZodType>(
  options: DefineStoreOptions<S>
): DefineStoreResult<S> {
  type T = z.infer<S>

  // Auto-derive gates and when conditions from discriminated union modes.
  // User-provided gates/when take precedence over auto-derived ones.
  const modeInfo = extractModes(options.schema)

  let mergedWhen = options.when
  let mergedGates = options.gates

  if (modeInfo) {
    const autoWhen = deriveWhenFromModes(modeInfo)
    const autoGates = deriveGatesFromModes(modeInfo)

    // Auto-derived first, then user overrides on top
    mergedWhen = { ...autoWhen, ...options.when }
    mergedGates = { ...autoGates, ...options.gates }
  }

  const store = createStore<T>({
    name: options.name,
    stateSchema: options.schema as any,
    initial: options.initial,
    when: mergedWhen,
    gates: mergedGates,
    computed: options.computed,
    properties: options.properties,
    middleware: options.middleware,
    dependencies: options.dependencies,
    transitions: options.transitions,
    historyLimit: options.historyLimit,
    batchMs: options.batchMs,
    persist: options.persist,
    effects: options.effects,
    undo: options.undo,
    publishes: options.publishes,
    subscribes: options.subscribes,
  })
  return { store, schema: options.schema, select: (store.select ?? {}) as SelectorTree<T> }
}
