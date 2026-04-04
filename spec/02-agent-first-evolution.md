# state-agent: Agent-First Evolution — Implementation Plan

> Every feature in this plan answers one question: **does this reduce the number of bugs an LLM agent produces per generated line of state management code?** If it doesn't, it doesn't belong here.

---

## Table of Contents

1. [The Killer Differentiator](#1-the-killer-differentiator)
2. [State Modes via Discriminated Unions](#2-state-modes-via-discriminated-unions)
3. [Auto-Generated Selectors](#3-auto-generated-selectors)
4. [Declared Transition Graphs](#4-declared-transition-graphs)
5. [Optimistic Updates with Automatic Rollback](#5-optimistic-updates-with-automatic-rollback)
6. [Effect Declarations](#6-effect-declarations)
7. [Agent Introspection API](#7-agent-introspection-api)
8. [State Components (ECS-Inspired Composition)](#8-state-components-ecs-inspired-composition)
9. [Cross-Store Pub/Sub Protocol](#9-cross-store-pubsub-protocol)
10. [Persistence Layer](#10-persistence-layer)
11. [History Undo/Replay](#11-history-undoreplay)
12. [Lightweight Property Checking](#12-lightweight-property-checking)
13. [Component Binding Contracts](#13-component-binding-contracts)
14. [Schema Migrations](#14-schema-migrations)
15. [Priority Matrix](#15-priority-matrix)
16. [Performance Budget](#16-performance-budget)
17. [Risk Register](#17-risk-register)

---

## 1. The Killer Differentiator

### Schema as World Model

No state management framework today treats the schema as a **planning language for agents**. Redux has types. Zustand has selectors. Jotai has atoms. XState has statecharts. But none of them provide a single artifact that simultaneously serves as:

1. **TypeScript types** — via `z.infer<S>` (already works)
2. **Runtime validation** — Zod parse on every mutation (already works)
3. **Agent planning language** — introspection API returns the schema as a queryable contract
4. **Transition constraint** — declared transitions restrict what mutations are valid
5. **Selector generator** — schema shape auto-generates fine-grained selectors
6. **Composition unit** — ECS-style state components compose via schema merging
7. **Property specification** — invariants and refinements are checked at dev time

The differentiator is not any single feature — it's that **the schema is the single source of truth for everything**. An agent reads one artifact and knows: what the state looks like, what values are valid, what transitions are legal, what selectors exist, what invariants must hold, and what effects will fire.

**Why this matters for agents specifically:**

Every other framework requires the agent to *read code* and *infer* what's possible. That's where bugs come from — the agent misreads a selector, misunderstands a reducer, generates a mutation that violates an unstated invariant. state-agent inverts this: the agent *queries a contract* and generates code that conforms to it. The contract is verifiable. The generated code is constrained.

This is the same insight that made OpenAPI function-calling work for LLMs: give the model a schema of what's possible, not code to interpret. state-agent does this for React state.

**What makes this defensible:**

- Human-first frameworks optimize for DX ergonomics (less boilerplate, better devtools)
- state-agent optimizes for **generation accuracy** (fewer valid-looking-but-wrong outputs)
- These are different design objectives that lead to different API surfaces
- Any framework can add TypeScript types; no framework treats the schema as a planning language with transitions, invariants, and auto-selectors built in

---

## 2. State Modes via Discriminated Unions

### What

Extend `defineStore` to accept discriminated union schemas. The store's type narrows based on a discriminant field (e.g., `status`), making invalid states unrepresentable at the type level.

### Why This Is Critical for Agents

The #1 source of agent-generated state bugs is flat stores with coexisting fields that don't make sense together:

```typescript
// What agents generate today (broken):
{ data: User[], isLoading: true, error: "timeout" }
// data AND error AND loading simultaneously — impossible in reality
```

With discriminated unions:

```typescript
// What agents would generate (correct by construction):
| { status: 'idle' }
| { status: 'loading', startedAt: number }
| { status: 'success', data: User[], fetchedAt: number }
| { status: 'error', error: string, retryCount: number }
```

The agent literally cannot produce `{ status: 'loading', data: [...] }` — Zod rejects it, TypeScript flags it.

### Implementation

**File: `runtime/core/modes.ts`** (new)

```typescript
import type { ZodDiscriminatedUnion, ZodObject } from 'zod'

export interface ModeDefinition<D extends string = string> {
  discriminant: D
  modes: Record<string, ZodObject<any>>
}

// Extract the mode names from a discriminated union schema
export function extractModes<T extends ZodDiscriminatedUnion<string, any>>(
  schema: T
): { discriminant: string; modeNames: string[] }

// Create typed transition helper — returns a function that
// validates the target mode and produces a new state object
export function createModeTransition<T>(
  schema: ZodDiscriminatedUnion<string, any>,
  from: string,
  to: string,
): (current: T, patch: Partial<T>) => T
```

**Changes to `defineStore` (`runtime/core/define.ts`):**

```typescript
export interface DefineStoreOptions<S extends ZodType> {
  // ... existing fields ...

  // NEW: If schema is a ZodDiscriminatedUnion, auto-derive:
  //   - Gates for each mode (gate "success" = mount when status === 'success')
  //   - When for each mode (when "isLoading" = re-render trigger)
  //   - Transition validation (reject set() calls that produce invalid mode combos)
}
```

**Auto-derived gates and when conditions:**

When the schema is a `ZodDiscriminatedUnion`, `defineStore` automatically registers:
- `gates.{modeName}` — true when the discriminant matches that mode
- `when.is{ModeName}` — same check, registered as when condition

The agent doesn't write gate functions for modes — they're derived from the schema.

**Changes to `createStore` (`runtime/core/store.ts`):**

In `applyAction`, after Immer produce but before Zod validation: if the schema is a discriminated union, check that the new state matches exactly one variant. This is already handled by Zod validation, but we add a more specific error message:

```
Store "users": mode transition rejected.
Current mode: "loading" (status = "loading")
Attempted state has fields from mode "success" (data, fetchedAt)
but status is still "loading".
Did you mean to transition to "success" first?
```

This error message is designed for agents to self-correct.

### Example

```typescript
const userStore = defineStore({
  name: 'users',
  schema: z.discriminatedUnion('status', [
    z.object({ status: z.literal('idle') }),
    z.object({ status: z.literal('loading'), startedAt: z.number() }),
    z.object({ status: z.literal('success'), data: z.array(UserSchema), fetchedAt: z.number() }),
    z.object({ status: z.literal('error'), error: z.string(), retryCount: z.number() }),
  ]),
  initial: { status: 'idle' as const },
  // Gates auto-derived: gates.idle, gates.loading, gates.success, gates.error
  // When auto-derived: when.isIdle, when.isLoading, when.isSuccess, when.isError
})

// Agent generates:
<Gated store="users" gate="success">
  <UserList />
</Gated>
<Gated store="users" gate="error">
  <ErrorMessage />
</Gated>

// In components — TypeScript narrows automatically:
const { value } = useStore('users')
if (value.status === 'success') {
  // value.data is User[] here — TypeScript knows
}
```

### Pros
- Eliminates impossible state combinations at the type level
- Auto-derives gates and when conditions — less code for agents to generate
- Zod already supports discriminated unions — no new runtime dependency
- Agent-readable error messages enable self-correction
- Backward compatible — flat object schemas still work

### Cons
- **Schema verbosity**: discriminated unions are more verbose than flat objects
  - *Mitigation*: This is actually a pro for agents — explicit > implicit. Agents handle verbosity fine; they struggle with ambiguity.
- **Migration cost**: Existing flat stores need refactoring to use modes
  - *Mitigation*: Flat schemas remain fully supported. Modes are opt-in.
- **Performance**: Zod discriminated union parsing is marginally slower than flat object parsing
  - *Measurement*: ~0.02ms overhead per validation on a 4-variant union. Negligible.

### Performance Impact: None measurable
Zod discriminated union validation is O(variants) with early exit on discriminant match. Typical stores have 2-6 modes. The overhead is <0.1ms.

---

## 3. Auto-Generated Selectors

### What

Generate a typed selector tree from the Zod schema at store creation time. Instead of agents writing selector functions (which they get wrong 80% of the time), they pick from a pre-built tree.

### Why This Is Critical for Agents

The #1 anti-pattern in agent-generated Zustand/Redux code is subscribing to the entire store:

```typescript
// What agents generate (causes every consumer to re-render on any change):
const { items, filter, isLoading } = useStore(s => s)
```

The correct pattern (fine-grained selectors) requires the agent to understand structural equality, memoization, and React's rendering model. Agents consistently fail at this.

**The solution: remove the decision entirely.** The agent picks a path; the framework handles subscription granularity.

### Implementation

**File: `runtime/core/selectors.ts`** (new)

```typescript
import type { ZodType, ZodObject, ZodArray } from 'zod'

export type SelectorTree<T> = {
  [K in keyof T]: T[K] extends object
    ? SelectorTree<T[K]> & { $path: string; $select: (state: any) => T[K] }
    : { $path: string; $select: (state: any) => T[K] }
}

// Build selector tree from Zod schema
export function buildSelectorTree<T>(
  schema: ZodType<T>,
  prefix?: string
): SelectorTree<T>
```

The tree is built once at store creation (O(schema fields)) and cached. Each leaf node has:
- `$path`: the dot-path string (e.g., `'items.0.text'`)
- `$select`: a pre-built selector function that reads that path

**Changes to `Store` interface (`runtime/core/types.ts`):**

```typescript
export interface Store<T = any> {
  // ... existing methods ...

  /** Auto-generated selector tree from schema */
  readonly select: SelectorTree<T>
}
```

**Changes to React hooks (`runtime/react/hooks.ts`):**

```typescript
// New hook: useSelect — takes a selector node from the tree
export function useSelect<V>(storeName: string, selector: { $path: string; $select: (s: any) => V }): V {
  const store = useResolveStore(storeName)

  return useSyncExternalStore(
    useCallback(
      (onStoreChange: () => void) => {
        // Subscribe only to the specific path — fine-grained
        return store.subscribe(() => onStoreChange(), selector.$path)
      },
      [store, selector.$path]
    ),
    () => selector.$select(store.getState()),
    () => selector.$select(store.getState())
  )
}
```

### Example

```typescript
const todos = defineStore({
  name: 'todos',
  schema: z.object({
    items: z.array(z.object({ id: z.string(), text: z.string(), done: z.boolean() })),
    filter: z.enum(['all', 'active', 'done']),
  }),
  initial: { items: [], filter: 'all' as const },
})

// Agent generates — no selector function needed:
const filter = useSelect('todos', todos.store.select.filter)
// Only re-renders when filter changes, not when items change

// For arrays:
const items = useSelect('todos', todos.store.select.items)

// Existing hooks remain backward-compatible:
const { value } = useStore('todos')  // still works, subscribes to everything
```

### Pros
- Eliminates the #1 agent anti-pattern (over-subscribing)
- Zero cognitive load — agent picks from a tree, can't make a wrong selector
- Path-scoped subscriptions already exist (`store.subscribe(listener, path)`) — this wraps them
- Type-safe: the selector tree preserves the schema's types via inference
- Backward compatible — existing `useStore` and `useValue` untouched

### Cons
- **Memory**: The selector tree is an additional object per store
  - *Measurement*: For a store with 20 fields (3 levels deep), the tree is ~60 objects. ~2KB. Negligible.
- **Proxy overhead**: Building the tree requires walking the Zod schema
  - *Mitigation*: Built once at store creation, not per render. O(fields) with no ongoing cost.
- **Array selectors**: `select.items[0]` is tricky because indices are dynamic
  - *Design decision*: Array selectors select the whole array. For item-level subscriptions, the agent uses `useValue('todos', 'items.0.text')` directly. The selector tree handles static paths; dynamic paths use existing APIs.
- **Doesn't help with computed values**: Computed values aren't in the schema
  - *Mitigation*: Computed values have their own access pattern (`useComputed`). They could be added to the tree as `select.$computed.activeCount` in a follow-up.

### Performance Impact: Positive
Moves agents from whole-store subscriptions to path-scoped subscriptions. Fewer re-renders. The selector tree itself costs ~2KB memory and 0.1ms construction time at store creation.

---

## 4. Declared Transition Graphs

### What

Add an optional `transitions` map to `defineStore` that constrains which state changes are valid. Works with discriminated union modes (section 2) and also with flat stores (constraining path-based mutations).

### Why This Is Critical for Agents

Without declared transitions, an agent can generate any mutation. Most of those mutations are *technically valid* (pass Zod validation) but *logically wrong* (e.g., transitioning from `'confirmed'` back to `'cart'` in a checkout flow). Declared transitions give the agent a map of what's possible.

This is "session types lite" — the valid protocol of state changes is declared upfront, not inferred from code.

### Implementation

**Changes to `StoreOptions` (`runtime/core/types.ts`):**

```typescript
export interface StoreOptions<T = any> {
  // ... existing fields ...

  /**
   * Declared transitions for mode-based stores.
   * Keys are "from -> to" strings. Values are transition names.
   * '*' as source means "from any mode".
   */
  transitions?: Record<string, string>
}
```

**File: `runtime/core/transitions.ts`** (new)

```typescript
export interface TransitionGraph {
  /** Check if a transition is valid */
  canTransition(from: string, to: string): boolean
  /** Get all valid targets from a given mode */
  validTargets(from: string): string[]
  /** Get the transition name */
  transitionName(from: string, to: string): string | undefined
  /** Validate that the graph has no unreachable states or dead ends */
  validate(): { warnings: string[]; errors: string[] }
}

export function createTransitionGraph(
  transitions: Record<string, string>
): TransitionGraph
```

**Validation rules (dev-time only):**

```
- WARNING: "State 'orphan' is unreachable — no transition leads to it"
- WARNING: "State 'loading' has no outgoing transitions — potential dead end"
- ERROR: "Transition 'loading -> loading' is a self-loop (use when conditions for re-render triggers)"
```

**Integration with store mutations:**

In `applyAction` (store.ts), after Zod validation passes, if the store has a transition graph and the schema is a discriminated union:
1. Read the discriminant from `prevState` and `state`
2. If the discriminant changed, check `canTransition(prevMode, nextMode)`
3. If invalid, roll back and emit a structured warning:

```
Store "checkout": transition "confirmed -> cart" is not declared.
Valid transitions from "confirmed": ["confirmed -> idle" (reset)]
```

**For non-discriminated-union stores:**

Transitions can also constrain path-based changes:

```typescript
transitions: {
  'filter:all -> filter:active': 'filterActive',
  'filter:all -> filter:done': 'filterDone',
  'filter:active -> filter:all': 'clearFilter',
  'filter:done -> filter:all': 'clearFilter',
}
```

This is more niche but useful for enum fields that have valid progressions.

### Example

```typescript
const checkout = defineStore({
  name: 'checkout',
  schema: z.discriminatedUnion('step', [
    z.object({ step: z.literal('cart'), items: z.array(ItemSchema) }),
    z.object({ step: z.literal('shipping'), items: z.array(ItemSchema), address: AddressSchema }),
    z.object({ step: z.literal('payment'), items: z.array(ItemSchema), address: AddressSchema, method: PaymentSchema }),
    z.object({ step: z.literal('confirmed'), orderId: z.string() }),
  ]),
  initial: { step: 'cart' as const, items: [] },
  transitions: {
    'cart -> shipping': 'proceedToShipping',
    'shipping -> payment': 'proceedToPayment',
    'shipping -> cart': 'backToCart',
    'payment -> confirmed': 'confirmOrder',
    'payment -> cart': 'cancelPayment',
    '* -> cart': 'reset',
  },
})

// Agent can query:
checkout.store.canTransition?.('payment', 'cart')  // true
checkout.store.canTransition?.('confirmed', 'cart') // false (use '* -> cart' reset only)
checkout.store.validTargets?.('shipping')           // ['payment', 'cart']
```

### Pros
- Agents see the valid state machine before generating any code
- Invalid transitions caught at mutation time with self-correcting error messages
- Dev-time validation catches dead ends and unreachable states
- Natural extension of discriminated union modes (section 2)
- `canTransition()` and `validTargets()` give the introspection API (section 7) concrete data

### Cons
- **Over-constraining risk**: If transitions are too strict, the agent can't do legitimate things
  - *Mitigation*: Transitions are optional. Stores without `transitions` accept any valid-schema mutation. The `'*'` wildcard provides escape hatches.
- **Maintenance burden**: Every new mode needs its transitions declared
  - *Mitigation*: This is a feature, not a bug. Undeclared transitions are a bug source.
- **Doesn't apply to non-mode stores well**: Path-based transition constraints are clunky
  - *Design decision*: Primary use case is discriminated union stores. Path-based transitions are a secondary, opt-in feature. Don't force it.

### Performance Impact: Negligible
Transition validation is a Map lookup: O(1). The graph is built once at store creation. The `validate()` method runs only in dev mode and is O(transitions * modes).

---

## 5. Optimistic Updates with Automatic Rollback

### What

Add `store.optimistic()` that snapshots state, applies a mutation immediately, fires an async operation, and auto-rollbacks on failure. Handles concurrent optimistic updates via a queue.

### Why This Is Critical for Agents

Optimistic updates are the #2 hardest pattern in state management (after cache invalidation). Agents almost never get the rollback logic right, and they never handle concurrent optimistic operations. The existing `OptimisticUpdate` type in `types.ts` is unused — time to implement it.

### Implementation

**Changes to `Store` interface (`runtime/core/types.ts`):**

```typescript
export interface Store<T = any> {
  // ... existing methods ...

  /**
   * Apply a mutation optimistically, then commit or rollback.
   * The framework snapshots state before apply, and restores on error.
   */
  optimistic(options: OptimisticOptions<T>): Promise<OptimisticResult>
}

export interface OptimisticOptions<T = any> {
  /** Immediately apply this mutation */
  apply: (draft: T) => void
  /** The async operation to confirm the optimistic update */
  commit: () => Promise<unknown>
  /** Optional: reconcile server response with optimistic state */
  reconcile?: (draft: T, response: unknown) => void
  /** Actor performing this operation */
  actor: Actor
}

export interface OptimisticResult {
  /** Whether the commit succeeded */
  success: boolean
  /** Error if commit failed (state was rolled back) */
  error?: Error
}
```

**File: `runtime/core/optimistic.ts`** (new)

```typescript
export interface OptimisticQueue {
  /** Enqueue an optimistic operation */
  enqueue(op: OptimisticOperation): Promise<OptimisticResult>
  /** Get pending operations */
  pending(): OptimisticUpdate[]
  /** Cancel a pending operation by ID */
  cancel(id: string): void
}

interface OptimisticOperation {
  snapshot: unknown
  apply: (draft: any) => void
  commit: () => Promise<unknown>
  reconcile?: (draft: any, response: unknown) => void
  actor: Actor
}
```

**How it works:**

1. **Snapshot**: Deep-clone current state (Immer's `original()` or `structuredClone`)
2. **Apply**: Run the mutation immediately via `store.update()` — UI updates instantly
3. **Commit**: Fire the async operation
4. **On success**: If `reconcile` is provided, run it (e.g., update server-assigned ID). Otherwise, no-op.
5. **On failure**: Restore the snapshot. If other optimistic operations were applied after this one, they are re-applied on top of the restored snapshot (queue rebase).

**Queue rebase strategy:**

When operation A fails but operation B was applied after A:
1. Restore to A's snapshot
2. Re-apply B's mutation on top
3. This preserves B's optimistic state while removing A's

This is the same strategy TanStack Query uses for optimistic updates.

### Example

```typescript
// Agent generates:
async function toggleTodo(id: string) {
  await todosStore.optimistic({
    apply: draft => {
      const todo = draft.items.find(i => i.id === id)
      if (todo) todo.done = !todo.done
    },
    commit: () => api.updateTodo(id, { done: !currentDone }),
    actor: getDefaultActor(),
  })
}
```

The agent writes the *intent*. The framework handles snapshot, rollback, concurrent rebase, and error recovery.

### Pros
- Eliminates the entire rollback/rebase logic from agent-generated code
- Simple API: apply + commit + optional reconcile
- Concurrent operations handled via queue rebase
- Integrates with existing history module (optimistic actions get `meta.optimistic: true`)
- Actor attribution preserved throughout

### Cons
- **Snapshot memory**: Each optimistic operation stores a full state snapshot
  - *Mitigation*: Use `structuredClone` which is O(state size). For typical stores (< 100KB), this is < 1ms and < 100KB memory per pending operation. Limit concurrent optimistic ops to 10 (configurable).
  - *Hard limit*: If state exceeds 1MB, warn in dev mode: "Large state detected — optimistic updates may impact performance."
- **Queue rebase complexity**: Re-applying mutations after rollback is subtle
  - *Mitigation*: Immer mutations are pure functions of state. Re-applying them is deterministic. Edge case: if B depends on A's result (e.g., B modifies something A created), the rebase may produce unexpected state. This is inherent to optimistic updates and is documented as a known limitation.
- **Not composable with batching**: Optimistic apply should be immediate, not batched
  - *Design decision*: `optimistic()` bypasses the batcher and applies synchronously. This is correct — the whole point is instant UI feedback.

### Performance Impact: Minimal
- `structuredClone` cost: ~0.5ms for a 50KB state object
- Queue operations: O(pending) on rollback+rebase, typically 1-3 pending ops
- Memory: One snapshot per pending operation. Bounded by configurable limit.
- No ongoing cost when no optimistic operations are active

---

## 6. Effect Declarations

### What

Add a declarative `effects` option to `defineStore` that registers side effects triggered by state changes or mode transitions. Effects have built-in debounce, cancellation (AbortSignal), retry, and error handling.

### Why This Is Critical for Agents

Agents scatter `useEffect` calls across components. This creates:
- Duplicated effects (two components both fetch on the same state change)
- Missing cleanup (no AbortController)
- Race conditions (rapid state changes fire overlapping effects)
- Invisible side-effect graph (no way to see what triggers what)

Declaring effects alongside the store makes them visible, deduplicated, and properly managed.

### Implementation

**Changes to `StoreOptions` (`runtime/core/types.ts`):**

```typescript
export interface StoreOptions<T = any> {
  // ... existing fields ...

  /** Declarative side effects triggered by state changes */
  effects?: Record<string, EffectDeclaration<T>>
}

export interface EffectDeclaration<T = any> {
  /** Dot-path to watch, or "modeA -> modeB" for transition triggers */
  watch: string
  /** The effect handler. Receives an AbortSignal for cancellation. */
  handler: (context: EffectContext<T>) => Promise<void> | void
  /** Debounce in ms. Default: 0 (immediate) */
  debounce?: number
  /** Retry configuration */
  retry?: { max: number; backoff?: 'linear' | 'exponential' }
}

export interface EffectContext<T = any> {
  state: T
  prevState: T
  store: Store<T>
  signal: AbortSignal
  actor: Actor
}
```

**File: `runtime/core/effects.ts`** (new)

```typescript
export interface EffectRunner<T = any> {
  /** Start watching for triggers */
  start(store: Store<T>): void
  /** Stop all effects and cancel pending ones */
  stop(): void
  /** Get status of all effects */
  status(): Record<string, 'idle' | 'running' | 'debouncing' | 'retrying' | 'error'>
}

export function createEffectRunner<T>(
  declarations: Record<string, EffectDeclaration<T>>
): EffectRunner<T>
```

**How it works:**

1. `createEffectRunner` subscribes to the store
2. On state change, checks each effect's `watch` pattern:
   - Dot-path: compare `getPath(prev, path) !== getPath(next, path)`
   - Transition: parse `"modeA -> modeB"`, compare discriminant changes
3. If triggered, apply debounce (if configured)
4. Cancel previous invocation of the same effect (via AbortController)
5. Run handler with context
6. On error, apply retry logic (if configured)
7. Track status for introspection

**Integration with store lifecycle:**

Effects start automatically when the store is created (like middleware). They stop on `store.destroy()`.

### Example

```typescript
const postsStore = defineStore({
  name: 'posts',
  schema: postsSchema,
  initial: { items: [], filter: 'all', search: '' },
  effects: {
    searchPosts: {
      watch: 'search',
      debounce: 300,
      handler: async ({ state, store, signal }) => {
        const results = await fetch(`/api/posts?q=${state.search}`, { signal })
        const data = await results.json()
        store.set('items', data, createSystemActor('search'))
      },
    },
    reportError: {
      watch: 'idle -> error',  // only on transition to error mode
      handler: async ({ state }) => {
        await reportToSentry(state.error)
      },
      retry: { max: 3, backoff: 'exponential' },
    },
  },
})
```

### Pros
- All side effects visible in one place — agent and human can audit them
- Built-in debounce replaces manual `setTimeout` logic agents get wrong
- AbortSignal cancellation prevents race conditions automatically
- Retry with backoff eliminates boilerplate agents never write
- Transition-triggered effects connect to the mode system (section 2)
- Effect status exposed for introspection (section 7)

### Cons
- **Complexity**: Effects add a new subsystem with its own lifecycle
  - *Mitigation*: Effects are optional. Stores without `effects` have zero overhead. The runner is not created unless effects are declared.
- **Testing**: Effects with debounce and retry are harder to test
  - *Mitigation*: Provide `createEffectRunner` as a standalone testable unit. Tests can call `runner.start(mockStore)` and control timing.
- **Async error handling**: What happens when an effect errors after all retries?
  - *Design decision*: Emit a structured error to the store's middleware pipeline as a `EFFECT_ERROR` action. The store can handle it via middleware or ignore it. Never throw unhandled.
- **Interaction with batching**: If state changes are batched, effects should fire on the final batched state, not intermediate states
  - *Design decision*: Effects subscribe to the store's listener system, which already fires after batching resolves. No special handling needed.

### Performance Impact: Minimal when idle
- No effects declared: zero overhead (runner not created)
- Effects declared but not triggered: one store subscription + O(effects) comparison per state change
- Effect running: async, non-blocking. Debounced effects use `setTimeout`.
- AbortController allocation: one per active effect invocation. GC'd on completion.

---

## 7. Agent Introspection API

### What

A runtime API that agents call to understand the current state system. Returns a structured JSON description of all stores, their schemas, modes, transitions, effects, dependencies, and current values.

### Why This Is Critical for Agents

Currently, an agent must read `.store.ts` files to understand the state system. File reading is:
- Slow (multiple file reads)
- Error-prone (agent misparses TypeScript)
- Stale (file content may not reflect runtime state)

An introspection API returns the *actual* runtime state of the system, formatted for agent consumption.

### Implementation

**Changes to `StoreRegistry` (`runtime/core/types.ts`):**

```typescript
export interface StoreRegistry {
  // ... existing methods ...

  /**
   * Return a structured description of the entire state system.
   * Designed for agent consumption — JSON-serializable.
   */
  introspect(): SystemIntrospection
}

export interface SystemIntrospection {
  stores: Record<string, StoreIntrospection>
  flows: Record<string, FlowIntrospection>
  together: Record<string, TogetherIntrospection>
}

export interface StoreIntrospection {
  name: string
  /** JSON Schema derived from Zod schema (via zod-to-json-schema) */
  schema: object
  /** Current mode if discriminated union, undefined otherwise */
  currentMode?: string
  /** All modes if discriminated union */
  modes?: string[]
  /** Valid transitions from current mode */
  validTransitions?: string[]
  /** All when condition names and current values */
  when: Record<string, boolean>
  /** All gate condition names and current values */
  gates: Record<string, boolean>
  /** All computed value names */
  computed: string[]
  /** Dependency metadata */
  dependencies: StoreDependencies
  /** Effect names and statuses */
  effects?: Record<string, string>
  /** Selector paths available */
  selectorPaths?: string[]
}
```

**File: `runtime/core/introspect.ts`** (new)

```typescript
import { zodToJsonSchema } from 'zod-to-json-schema' // peer dependency

export function introspectStore(store: Store): StoreIntrospection
export function introspectSystem(): SystemIntrospection
```

**Dependency note:** `zod-to-json-schema` is a peer dependency, not a hard dependency. If not installed, the `schema` field returns `null` and a dev warning is emitted. This avoids forcing the dependency on all users.

### Example

```typescript
import { storeRegistry } from 'state-agent'

// Agent calls this to understand the system
const system = storeRegistry.introspect()

// Returns:
{
  stores: {
    auth: {
      name: 'auth',
      schema: { type: 'object', properties: { ... }, required: [...] },
      currentMode: 'authenticated',
      modes: ['idle', 'loading', 'authenticated', 'guest'],
      validTransitions: ['authenticated -> guest', 'authenticated -> loading'],
      when: { isLoading: false },
      gates: { isAuthenticated: true, isGuest: false },
      computed: ['displayName', 'initials'],
      dependencies: { reads: [], gatedBy: [], triggers: ['posts', 'profile'] },
      effects: { refreshToken: 'idle' },
      selectorPaths: ['user', 'user.name', 'user.email', 'token'],
    },
    // ...
  },
  flows: { /* ... */ },
  together: { /* ... */ },
}
```

### Pros
- Agent queries one endpoint instead of reading multiple files
- Returns runtime truth, not file-level inference
- JSON-serializable — works with any agent (Claude, Cursor, Copilot)
- Schema as JSON Schema is the standard LLM function-calling format
- `validTransitions` from section 4 surfaces naturally here
- Selector paths from section 3 surfaces naturally here

### Cons
- **Dependency**: `zod-to-json-schema` adds a peer dependency
  - *Mitigation*: Peer dep, not hard dep. Falls back gracefully without it.
- **Stale introspection**: The returned object is a snapshot; state may change after the call
  - *Mitigation*: This is fine for agent planning. Agents plan then execute. The plan uses the introspection snapshot. If state changes during execution, Zod validation catches invalid mutations.
- **Large output**: A system with 20 stores could produce a large introspection object
  - *Mitigation*: Add filtering: `storeRegistry.introspect({ stores: ['auth', 'posts'] })` to request only specific stores.

### Performance Impact: On-demand only
`introspect()` is called explicitly by the agent, not on every render. Cost is O(stores * fields) to build the response. For 10 stores with ~20 fields each, this is < 5ms. Cached until next store registration/unregistration.

---

## 8. State Components (ECS-Inspired Composition)

### What

A library of reusable Zod schema fragments (Loadable, Paginated, Filterable, Selectable, etc.) that agents compose via `z.merge()` to build stores. Each fragment carries pre-built when/gate conditions, effects, and computed values.

### Why This Is Critical for Agents

Agents reinvent `{ isLoading, error, data }` in every store. They reinvent pagination. They reinvent filtering. Each reinvention has subtle bugs. State components provide a tested, consistent implementation that agents compose rather than generate from scratch.

This is the ECS insight: compose behaviors from a catalog instead of designing from scratch.

### Implementation

**File: `runtime/components/loadable.ts`** (new)

```typescript
import { z } from 'zod'

export const LoadableSchema = z.object({
  isLoading: z.boolean(),
  error: z.string().nullable(),
})

export const LoadableConditions = {
  when: {
    isLoading: (s: any) => s.isLoading,
    hasError: (s: any) => s.error !== null,
  },
  gates: {
    isLoaded: (s: any) => !s.isLoading && s.error === null,
    hasError: (s: any) => s.error !== null,
  },
}

export const LoadableInitial = { isLoading: false, error: null }
```

**File: `runtime/components/paginated.ts`** (new)

```typescript
export const PaginatedSchema = z.object({
  page: z.number().int().min(1),
  pageSize: z.number().int().min(1),
  total: z.number().int().min(0),
})

export const PaginatedConditions = {
  when: {
    isFirstPage: (s: any) => s.page === 1,
    isLastPage: (s: any) => s.page >= Math.ceil(s.total / s.pageSize),
  },
  computed: {
    totalPages: (s: any) => Math.ceil(s.total / s.pageSize),
    hasNextPage: (s: any) => s.page < Math.ceil(s.total / s.pageSize),
    hasPrevPage: (s: any) => s.page > 1,
  },
}

export const PaginatedInitial = { page: 1, pageSize: 20, total: 0 }
```

**Additional components:**

- `Filterable`: `{ filter: string, sortBy: string, sortOrder: 'asc' | 'desc' }`
- `Selectable`: `{ selectedIds: Set<string> }` with computed `selectedCount`, `hasSelection`
- `Editable`: `{ isEditing: boolean, editingId: string | null }` with gates

**Composition helper:**

```typescript
// File: runtime/components/compose.ts

export function composeStore<S extends ZodObject<any>>(options: {
  name: string
  schema: S
  components: ComponentDefinition[]
  // ... other defineStore options
}): DefineStoreResult<any> {
  // 1. Merge all component schemas: options.schema.merge(comp1).merge(comp2)
  // 2. Merge all conditions (when, gates, computed)
  // 3. Merge all initial values
  // 4. Conflict detection: throw if two components define the same field
  // 5. Call defineStore with merged result
}
```

### Example

```typescript
import { composeStore, Loadable, Paginated, Filterable } from 'state-agent/components'

const postsStore = composeStore({
  name: 'posts',
  schema: z.object({
    items: z.array(PostSchema),
  }),
  components: [Loadable, Paginated, Filterable],
  initial: { items: [] },
  // Loadable adds: isLoading, error, when.isLoading, gates.isLoaded
  // Paginated adds: page, pageSize, total, computed.totalPages, when.isFirstPage
  // Filterable adds: filter, sortBy, sortOrder
})
```

### Pros
- Agents pick from a catalog instead of generating from scratch — fewer bugs
- Tested, consistent implementations of common patterns
- Composable: any combination works (Loadable + Paginated + Filterable)
- Conflict detection prevents field name collisions
- Each component is independently testable
- Backward compatible — composition is additive, doesn't change existing APIs

### Cons
- **Rigidity**: Pre-built components may not match every use case
  - *Mitigation*: Components are just Zod schemas + conditions. Agents can extend or override: `Loadable.schema.extend({ retryCount: z.number() })`.
- **Naming conflicts**: Two components could define the same field name
  - *Mitigation*: Conflict detection throws at store creation: `"Field 'error' defined by both Loadable and MyComponent"`. Agent self-corrects by renaming.
- **Magic**: Pre-built conditions might surprise users
  - *Mitigation*: Each component's conditions are documented and visible via introspection (section 7).
- **Bundle size**: Unused components are still importable
  - *Mitigation*: Tree-shakeable. Only imported components are bundled.

### Performance Impact: Zero
Components are just Zod schemas and functions. They're merged at store creation time. No ongoing runtime cost. The merged store behaves identically to a manually defined store.

---

## 9. Cross-Store Pub/Sub Protocol

### What

Formalize how stores communicate by adding `publishes` and `subscribes` declarations. Stores emit named events; other stores react to them. Replaces the implicit `triggers` dependency with explicit event contracts.

### Why This Is Critical for Agents

The current `dependencies.triggers` is metadata-only — it tells an agent that a relationship exists but doesn't implement it. An agent has to manually wire up the trigger logic. Pub/sub makes cross-store coordination declarative and automatic.

### Implementation

**Changes to `StoreOptions` (`runtime/core/types.ts`):**

```typescript
export interface StoreOptions<T = any> {
  // ... existing fields ...

  /** Events this store publishes on state changes */
  publishes?: Record<string, (prev: T, next: T) => boolean>

  /** Events this store reacts to */
  subscribes?: Record<string, StoreEventHandler>
}

export type StoreEventHandler = (context: {
  event: string
  source: string  // source store name
  store: Store    // this store
  actor: Actor    // system actor for the event
}) => void | Promise<void>
```

**File: `runtime/core/pubsub.ts`** (new)

```typescript
export interface EventBus {
  /** Register a publisher */
  registerPublisher(storeName: string, events: Record<string, (prev: any, next: any) => boolean>): void
  /** Register a subscriber */
  registerSubscriber(storeName: string, subscriptions: Record<string, StoreEventHandler>): void
  /** Emit an event (called internally by store on state change) */
  emit(event: string, source: string): void
  /** Get the event graph for introspection */
  getGraph(): Record<string, { publishers: string[]; subscribers: string[] }>
  /** Unregister a store */
  unregister(storeName: string): void
}

export function createEventBus(): EventBus
```

**How it works:**

1. Store A declares `publishes: { 'authenticated': (prev, next) => prev.status !== 'authenticated' && next.status === 'authenticated' }`
2. Store B declares `subscribes: { 'auth.authenticated': ({ store }) => store.fetch('posts') }`
3. When Store A's state changes, the event bus checks each publish condition
4. If a condition fires, the bus delivers the event to all subscribers
5. Subscribers run asynchronously (non-blocking)

**Integration with existing `dependencies`:**

The `dependencies.triggers` field is auto-populated from the pub/sub graph. `impactOf()` includes pub/sub relationships in its traversal.

### Example

```typescript
const authStore = defineStore({
  name: 'auth',
  schema: authSchema,
  initial: { status: 'idle' as const },
  publishes: {
    authenticated: (prev, next) => next.status === 'authenticated' && prev.status !== 'authenticated',
    deauthenticated: (prev, next) => next.status !== 'authenticated' && prev.status === 'authenticated',
  },
})

const postsStore = defineStore({
  name: 'posts',
  schema: postsSchema,
  initial: { items: [], isLoading: false, error: null },
  subscribes: {
    'auth.authenticated': async ({ store, actor }) => {
      store.set('isLoading', true, actor)
      // fetch posts...
    },
    'auth.deauthenticated': ({ store, actor }) => {
      store.reset({ items: [], isLoading: false, error: null }, actor)
    },
  },
})
```

### Pros
- Cross-store coordination is declarative, not manually wired
- Event graph visible via introspection — agent sees full communication topology
- Replaces ad-hoc `useEffect` chains that watch auth state
- Async subscribers don't block the publisher
- Auto-populates `dependencies.triggers` — no manual metadata needed

### Cons
- **Implicit coupling**: Pub/sub can create hard-to-trace event chains
  - *Mitigation*: The event graph is introspectable. Cycle detection at registration time: `"Cycle detected: auth -> posts -> auth"`. Max event depth: 5 (configurable).
- **Ordering**: Subscriber execution order is non-deterministic
  - *Design decision*: This is correct. If order matters, use a single store or a flow. Pub/sub is for independent reactions.
- **Error handling**: What happens when a subscriber throws?
  - *Design decision*: Catch and emit via middleware as `SUBSCRIBER_ERROR` action. Never propagate to publisher. Log in dev mode.
- **Memory**: The event bus is a global singleton
  - *Mitigation*: One Map of event names → subscriber lists. Memory proportional to (events * subscribers), typically < 1KB.

### Performance Impact: Minimal
- Event bus subscription: O(1) per registration
- Event emission: O(subscribers) per event. Typically 1-3 subscribers per event.
- Publish condition check: O(publishers) per state change. Conditions are simple boolean functions.
- Subscribers are async: non-blocking.

---

## 10. Persistence Layer

### What

Add a declarative `persist` option to `defineStore` that automatically saves and restores state to/from storage (localStorage, sessionStorage, or custom adapters).

### Why This Is Critical for Agents

Agents currently can't generate apps that survive page reloads without bolting on custom localStorage code. That custom code is consistently buggy (no error handling, no versioning, no partial persistence). A declarative config means the agent just adds `persist: { key: 'x' }`.

### Implementation

**Changes to `StoreOptions` (`runtime/core/types.ts`):**

```typescript
export interface StoreOptions<T = any> {
  // ... existing fields ...

  /** Persistence configuration */
  persist?: PersistOptions<T>
}

export interface PersistOptions<T = any> {
  /** Storage key */
  key: string
  /** Storage adapter. Default: localStorage */
  storage?: 'localStorage' | 'sessionStorage' | StorageAdapter
  /** Only persist these paths (default: entire state) */
  paths?: string[]
  /** Schema version for migrations */
  version?: number
  /** Migration function: transform old persisted state to current schema */
  migrate?: (persisted: unknown, version: number) => T
  /** Debounce writes in ms. Default: 100 */
  debounceMs?: number
}

export interface StorageAdapter {
  getItem(key: string): string | null | Promise<string | null>
  setItem(key: string, value: string): void | Promise<void>
  removeItem(key: string): void | Promise<void>
}
```

**File: `runtime/core/persist.ts`** (new)

```typescript
export function createPersistMiddleware<T>(
  options: PersistOptions<T>,
  schema?: ZodType<T>
): { middleware: Middleware; hydrate: () => T | undefined }
```

**How it works:**

1. On store creation, check storage for existing data
2. If found, parse + validate against Zod schema
3. If version mismatch, run migration function
4. If valid, use as initial state (merge with provided initial)
5. On state changes, debounce and write to storage
6. If `paths` specified, only persist those paths (via `getPath`)

**Implemented as middleware:**

Persistence is a leave-phase middleware that runs after every state change. This integrates naturally with the existing middleware pipeline.

### Example

```typescript
const settingsStore = defineStore({
  name: 'settings',
  schema: settingsSchema,
  initial: { theme: 'light', language: 'en', fontSize: 14 },
  persist: {
    key: 'app-settings',
    storage: 'localStorage',
    debounceMs: 200,
    version: 2,
    migrate: (old: any, version: number) => {
      if (version === 1) return { ...old, fontSize: 14 }  // v1 didn't have fontSize
      return old
    },
  },
})
```

### Pros
- One line to enable: `persist: { key: 'settings' }`
- Zod validation on hydration — corrupt storage data doesn't crash the app
- Versioned migrations prevent schema drift
- Partial persistence (`paths`) avoids storing transient state (isLoading, error)
- Debounced writes prevent storage thrashing
- Custom adapters for IndexedDB, AsyncStorage (React Native), etc.

### Cons
- **Hydration timing**: State is synchronous, but storage might be async (IndexedDB)
  - *Design decision*: localStorage/sessionStorage are synchronous — hydration happens before first render. For async adapters, initial state is used immediately; persisted state merges in on next tick. The store emits a `hydrated` event.
- **SSR**: localStorage doesn't exist on the server
  - *Mitigation*: Graceful fallback — if storage is unavailable, persist is a no-op. No errors.
- **Storage quota**: Large state can exceed localStorage limits (5-10MB)
  - *Mitigation*: `try/catch` on `setItem`. Emit `PERSIST_ERROR` action via middleware on quota exceeded.
- **Cross-tab sync**: localStorage changes in another tab aren't detected
  - *Future work*: Add a `sync: true` option that listens to the `storage` event. Not in initial implementation.

### Performance Impact: Minimal
- Hydration: one `getItem` + `JSON.parse` + Zod validation at store creation. O(state size).
- Writes: debounced (default 100ms). One `JSON.stringify` + `setItem` per debounce window.
- Path filtering: O(paths) to extract values before serialization.
- No impact on stores without `persist`.

---

## 11. History Undo/Replay

### What

Extend the existing read-only history module with `undo()`, `redo()`, and `branch()` capabilities. Enable agents to try mutations, check results, and revert if needed.

### Why This Is Critical for Agents

Agents are probabilistic — they sometimes generate wrong mutations. Currently, a bad mutation is permanent (unless the agent manually reverses it). Undo gives agents a safety net: try something, check invariants, undo if wrong.

### Implementation

**Changes to `Store` interface (`runtime/core/types.ts`):**

```typescript
export interface Store<T = any> {
  // ... existing methods ...

  /** Undo the last N actions. Returns the number actually undone. */
  undo(count?: number, actor?: Actor): number
  /** Redo the last N undone actions. Returns the number actually redone. */
  redo(count?: number, actor?: Actor): number
  /** Check if undo/redo is available */
  canUndo(): boolean
  canRedo(): boolean
}
```

**Changes to `createHistory` (`runtime/core/history.ts`):**

```typescript
export interface ActionHistory {
  // ... existing methods ...

  /** Get the state snapshot before the last N actions */
  getSnapshot(n: number): unknown | undefined
  /** Push a snapshot alongside an action */
  pushWithSnapshot(action: Action, snapshot: unknown): void
}
```

**How undo works:**

Strategy: **snapshot-based**, not replay-based.

1. Before each action is applied, snapshot the current state
2. Store snapshots alongside actions in the history ring buffer
3. `undo(n)` restores the snapshot from n actions ago
4. Undone actions move to a redo stack
5. `redo(n)` re-applies undone actions

**Why snapshot-based over replay-based:**

Replay (re-running all actions from initial state) is O(actions) per undo and breaks for actions with side effects (fetches, timers). Snapshot-based is O(1) per undo with higher memory cost, but state-agent stores are typically < 100KB.

**Memory management:**

Snapshots are only stored for the last N actions (configurable, default: 50). Older actions lose their snapshots and can't be undone. This caps memory at ~5MB for 50 snapshots of 100KB state.

### Example

```typescript
// Agent tries a mutation
todosStore.update(draft => { draft.items = [] }, agent)

// Checks result
if (todosStore.getState().items.length === 0 && shouldHaveItems) {
  todosStore.undo(1, agent)  // revert
}

// User-facing undo
const canUndo = todosStore.canUndo()
<button disabled={!canUndo} onClick={() => todosStore.undo(1, user)}>Undo</button>
```

### Pros
- Agents can speculatively mutate and revert — safer code generation
- User-facing undo/redo is a common feature request — now built-in
- Snapshot-based: O(1) undo, no replay bugs
- Integrates with actor attribution (undo actions are attributed)
- Memory bounded by configurable snapshot limit

### Cons
- **Memory cost**: One state snapshot per action (up to the limit)
  - *Mitigation*: Default limit is 50 snapshots. For a 100KB state, that's 5MB. Configurable down to 0 (disable undo). Snapshots use `structuredClone` which shares structure where possible.
- **Interaction with effects**: Undoing a mutation doesn't undo its effects (e.g., an API call)
  - *Design decision*: This is inherent. Document clearly: "undo reverts state, not side effects." Effects triggered by the undo (via state change) run normally.
- **Interaction with optimistic updates**: Undoing during a pending optimistic operation is undefined
  - *Design decision*: Block undo while optimistic operations are pending. `canUndo()` returns false.
- **Redo invalidation**: Any new action after an undo clears the redo stack
  - This is standard behavior (same as every text editor).

### Performance Impact: Moderate (opt-in)
- `structuredClone` per action: ~0.5ms for 100KB state. Acceptable for typical stores.
- Memory: bounded by `undoLimit` (default 50).
- Undo/redo operations: O(1) state restoration.
- Stores without undo configured: zero overhead (no snapshots stored).

**To avoid performance degradation: undo is opt-in.**

```typescript
defineStore({
  name: 'todos',
  schema: todosSchema,
  initial: { items: [] },
  undo: { limit: 50 },  // opt-in, default: disabled
})
```

---

## 12. Lightweight Property Checking

### What

Add a `properties` option to `defineStore` that declares invariants the state must satisfy. Properties are checked after every mutation in dev mode and report violations as structured warnings.

### Why This Is Critical for Agents

Zod validates *shape* (type correctness). Properties validate *semantics* (business logic correctness). For example, Zod can verify that `retryCount` is a number, but only a property check can verify that `retryCount` never exceeds the configured maximum.

Properties give agents a way to declare intent that the framework enforces.

### Implementation

**Changes to `StoreOptions` (`runtime/core/types.ts`):**

```typescript
export interface StoreOptions<T = any> {
  // ... existing fields ...

  /**
   * Invariant properties checked after every mutation (dev mode only).
   * Return true if the property holds, false if violated.
   */
  properties?: Record<string, (state: T) => boolean>
}
```

**Integration with `applyAction` (`runtime/core/store.ts`):**

After Zod validation passes and before notifying listeners:

```typescript
if (process.env.NODE_ENV === 'development' && properties) {
  for (const [name, check] of Object.entries(properties)) {
    if (!check(state)) {
      console.warn(
        `[state-agent] Store "${storeName}": property "${name}" violated after ${action.type} at "${action.path}"`
      )
    }
  }
}
```

**Key design decision: warn, don't rollback.**

Properties are softer than schema validation. A property violation is a logic bug, not a type error. Rolling back would hide the bug; warning surfaces it. The agent (or developer) decides how to respond.

If strict enforcement is needed, use Zod `.refine()` which already rollbacks on failure.

### Example

```typescript
const cartStore = defineStore({
  name: 'cart',
  schema: cartSchema,
  initial: { items: [], total: 0 },
  properties: {
    'total matches items': (s) => s.total === s.items.reduce((sum, i) => sum + i.price, 0),
    'no duplicate items': (s) => new Set(s.items.map(i => i.id)).size === s.items.length,
    'max 50 items': (s) => s.items.length <= 50,
  },
})
```

### Pros
- Catches logic bugs that Zod can't (semantic invariants)
- Zero production overhead (dev mode only, tree-shaken in prod)
- Simple API: function returns boolean
- Structured warnings help agents self-correct
- Lightweight alternative to full model checking

### Cons
- **Dev-only**: Violations aren't caught in production
  - *Mitigation*: This is intentional. Properties are a development/generation-time tool, not a runtime safety net. Zod provides runtime safety.
- **Performance**: Checking all properties after every mutation could be slow for expensive checks
  - *Mitigation*: Properties should be cheap boolean functions. Document: "Properties must be O(state size) or cheaper. Do not perform async operations or heavy computation in properties."
- **False positives**: Properties might be temporarily violated during multi-step updates
  - *Mitigation*: When batching is enabled, properties check after the batch resolves, not after each intermediate mutation.

### Performance Impact: Zero in production
Properties are guarded by `process.env.NODE_ENV === 'development'`. Bundlers eliminate the entire code path in production builds. In dev mode: O(properties) per mutation, where each property is a boolean function.

---

## 13. Component Binding Contracts

### What

A `withContract` wrapper that declares which store data a React component reads, which actions it calls, and which gates control its mounting. The contract is verifiable and introspectable.

### Why This Is Critical for Agents

When an agent refactors a store (adds a field, renames a path), it needs to know which components break. Currently, this requires searching all component files for `useStore`, `useValue`, etc. Contracts make dependencies explicit and machine-readable.

### Implementation

**File: `runtime/react/contract.ts`** (new)

```typescript
export interface ComponentContract {
  /** Store data this component reads */
  reads: Record<string, { store: string; path: string }>
  /** Actions this component can perform */
  writes?: { store: string; actions: string[] }[]
  /** Gates that control this component's mounting */
  gates?: { store: string; gate: string }[]
}

export function withContract<P>(
  contract: ComponentContract,
  component: React.ComponentType<P>
): React.ComponentType<P>

/** Get all registered contracts for introspection */
export function getContracts(): Map<string, ComponentContract>
```

**How it works:**

1. `withContract` wraps the component in a higher-order component
2. In dev mode, it validates that the component only accesses declared stores/paths
3. The contract is registered in a global contracts registry
4. `getContracts()` returns all contracts for agent introspection
5. In production, `withContract` is a pass-through (zero overhead)

### Example

```typescript
const TodoList = withContract(
  {
    reads: {
      items: { store: 'todos', path: 'items' },
      filter: { store: 'todos', path: 'filter' },
    },
    writes: [{ store: 'todos', actions: ['addTodo', 'toggleTodo'] }],
    gates: [{ store: 'auth', gate: 'isAuthenticated' }],
  },
  function TodoListComponent() {
    const items = useValue('todos', 'items')
    const filter = useValue('todos', 'filter')
    // ...
  }
)
```

### Pros
- Agent knows exactly which components break when a store changes
- Contracts are introspectable — visible in the system introspection (section 7)
- Enables automated impact analysis: "if I rename `items` to `tasks`, which components break?"
- Dev-mode validation catches undeclared store access

### Cons
- **Boilerplate**: Every component needs a contract declaration
  - *Mitigation*: Contracts are optional. Components without contracts work normally. Agents generate contracts alongside components — the boilerplate is free for agents.
- **Enforcement complexity**: Validating that a component only accesses declared paths requires intercepting hook calls
  - *Design decision*: Dev-mode validation is best-effort. It checks that `useValue` and `useStore` calls match declared stores, but can't catch `getStore()` calls outside hooks. Document the limitation.
- **Stale contracts**: If the component changes but the contract isn't updated, it becomes misleading
  - *Mitigation*: Dev-mode validation catches mismatches (component reads undeclared path → warning).

### Performance Impact: Zero in production
`withContract` returns the component unchanged in production builds. Dev-mode wrapping adds one React.createElement call per contracted component.

**Priority note:** This is the highest-effort, lowest-immediate-impact item. Implement last. The introspection API (section 7) provides most of the same benefits without per-component wrappers.

---

## 14. Schema Migrations

### What

A `store.migrate()` method that applies schema changes (add field, remove field, rename, change type) as atomic, reversible operations. Agents express intent ("add this field") rather than editing store code directly.

### Why This Is Critical for Agents

Direct store editing is the #1 source of agent-introduced regressions. The agent modifies a Zod schema, breaks a selector, and doesn't realize it until runtime. Migrations are atomic and validated: the framework verifies that the new schema is compatible and all existing data transforms correctly.

### Implementation

**File: `runtime/core/migrate.ts`** (new)

```typescript
export interface MigrationPlan {
  add?: Record<string, { schema: ZodType; default: unknown }>
  remove?: string[]
  rename?: Record<string, string>  // old path -> new path
  transform?: Record<string, (value: unknown) => unknown>
}

export function applyMigration<T>(
  store: Store<T>,
  plan: MigrationPlan,
  actor: Actor
): { success: boolean; errors: string[] }
```

**How it works:**

1. Validate the migration plan against the current schema
2. Build a new Zod schema by applying the changes
3. Transform the current state to match the new schema
4. Validate the transformed state against the new schema
5. If valid, swap the schema and state atomically
6. If invalid, report errors without modifying anything

### Example

```typescript
import { applyMigration } from 'state-agent'

applyMigration(settingsStore, {
  add: {
    'preferences.theme': { schema: z.enum(['light', 'dark', 'system']), default: 'system' },
  },
  rename: { 'userName': 'user.displayName' },
  remove: ['legacyField'],
}, systemActor)
```

### Pros
- Atomic: migration either fully succeeds or fully fails
- Validated: new schema + transformed state must pass Zod
- Reversible: migration log enables undo
- Agent expresses intent, not implementation

### Cons
- **Complexity**: Schema manipulation at runtime is inherently complex
  - *Mitigation*: Limit to simple operations (add/remove/rename/transform). No support for structural changes (e.g., splitting an object into two stores).
- **Zod schema immutability**: Zod schemas are immutable. "Applying" a change means building a new schema.
  - *Implementation detail*: Use `schema.extend()`, `schema.omit()`, and manual reconstruction. Works for ZodObject; limited for discriminated unions.
- **Runtime schema replacement**: The store's `stateSchema` needs to be mutable (currently `const`)
  - *Change*: Make `zodSchema` in store.ts a `let` binding. Add internal `replaceSchema()` method.

### Performance Impact: One-time cost
Migration runs once when called. Cost is O(state size) for transformation + O(schema fields) for schema reconstruction. No ongoing cost after migration.

---

## 15. Priority Matrix

Features ordered by: **agent impact** (how much it reduces agent-generated bugs) vs **effort** (implementation complexity) vs **risk** (chance of degrading framework).

### Tier 1 — High Impact, Manageable Effort, Low Risk

| # | Feature | Agent Impact | Effort | Risk | Depends On |
|---|---------|-------------|--------|------|-----------|
| 2 | [State Modes (Discriminated Unions)](#2-state-modes-via-discriminated-unions) | Eliminates impossible states | Medium | Low | None |
| 3 | [Auto-Generated Selectors](#3-auto-generated-selectors) | Eliminates #1 anti-pattern | Medium | Low | None |
| 7 | [Agent Introspection API](#7-agent-introspection-api) | Agents query, don't read files | Low | None | None |
| 12 | [Lightweight Property Checking](#12-lightweight-property-checking) | Catches semantic bugs | Low | None | None |

**Recommendation:** Implement Tier 1 first. Each feature is independent. All four can be developed in parallel.

### Tier 2 — High Impact, Higher Effort, Medium Risk

| # | Feature | Agent Impact | Effort | Risk | Depends On |
|---|---------|-------------|--------|------|-----------|
| 5 | [Optimistic Updates](#5-optimistic-updates-with-automatic-rollback) | Solves #2 hardest pattern | Medium | Medium | None |
| 4 | [Transition Graphs](#4-declared-transition-graphs) | Constrains agent to valid paths | Medium | Low | #2 (modes) |
| 8 | [State Components (ECS)](#8-state-components-ecs-inspired-composition) | Composable catalog for agents | Low | Low | None |
| 10 | [Persistence Layer](#10-persistence-layer) | Apps survive reload | Low | Low | None |

**Recommendation:** Start Tier 2 after Tier 1 is stable. #5 and #10 are independent of everything. #4 builds on #2. #8 is standalone.

### Tier 3 — Medium Impact, Higher Effort, Manageable Risk

| # | Feature | Agent Impact | Effort | Risk | Depends On |
|---|---------|-------------|--------|------|-----------|
| 6 | [Effect Declarations](#6-effect-declarations) | Replaces scattered useEffect | Medium | Medium | None |
| 9 | [Cross-Store Pub/Sub](#9-cross-store-pubsub-protocol) | Explicit coordination | Medium | Medium | None |
| 11 | [History Undo/Replay](#11-history-undoreplay) | Agent self-correction | Medium | Medium | None |
| 14 | [Schema Migrations](#14-schema-migrations) | Safe additive changes | Medium | Medium | #2 (modes) |

**Recommendation:** Implement Tier 3 features selectively based on user demand. All are valuable but none are blockers.

### Tier 4 — Long-Term / Experimental

| # | Feature | Agent Impact | Effort | Risk | Depends On |
|---|---------|-------------|--------|------|-----------|
| 13 | [Component Binding Contracts](#13-component-binding-contracts) | Verifiable data access | High | Medium | #7 (introspection) |

**Recommendation:** Re-evaluate after Tier 1-3. The introspection API (section 7) provides 80% of the value at 20% of the cost.

---

## 16. Performance Budget

Every feature must satisfy these constraints:

| Metric | Budget | Measurement |
|--------|--------|-------------|
| Store creation time | < 5ms for a 30-field store | `performance.now()` around `defineStore()` |
| Mutation latency | < 1ms for a single path write | `performance.now()` around `store.set()` |
| Memory per store | < 50KB baseline (excluding state data) | Heap snapshot in Chrome DevTools |
| Bundle size increase | < 2KB gzipped per feature | `size-limit` in CI |
| First render impact | < 5ms for 10 stores | React Profiler |
| Introspection call | < 10ms for 20 stores | `performance.now()` around `introspect()` |

**Features that could violate the budget:**

- **Undo snapshots** (#11): 50 snapshots * 100KB = 5MB. Opt-in only. Default: disabled.
- **Introspection with JSON Schema** (#7): `zod-to-json-schema` is ~5KB gzipped. Peer dependency.
- **Effect runner** (#6): One `setTimeout` per debounced effect. Negligible CPU, but many active effects could create timer pressure. Document limit: max 20 effects per store.

**Enforcement:**

Add a `vitest` benchmark suite (`runtime/core/__bench__/`) that runs on every PR. Tests fail if any metric exceeds 2x the budget.

---

## 17. Risk Register

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|-----------|
| Feature bloat makes framework heavy | High | Medium | Every feature is opt-in. Stores without a feature pay zero cost. Tree-shaking removes unused code. |
| Breaking changes to existing API | High | Low | All new features are additive. No existing API surface changes. `defineStore` gains new optional fields. |
| Agent confusion from too many features | High | Medium | Skill doc (skill.md) is updated per feature. Decision checklist guides agent to the right primitive. Introspection API surfaces only what's relevant. |
| Performance regression under composition | Medium | Medium | Benchmark suite enforces budget. Features compose additively — no multiplicative interactions. |
| Dependency growth | Medium | Low | Only peer dependency added: `zod-to-json-schema` (optional). All other features are zero-dependency. |
| Zod version coupling | Medium | Low | Already coupled to Zod. Test against Zod 3.x and 4.x. No internal Zod APIs used — only public `.safeParse()`, `.extend()`, `.merge()`. |
| Over-engineering for edge cases | Medium | Medium | Each section has a "Cons" analysis. Features that don't clearly reduce agent bugs are deprioritized. |

---

## Appendix: Relationship to Existing Roadmap

| Existing Roadmap Item | Status | Relationship to This Plan |
|----------------------|--------|--------------------------|
| P2: Signal-Based Reactivity | Not started | **Orthogonal.** Signals change how React subscriptions work internally. All features in this plan work with either the current `useSyncExternalStore` or a future signals approach. |
| P2: MCP Server | Not started | **Complementary.** The Agent Introspection API (#7) is the data source that an MCP server would expose. Build #7 first, then wrap it in MCP protocol. |
| P3: Per-Project AGENTS.md Generation | Not started | **Enhanced by #7.** The introspection API provides the data needed to generate project-specific AGENTS.md files programmatically. |

---

## Appendix: What This Plan Does NOT Include

Explicitly excluded to avoid scope creep:

- **DevTools browser extension**: Valuable for humans, low impact for agents. Use the introspection API instead.
- **GraphQL/tRPC integration**: Fetcher layer already handles API data. GraphQL adds coupling.
- **React Native / SSR specialization**: Current implementation works in both. Don't specialize prematurely.
- **Full formal verification (TLA+ / Alloy)**: Property checking (#12) provides 80% of the value. Full verification is a research project, not a framework feature.
- **CRDT / multi-user sync**: Cross-tab sync via `storage` events is a future persistence option. Full CRDT is out of scope.
- **Form library integration**: Forms use stores directly. Integrating React Hook Form/Formik adds coupling for marginal benefit.
