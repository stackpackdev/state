// state-agent core public API
// Framework-agnostic — works in Node.js, browsers, any JS runtime

// Zod re-export — users define schemas without a separate import
export { z } from 'zod'

// Store
export { createStore, getStore, getAllStores, storeRegistry } from './store.js'

// Define (ergonomic store creation)
export { defineStore } from './define.js'
export type { DefineStoreOptions, DefineStoreResult } from './define.js'

// Actor
export { createHumanActor, createAgentActor, createSystemActor, canAct, withStatus, getDefaultActor } from './actor.js'

// Flow
export { createFlow } from './flow.js'

// When & Gates
export { createWhenEvaluator, createGateEvaluator } from './when.js'

// Together
export { together } from './together.js'

// Middleware
export { createMiddlewarePipeline } from './middleware.js'

// Fetch
export { createFetcher, createInitialFetchState } from './fetch.js'

// Computed
export { createComputedEvaluator } from './computed.js'
export type { ComputedDefinitions, ComputedEvaluator } from './computed.js'

// History
export { createHistory } from './history.js'

// Batch
export { createBatcher } from './batch.js'

// Modes (discriminated union support)
export { extractModes, createModeError, deriveGatesFromModes, deriveWhenFromModes } from './modes.js'
export type { ModeInfo } from './modes.js'

// Transitions (declared transition graphs)
export { createTransitionGraph } from './transitions.js'
export type { TransitionGraph } from './transitions.js'

// Persistence
export { createPersistMiddleware, createMemoryStorage } from './persist.js'
export type { PersistOptions, StorageAdapter } from './persist.js'

// Optimistic updates
export { createOptimisticQueue } from './optimistic.js'
export type { OptimisticOptions, OptimisticResult, OptimisticQueue } from './optimistic.js'

// Effects
export { createEffectRunner } from './effects.js'
export type { EffectDeclaration, EffectContext, EffectStatus, EffectRunner } from './effects.js'

// Pub/Sub (cross-store event protocol)
export { eventBus, createEventBus } from './pubsub.js'
export type { EventBus, StoreEventHandler, PublishCondition } from './pubsub.js'

// Introspection
export { introspectStore, introspectSystem } from './introspect.js'
export type { StoreIntrospection, SystemIntrospection } from './introspect.js'

// Selectors
export { buildSelectorTree } from './selectors.js'
export type { SelectorNode, SelectorTree } from './selectors.js'

// Migrations
export { applyMigration } from './migrate.js'
export type { MigrationPlan, MigrationResult } from './migrate.js'

// Path utilities
export { getPath, setPath, deletePath, hasPath, matchPath } from './path.js'

// Presence (deferred unmounting for animations)
export { createPresenceTracker } from './presence.js'
export type { PresenceTracker, PresenceTrackerOptions } from './presence.js'

// Types
export type {
  Actor,
  ActorType,
  ActorStatus,
  Action,
  ActionType,
  Permission,
  PermissionAction,
  Store,
  StoreOptions,
  StoreDependencies,
  StorePathSchema,
  PathSchemaEntry,
  PathSchemaType,
  StoreRegistry,
  ImpactAnalysis,
  Listener,
  ListenerMeta,
  Unsubscribe,
  Middleware,
  Flow,
  FlowMode,
  FlowOptions,
  FlowSchema,
  FlowState,
  Transform,
  Together,
  TogetherOptions,
  OptimisticUpdate,
  PresencePhase,
  PresenceRecord,
} from './types.js'

export type {
  FetchStatus,
  FetchState,
  FetcherOptions,
  Fetcher,
  BoundFetcher,
} from './fetch.js'

export type { WhenConditions, WhenEvaluator, GateConditions, GateEvaluator } from './when.js'
