# stackpack-state API Reference

Complete reference for every export. Import paths:
- `stackpack-state` — core runtime (Node.js, browser, any JS)
- `stackpack-state/react` — React hooks and components
- `stackpack-state/components` — ECS-style composable state components

---

## Core: `stackpack-state`

### defineStore

The primary way to create stores. Infers types from Zod schema.

```typescript
function defineStore<S extends ZodType>(options: DefineStoreOptions<S>): DefineStoreResult<S>

interface DefineStoreOptions<S extends ZodType> {
  name: string                                              // unique store name
  schema: S                                                 // Zod schema (source of truth)
  initial: z.infer<S>                                       // initial state (must pass schema)
  when?: Record<string, (state: z.infer<S>) => boolean>     // style-edge conditions
  gates?: Record<string, (state: z.infer<S>) => boolean>    // mount-edge conditions
  computed?: Record<string, (state: z.infer<S>) => unknown> // derived values
  properties?: Record<string, (state: z.infer<S>) => boolean> // invariants (warn on violation)
  transitions?: Record<string, string>                      // "from -> to": "name"
  effects?: Record<string, EffectDeclaration<z.infer<S>>>   // reactive side effects
  persist?: PersistOptions<z.infer<S>>                      // storage persistence
  undo?: { limit: number }                                  // enable undo/redo
  publishes?: Record<string, PublishCondition<z.infer<S>>>  // cross-store events
  subscribes?: Record<string, StoreEventHandler>            // react to other stores
  middleware?: Middleware[]                                  // action pipeline
  dependencies?: StoreDependencies                          // graph metadata
  historyLimit?: number                                     // max actions (default: 10000)
  batchMs?: number                                          // batch delay (default: 0 = off)
}

interface DefineStoreResult<S extends ZodType> {
  store: Store<z.infer<S>>           // the store instance
  schema: S                          // the Zod schema
  select: SelectorTree<z.infer<S>>   // auto-generated selector tree
}
```

### Store Interface

Every store exposes these methods:

```typescript
interface Store<T> {
  // Identity
  readonly name: string

  // Read
  getState(): T
  get<V>(path?: string): V
  has(path: string): boolean

  // Write (all require Actor)
  set(path: string, value: unknown, actor: Actor): void
  update(fn: (draft: T) => void, actor: Actor): void
  reset(value: T, actor: Actor): void
  delete(path: string, actor: Actor): void

  // Subscribe
  subscribe(listener: Listener<T>, path?: string): Unsubscribe

  // Conditions
  getWhen(): Record<string, boolean>
  isWhen(name: string): boolean
  getGates(): Record<string, boolean>
  isGated(name: string): boolean

  // Computed
  computed<V>(name: string): V
  getComputed(): Record<string, unknown>

  // Properties
  getProperties(): Record<string, boolean>

  // Transitions (only if transitions declared)
  canTransition?(from: string, to: string): boolean
  validTargets?(from?: string): string[]

  // Selectors (only if schema provided)
  readonly select?: SelectorTree<T>

  // Optimistic
  optimistic(options: OptimisticOptions<T>): Promise<OptimisticResult>

  // Undo/Redo (only if undo configured)
  undo(count?: number, actor?: Actor): number
  redo(count?: number, actor?: Actor): number
  canUndo(): boolean
  canRedo(): boolean

  // Metadata
  getDependencies(): StoreDependencies
  getSchema(): ZodType<T> | undefined
  getHistory(): Action[]

  // Lifecycle
  destroy(): void
}
```

### createStore (low-level)

For cases where you need direct control without `defineStore`:

```typescript
function createStore<T>(options: StoreOptions<T>): Store<T>

interface StoreOptions<T> {
  name: string
  initial: T
  stateSchema?: ZodType<T>           // Zod validation
  schema?: FlowSchema                // flow state definitions
  when?: Record<string, (state: T) => boolean>
  gates?: Record<string, (state: T) => boolean>
  computed?: Record<string, (state: T) => unknown>
  properties?: Record<string, (state: T) => boolean>
  transitions?: Record<string, string>
  effects?: Record<string, EffectDeclaration<T>>
  persist?: PersistOptions<T>
  undo?: { limit: number }
  publishes?: Record<string, PublishCondition<T>>
  subscribes?: Record<string, StoreEventHandler>
  validate?: Record<string, (value: any, state?: T) => boolean>
  middleware?: Middleware[]
  transforms?: Record<string, Transform>
  dependencies?: StoreDependencies
  historyLimit?: number              // default: 10000
  batchMs?: number                   // default: 0
}
```

### Registry

```typescript
const storeRegistry: StoreRegistry

interface StoreRegistry {
  get<T>(name: string): Store<T> | undefined
  getAll(): Map<string, Store>
  has(name: string): boolean
  register(store: Store): void
  unregister(name: string): void
  clear(): void
  impactOf(storeName: string): ImpactAnalysis
  introspect(): SystemIntrospection
}

function getStore<T>(name: string): Store<T> | undefined
function getAllStores(): Map<string, Store>
```

### Actors

```typescript
function createHumanActor(name: string): Actor
function createAgentActor(config: { name: string; model?: string; permissions?: Permission[] }): Actor
function createSystemActor(name?: string): Actor
function getDefaultActor(): Actor
function canAct(actor: Actor, action: PermissionAction, path: string): boolean
function withStatus(actor: Actor, status: ActorStatus): Actor

interface Actor {
  id: string
  type: 'human' | 'agent' | 'system'
  name: string
  permissions?: Permission[]
  status?: 'idle' | 'thinking' | 'acting' | 'waiting' | 'error'
  meta?: Record<string, unknown>
}

interface Permission {
  paths: string[]                    // glob patterns: 'ui.*', 'todos.items', '*'
  actions: ('read' | 'write' | 'delete')[]
}
```

### Flows

```typescript
function createFlow(options: FlowOptions): Flow

interface FlowOptions {
  name: string
  mode?: 'separate' | 'together'    // default: 'separate'
  states: string[]
  initial: string
  children?: Record<string, FlowOptions>
}

interface Flow {
  readonly name: string
  readonly mode: 'separate' | 'together'
  current(): string
  go(state: string, actor: Actor): void
  has(state: string): boolean
  states(): string[]
  resolve(path: string): Flow | undefined
  activeChain(): string[]
  children(): Record<string, Flow>
  subscribe(listener: (current: string, prev: string, actor: Actor) => void): Unsubscribe
  getHistory(): Array<{ from: string; to: string; actor: Actor; timestamp: number }>
}
```

### Modes (Discriminated Unions)

```typescript
function extractModes(schema: any): ModeInfo | null
function createModeError(storeName: string, currentMode: string, attemptedState: any, discriminant: string): string
function deriveGatesFromModes(modeInfo: ModeInfo): Record<string, (state: any) => boolean>
function deriveWhenFromModes(modeInfo: ModeInfo): Record<string, (state: any) => boolean>

interface ModeInfo {
  discriminant: string
  modeNames: string[]
}
```

### Selectors

```typescript
function buildSelectorTree<T>(schema: ZodType<T>, prefix?: string): SelectorTree<T>

type SelectorNode<V = any> = {
  $path: string
  $select: (state: any) => V
}
// SelectorTree recursively maps schema fields to SelectorNodes
```

### Transitions

```typescript
function createTransitionGraph(transitions: Record<string, string>): TransitionGraph

interface TransitionGraph {
  canTransition(from: string, to: string): boolean
  validTargets(from: string): string[]
  transitionName(from: string, to: string): string | undefined
  validate(allModes: string[]): { warnings: string[]; errors: string[] }
}
```

### Optimistic Updates

```typescript
interface OptimisticOptions<T> {
  apply: (draft: T) => void                              // immediate mutation
  commit: () => Promise<unknown>                          // async confirmation
  reconcile?: (draft: T, response: unknown) => void       // merge server response
  actor: Actor
}

interface OptimisticResult {
  success: boolean
  error?: Error
}
```

### Effects

```typescript
interface EffectDeclaration<T> {
  watch: string                  // dot-path or "modeA -> modeB"
  handler: (context: EffectContext<T>) => Promise<void> | void
  debounce?: number              // ms, default: 0
  retry?: { max: number; backoff?: 'linear' | 'exponential' }
}

interface EffectContext<T> {
  state: T
  prevState: T
  store: Store<T>
  signal: AbortSignal
  actor: Actor
}

type EffectStatus = 'idle' | 'running' | 'debouncing' | 'retrying' | 'error'

function createEffectRunner<T>(declarations: Record<string, EffectDeclaration<T>>): EffectRunner<T>
```

### Pub/Sub

```typescript
const eventBus: EventBus

type PublishCondition<T = any> = (prev: T, next: T) => boolean

type StoreEventHandler = (context: {
  event: string
  source: string
  store: Store
  actor: Actor
}) => void | Promise<void>

interface EventBus {
  registerPublisher(storeName: string, events: Record<string, PublishCondition>): void
  registerSubscriber(storeName: string, subscriptions: Record<string, StoreEventHandler>): void
  checkAndEmit(storeName: string, prev: unknown, next: unknown): void
  getGraph(): Record<string, { publishers: string[]; subscribers: string[] }>
  unregister(storeName: string): void
  clear(): void
}
```

### Persistence

```typescript
interface PersistOptions<T> {
  key: string                                    // storage key
  storage?: StorageAdapter                       // default: in-memory
  paths?: string[]                               // partial persist (default: full state)
  version?: number                               // schema version
  migrate?: (persisted: unknown, version: number) => T
  debounceMs?: number                            // default: 100
}

interface StorageAdapter {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
}

function createMemoryStorage(): StorageAdapter
function createPersistMiddleware<T>(options: PersistOptions<T>, schema?: ZodType<T>): {
  middleware: Middleware
  hydrate: () => T | undefined
}
```

### Migrations

```typescript
function applyMigration<T>(store: Store<T>, plan: MigrationPlan, actor: Actor): MigrationResult

interface MigrationPlan {
  add?: Record<string, { schema: ZodType; default: unknown }>
  remove?: string[]
  rename?: Record<string, string>                // old path → new path
  transform?: Record<string, (value: unknown) => unknown>
}

interface MigrationResult {
  success: boolean
  errors: string[]
}
```

### Introspection

```typescript
function introspectStore(store: Store): StoreIntrospection
function introspectSystem(registry: StoreRegistry): SystemIntrospection

interface StoreIntrospection {
  name: string
  state: unknown
  when: Record<string, boolean>
  gates: Record<string, boolean>
  computed: Record<string, unknown>
  dependencies: StoreDependencies
  historyLength: number
}

interface SystemIntrospection {
  stores: Record<string, StoreIntrospection>
  storeNames: string[]
  storeCount: number
}
```

### Middleware

```typescript
interface Middleware {
  name: string
  enter?: (action: Action, state: any) => Action | null    // null = cancel
  leave?: (action: Action, prevState: any, nextState: any) => void
}
```

### Fetcher

```typescript
function createFetcher<T>(options: FetcherOptions<T>): Fetcher<T>

interface FetcherOptions<T> {
  name: string
  fn: () => Promise<T>
  schema?: ZodType<T>
  cacheTtl?: number              // ms, default: 0
  actor?: Actor
}

interface Fetcher<T> {
  readonly name: string
  getState(): FetchState<T>
  fetch(): Promise<T>
  refetch(): Promise<T>
  invalidate(): void
  bind(store: Store, storePath?: string): BoundFetcher<T>
}

interface FetchState<T> {
  data: T | null
  error: Error | null
  status: 'idle' | 'loading' | 'success' | 'error'
  fetchedAt: number | null
  isStale: boolean
}
```

### Path Utilities

```typescript
function getPath(obj: any, path: string): any
function setPath(obj: any, path: string, value: any): void
function deletePath(obj: any, path: string): void
function hasPath(obj: any, path: string): boolean
function matchPath(pattern: string, path: string): boolean   // glob matching
```

### Together (multi-store coordination)

```typescript
function together(options: TogetherOptions): Together

interface Together {
  readonly name: string
  readonly stores: Record<string, Store>
  readonly flow?: Flow
  store<T>(key: string): Store<T>
  destroy(): void
}
```

---

## React: `stackpack-state/react`

### Hooks

```typescript
// Full store access
function useStore<T>(name: string, actor?: Actor): {
  value: T
  change: (path: string, value: unknown, actor?: Actor) => void
  update: (fn: (draft: T) => void, actor?: Actor) => void
  reset: (value: T, actor?: Actor) => void
  has: (path: string) => boolean
  when: Record<string, boolean>
  history: Action[]
}

// Fine-grained reads
function useValue<V>(storeName: string, path?: string): V
function useComputed<V>(storeName: string, name: string): V

// Mutations
function useChange(storeName: string, actor?: Actor): (path: string, value: unknown) => void
function useUpdate<T>(storeName: string, actor?: Actor): (fn: (draft: T) => void) => void

// Conditions
function useWhen(storeName: string): Record<string, boolean>
function useGate(storeName: string, gateName?: string): Record<string, boolean> | boolean

// Flows
function useFlow(storeName: string, actor?: Actor): {
  current: string
  has: (path: string) => boolean
  go: (path: string, state: string) => void
}

// Advanced
function useActor(actor?: Actor): Actor
function useAgentStatus(storeName: string, agentId: string): string | undefined
function useStoreListener<T>(storeName: string, listener: Listener<T>, path?: string): void
```

### Presence Hooks

```typescript
// Single-item presence (boolean gate → animated mount/unmount)
function usePresence(
  storeName: string,
  gateName: string,
  options?: { timeout?: number }       // default: 300ms
): UsePresenceResult

interface UsePresenceResult {
  isPresent: boolean                    // true during entering, present, AND leaving
  phase: 'entering' | 'present' | 'leaving' | null
  done: () => void                     // signal leave animation complete
  entered: () => void                  // signal enter animation complete
  ref: React.RefCallback<HTMLElement>  // auto-detects CSS transitionend
}

// List presence (array items → per-item animated enter/leave)
function usePresenceList<T>(
  storeName: string,
  path: string,                        // dot-path to array in store state
  options?: {
    timeout?: number                   // leave timeout in ms (default: 300)
    keyFn?: (item: T) => string        // extract stable key (default: item.id)
  }
): UsePresenceListResult<T>

interface UsePresenceListResult<T> {
  items: PresenceRecord<T>[]           // all items including departing ones
  done: (key: string) => void          // signal item's leave animation done
  entered: (key: string) => void       // signal item's enter animation done
  flush: () => void                    // remove all leaving items immediately
}

interface PresenceRecord<T> {
  key: string                          // stable identity
  value: T                             // actual data (frozen at leave time for leaving items)
  phase: 'entering' | 'present' | 'leaving'
  at: number                           // timestamp when phase started
}
```

**When to use which:**
- `usePresence` — single boolean gate: modals, panels, toasts
- `usePresenceList` — array of items: todo lists, notifications, cards
- `<Presence>` component — render-prop wrapper around `usePresence`

**Important:** Iterate over `presence.items` (not the raw store array) to render — it includes items in the `leaving` phase that are already removed from the store but still need to render for their exit animation.

### Components

```tsx
// Conditional mounting (immediate unmount when gate closes)
<Gated store="storeName" gate="gateName" fallback={<Fallback />}>
  {children}
</Gated>

// Animated conditional mounting (deferred unmount for leave animation)
<Presence store="storeName" gate="gateName" timeout={300}>
  {({ phase, done, entered, ref }) => (
    <div ref={ref} className={`element element--${phase}`}>
      {children}
    </div>
  )}
</Presence>

// Store providers
<StoreProvider store={myStore}>{children}</StoreProvider>
<MultiStoreProvider stores={[store1, store2]}>{children}</MultiStoreProvider>
```

### Fetch Hook

```typescript
function useFetch<T>(options: UseFetchOptions<T>): UseFetchResult<T>

interface UseFetchOptions<T> {
  key: string
  fn: () => Promise<T>
  schema?: ZodType<T>
  cacheTtl?: number
}

interface UseFetchResult<T> {
  data: T | null
  isLoading: boolean
  error: Error | null
  refetch: () => Promise<void>
}
```

---

## Components: `stackpack-state/components`

### Pre-built Components

```typescript
import { Loadable, Paginated, Filterable, Selectable, composeStore } from 'stackpack-state/components'
```

| Component | Schema Fields | Conditions |
|-----------|--------------|------------|
| `Loadable` | `isLoading: boolean`, `error: string \| null` | when: `isLoading`, `hasError`. gates: `isLoaded`, `hasError` |
| `Paginated` | `page: number`, `pageSize: number`, `total: number` | when: `isFirstPage`, `isLastPage`. computed: `totalPages`, `hasNextPage`, `hasPrevPage` |
| `Filterable` | `filter: string`, `sortBy: string`, `sortOrder: 'asc' \| 'desc'` | when: `hasFilter`, `isAscending` |
| `Selectable` | `selectedIds: string[]` | when: `hasSelection`. computed: `selectedCount` |

### composeStore

```typescript
function composeStore(options: {
  name: string
  schema: ZodObject<any>
  components: ComponentDefinition[]
  initial: any
  when?: Record<string, Function>
  gates?: Record<string, Function>
  computed?: Record<string, Function>
  middleware?: Middleware[]
  dependencies?: StoreDependencies
}): DefineStoreResult<any>
```

Merges component schemas, conditions, and initial values. Detects field conflicts. User-provided when/gates/computed override component ones.
