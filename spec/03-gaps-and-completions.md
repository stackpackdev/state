# state-agent: Implementation Plan V2 — Gaps & Completions

> Follows from IMPLEMENTATION_PLAN.md. All Tier 1–3 features are implemented (313 tests passing). This plan covers the remaining gaps identified during audit.

---

## Table of Contents

1. [Status Summary](#1-status-summary)
2. [useSelect React Hook](#2-useselect-react-hook)
3. [Introspection API Completeness](#3-introspection-api-completeness)
4. [Performance Benchmark Suite](#4-performance-benchmark-suite)
5. [Component Binding Contracts](#5-component-binding-contracts)
6. [Priority Matrix](#6-priority-matrix)

---

## 1. Status Summary

### Implemented (Tier 1–3, 12 features)

| # | Feature | Status | Tests |
|---|---------|--------|-------|
| 2 | State Modes (Discriminated Unions) | Done | 17 |
| 3 | Auto-Generated Selectors | Done | 9 |
| 4 | Declared Transition Graphs | Done | 16 |
| 5 | Optimistic Updates | Done | 9 |
| 6 | Effect Declarations | Done | 12 |
| 7 | Agent Introspection API | Partial | 11 |
| 8 | State Components (ECS) | Done | 12 |
| 9 | Cross-Store Pub/Sub | Done | 10 |
| 10 | Persistence Layer | Done | 18 |
| 11 | History Undo/Redo | Done | 14 |
| 12 | Lightweight Property Checking | Done | 9 |
| 14 | Schema Migrations | Done | 11 |

**Total: 313 tests, 28 test files, all passing.**

### Remaining Gaps

| # | Gap | Impact | Effort | Risk |
|---|-----|--------|--------|------|
| V2-1 | useSelect React hook | High — selector tree unusable in React without it | Low | None |
| V2-2 | Introspection completeness | Medium — agents can't query modes, transitions, effects, selectors | Low | None |
| V2-3 | Performance benchmark suite | Medium — no regression detection on the performance budget | Medium | None |
| V2-4 | Component Binding Contracts | Low — Tier 4 from original plan, introspection covers 80% | High | Medium |

---

## 2. useSelect React Hook

### What

A React hook that uses a selector node from the auto-generated selector tree, subscribing only to the specific path for fine-grained re-renders.

### Why This Is Critical

The selector tree (`store.select`) was built in Tier 1 but has no React binding. Without `useSelect`, agents must manually extract the `$path` from a selector node and pass it to `useValue` — defeating the purpose of auto-generated selectors.

The whole point of selectors is that agents pick from a tree instead of writing selector functions. The hook closes the loop from schema → selector tree → React subscription.

### Implementation

**File: `runtime/react/hooks.ts`** (add to existing)

```typescript
import type { SelectorNode } from '../core/selectors.js'

/**
 * Subscribe to a specific selector from the auto-generated selector tree.
 * Only re-renders when the selected path changes.
 *
 * Usage:
 *   const filter = useSelect('todos', todos.select.filter)
 *   const searchOpen = useSelect('todos', todos.select.ui.searchOpen)
 */
export function useSelect<V>(
  storeName: string,
  selector: SelectorNode<V>
): V {
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

**Changes to `runtime/react/index.ts`:**

Add `useSelect` to the hooks export list.

### Example

```typescript
import { useSelect } from 'state-agent/react'
import { todos } from '../state/todos.store'

function FilterDisplay() {
  // Only re-renders when 'filter' changes, not when items change
  const filter = useSelect('todos', todos.select.filter)
  return <span>Current filter: {filter}</span>
}

function SearchToggle() {
  // Deeply nested selector — still fine-grained
  const searchOpen = useSelect('todos', todos.select.ui.searchOpen)
  return <div>{searchOpen ? <SearchPanel /> : <SearchButton />}</div>
}
```

### Tests: `runtime/react/__tests__/use-select.test.tsx`

- useSelect returns the correct value from the selector node
- useSelect re-renders only when the selected path changes
- useSelect works with nested selectors
- useSelect throws if store not found

### Effort: Low (< 20 lines of code, one test file)

---

## 3. Introspection API Completeness

### What

Extend `StoreIntrospection` to include modes, transitions, effects, selectors, properties, undo status, and pub/sub — every runtime capability the store has.

### Why This Is Critical

The introspection API is how agents understand the state system at runtime. The current implementation returns basic state, when, gates, computed, and dependencies. But it's missing the features added in Tier 1–3:

- **Modes**: Agent doesn't know the current mode or available modes
- **Transitions**: Agent can't query valid transitions without calling `store.canTransition` directly
- **Effects**: Agent doesn't know what effects exist or their status
- **Selectors**: Agent doesn't know what selector paths are available
- **Properties**: Agent doesn't know what invariants are being checked
- **Undo**: Agent doesn't know if undo is available or how deep the stack is
- **Pub/Sub**: Agent doesn't know what events the store publishes or subscribes to

Without this, the introspection API delivers ~40% of its planned value. With it, an agent can query one endpoint and know *everything* about the state system.

### Implementation

**Changes to `runtime/core/introspect.ts`:**

Extend the `StoreIntrospection` interface:

```typescript
export interface StoreIntrospection {
  name: string
  state: unknown

  // Existing
  when: Record<string, boolean>
  gates: Record<string, boolean>
  computed: Record<string, unknown>
  dependencies: StoreDependencies
  historyLength: number

  // NEW — Modes (from discriminated union schema)
  /** Current mode name if store uses a discriminated union schema */
  currentMode?: string
  /** All available mode names */
  modes?: string[]

  // NEW — Transitions
  /** Valid transition targets from the current mode */
  validTransitions?: string[]
  /** All declared transition names */
  transitionNames?: string[]

  // NEW — Effects
  /** Effect names and their current status */
  effects?: Record<string, string>

  // NEW — Selectors
  /** Available selector paths from the auto-generated tree */
  selectorPaths?: string[]

  // NEW — Properties
  /** Property invariant names and current check results */
  properties?: Record<string, boolean>

  // NEW — Undo
  /** Whether undo is enabled */
  undoEnabled?: boolean
  /** Number of undoable actions */
  undoDepth?: number
  /** Whether redo is available */
  canRedo?: boolean

  // NEW — Pub/Sub
  /** Event names this store publishes */
  publishes?: string[]
  /** Event names this store subscribes to */
  subscribes?: string[]
}
```

**The challenge:** `introspectStore` currently only receives a `Store` object, which doesn't expose modes, transitions, effects, selectors, or pub/sub metadata directly. There are two approaches:

**Approach A — Expose metadata on the Store interface:**

Add optional readonly fields to the `Store` interface in `types.ts`:

```typescript
export interface Store<T = any> {
  // ... existing methods ...

  /** Runtime metadata for introspection (set internally by createStore) */
  readonly __meta?: {
    modeInfo?: { discriminant: string; modeNames: string[] }
    transitionGraph?: TransitionGraph
    effectRunner?: EffectRunner<T>
    selectorPaths?: string[]
    hasProperties?: boolean
    undoEnabled?: boolean
    publishEventNames?: string[]
    subscribeEventNames?: string[]
  }
}
```

Then in `createStore`, populate `store.__meta` with all relevant metadata.

**Approach B — Pass metadata through a separate registry:**

Create a `storeMetadataRegistry` parallel to the store registry that maps store names to their extended metadata.

**Recommendation: Approach A.** It keeps metadata co-located with the store and requires no new registry. The `__meta` field is optional and doesn't affect existing code. The double-underscore prefix signals "internal, don't use directly."

**Changes to `runtime/core/store.ts`:**

After building the store object, set `store.__meta`:

```typescript
;(store as any).__meta = {
  modeInfo: modeInfo ?? undefined,
  transitionGraph: transitionGraph ?? undefined,
  effectRunner: effectRunner ?? undefined,
  selectorPaths: store.select ? collectSelectorPaths(store.select) : undefined,
  hasProperties: !!properties,
  undoEnabled,
  publishEventNames: options.publishes ? Object.keys(options.publishes) : undefined,
  subscribeEventNames: options.subscribes ? Object.keys(options.subscribes) : undefined,
}
```

Helper to collect selector paths:

```typescript
function collectSelectorPaths(tree: any, paths: string[] = []): string[] {
  for (const key of Object.keys(tree)) {
    if (key.startsWith('$')) continue
    const node = tree[key]
    if (node && node.$path) {
      paths.push(node.$path)
      // Recurse into nested selector trees
      collectSelectorPaths(node, paths)
    }
  }
  return paths
}
```

**Changes to `introspectStore`:**

```typescript
export function introspectStore(store: Store): StoreIntrospection {
  const meta = (store as any).__meta
  const base: StoreIntrospection = {
    name: store.name,
    state: store.getState(),
    when: store.getWhen(),
    gates: store.getGates(),
    computed: store.getComputed(),
    dependencies: store.getDependencies(),
    historyLength: store.getHistory().length,
  }

  if (meta) {
    if (meta.modeInfo) {
      const currentState = store.getState() as any
      base.currentMode = currentState?.[meta.modeInfo.discriminant]
      base.modes = meta.modeInfo.modeNames
    }
    if (meta.transitionGraph && base.currentMode) {
      base.validTransitions = meta.transitionGraph.validTargets(base.currentMode)
    }
    if (meta.effectRunner) {
      base.effects = meta.effectRunner.status()
    }
    if (meta.selectorPaths) {
      base.selectorPaths = meta.selectorPaths
    }
    if (meta.hasProperties) {
      base.properties = store.getProperties()
    }
    base.undoEnabled = meta.undoEnabled ?? false
    if (meta.undoEnabled) {
      base.undoDepth = store.canUndo() ? undefined : 0 // needs stack length exposed
      base.canRedo = store.canRedo()
    }
    if (meta.publishEventNames) {
      base.publishes = meta.publishEventNames
    }
    if (meta.subscribeEventNames) {
      base.subscribes = meta.subscribeEventNames
    }
  }

  return base
}
```

### Tests: extend `runtime/core/__tests__/introspect.test.ts`

- Introspection returns currentMode and modes for discriminated union stores
- Introspection returns validTransitions from current mode
- Introspection returns effect names and status
- Introspection returns selectorPaths
- Introspection returns property check results
- Introspection returns undoEnabled and canRedo
- Introspection returns publishes and subscribes event names
- Introspection of a plain store (no modes/transitions) omits those fields

### Effort: Low–Medium (extend existing interface, populate metadata, update tests)

---

## 4. Performance Benchmark Suite

### What

A `vitest bench` suite in `runtime/core/__bench__/` that measures and enforces the performance budget from IMPLEMENTATION_PLAN.md section 16.

### Why This Matters

The performance budget exists on paper but isn't enforced. As features accumulate, performance regressions go undetected. The benchmark suite ensures every PR stays within budget.

### Performance Budget (from v1 plan)

| Metric | Budget | Measurement |
|--------|--------|-------------|
| Store creation time | < 5ms for a 30-field store | `performance.now()` around `defineStore()` |
| Mutation latency | < 1ms for a single path write | `performance.now()` around `store.set()` |
| Memory per store | < 50KB baseline (excluding state data) | Heap snapshot |
| First render impact | < 5ms for 10 stores | React Profiler |
| Introspection call | < 10ms for 20 stores | `performance.now()` around `introspect()` |

### Implementation

**File: `runtime/core/__bench__/store.bench.ts`**

```typescript
import { bench, describe } from 'vitest'
import { z, defineStore, storeRegistry, createHumanActor } from '../index.js'

const actor = createHumanActor('bench')

// Build a 30-field schema for benchmarking
function createLargeSchema() {
  const fields: Record<string, any> = {}
  for (let i = 0; i < 30; i++) {
    fields[`field${i}`] = z.string()
  }
  return z.object(fields)
}

describe('Store Creation', () => {
  bench('defineStore with 30-field schema', () => {
    storeRegistry.clear()
    const schema = createLargeSchema()
    const initial: Record<string, string> = {}
    for (let i = 0; i < 30; i++) initial[`field${i}`] = ''
    defineStore({ name: `bench-${Math.random()}`, schema, initial })
  })

  bench('defineStore with discriminated union + transitions', () => {
    storeRegistry.clear()
    defineStore({
      name: `bench-du-${Math.random()}`,
      schema: z.discriminatedUnion('status', [
        z.object({ status: z.literal('idle') }),
        z.object({ status: z.literal('loading'), progress: z.number() }),
        z.object({ status: z.literal('success'), data: z.array(z.string()) }),
        z.object({ status: z.literal('error'), error: z.string() }),
      ]),
      initial: { status: 'idle' as const },
      transitions: {
        'idle -> loading': 'start',
        'loading -> success': 'complete',
        'loading -> error': 'fail',
        'error -> idle': 'reset',
        'success -> idle': 'reset',
      },
    })
  })

  bench('defineStore with all features (modes + effects + persist + undo + pubsub)', () => {
    storeRegistry.clear()
    defineStore({
      name: `bench-full-${Math.random()}`,
      schema: z.object({ value: z.string(), count: z.number() }),
      initial: { value: '', count: 0 },
      when: { isEmpty: (s) => s.value === '' },
      gates: { hasValue: (s) => s.value !== '' },
      computed: { doubled: (s) => s.count * 2 },
      properties: { positive: (s) => s.count >= 0 },
      undo: { limit: 50 },
    })
  })
})

describe('Mutation Latency', () => {
  const schema = z.object({ value: z.string(), count: z.number() })
  let store: any

  bench('store.set (path write)', () => {
    storeRegistry.clear()
    const result = defineStore({ name: 'mut-bench', schema, initial: { value: '', count: 0 } })
    store = result.store
    store.set('value', 'hello', actor)
  })

  bench('store.update (Immer mutation)', () => {
    storeRegistry.clear()
    const result = defineStore({ name: 'upd-bench', schema, initial: { value: '', count: 0 } })
    store = result.store
    store.update((draft: any) => { draft.count++ }, actor)
  })
})

describe('Introspection', () => {
  bench('introspect 20 stores', () => {
    storeRegistry.clear()
    for (let i = 0; i < 20; i++) {
      defineStore({
        name: `intro-${i}`,
        schema: z.object({ value: z.string() }),
        initial: { value: '' },
        when: { empty: (s) => s.value === '' },
        gates: { hasValue: (s) => s.value !== '' },
        computed: { length: (s) => s.value.length },
      })
    }
    storeRegistry.introspect()
  })
})
```

**Script addition to `package.json`:**

```json
{
  "scripts": {
    "bench": "vitest bench"
  }
}
```

**Vitest config:** Vitest supports `bench` natively via `vitest bench`. No extra dependencies needed. The `bench()` function is imported from `vitest`.

### Tests

Benchmarks aren't pass/fail tests — they report timing. To enforce the budget, add a threshold test:

**File: `runtime/core/__bench__/budget.test.ts`**

```typescript
import { test, expect } from 'vitest'
import { z, defineStore, storeRegistry, createHumanActor } from '../index.js'

const actor = createHumanActor('budget')

test('store creation < 5ms for 30-field store', () => {
  storeRegistry.clear()
  const fields: Record<string, any> = {}
  const initial: Record<string, string> = {}
  for (let i = 0; i < 30; i++) { fields[`f${i}`] = z.string(); initial[`f${i}`] = '' }

  const start = performance.now()
  defineStore({ name: 'budget-create', schema: z.object(fields), initial })
  const elapsed = performance.now() - start

  expect(elapsed).toBeLessThan(10) // 2x budget (5ms * 2)
})

test('mutation latency < 1ms for path write', () => {
  storeRegistry.clear()
  const { store } = defineStore({
    name: 'budget-mut',
    schema: z.object({ value: z.string() }),
    initial: { value: '' },
  })

  const start = performance.now()
  store.set('value', 'test', actor)
  const elapsed = performance.now() - start

  expect(elapsed).toBeLessThan(2) // 2x budget (1ms * 2)
})

test('introspection < 10ms for 20 stores', () => {
  storeRegistry.clear()
  for (let i = 0; i < 20; i++) {
    defineStore({
      name: `budget-intro-${i}`,
      schema: z.object({ v: z.string() }),
      initial: { v: '' },
      when: { e: (s) => s.v === '' },
      gates: { h: (s) => s.v !== '' },
    })
  }

  const start = performance.now()
  storeRegistry.introspect()
  const elapsed = performance.now() - start

  expect(elapsed).toBeLessThan(20) // 2x budget (10ms * 2)
})
```

### Effort: Medium (new directory, benchmark file, budget enforcement tests, package.json script)

---

## 5. Component Binding Contracts

### What

A `withContract` wrapper that declares which store data a React component reads, which actions it calls, and which gates control its mounting. The contract is verifiable and introspectable.

### Why

When an agent refactors a store (adds a field, renames a path), it needs to know which components break. Currently this requires searching all component files for `useStore`, `useValue`, etc. Contracts make dependencies explicit and machine-readable.

### Implementation

**File: `runtime/react/contract.ts`** (new)

```typescript
import type { ComponentType } from 'react'

export interface ComponentContract {
  /** Store data this component reads */
  reads: Record<string, { store: string; path: string }>
  /** Actions this component can perform */
  writes?: { store: string; actions: string[] }[]
  /** Gates that control this component's mounting */
  gates?: { store: string; gate: string }[]
}

// Global contract registry
const contractRegistry = new Map<string, ComponentContract>()

/**
 * Wrap a React component with a data contract.
 * In production: pass-through (zero overhead).
 * In dev mode: registers the contract for introspection and validates access.
 */
export function withContract<P extends Record<string, unknown>>(
  contract: ComponentContract,
  component: ComponentType<P>
): ComponentType<P> {
  // Register the contract under the component's display name
  const name = component.displayName || component.name || 'Anonymous'
  contractRegistry.set(name, contract)

  // In production, return the component unchanged
  // In dev mode, could wrap with a validation layer (future enhancement)
  return component
}

/** Get all registered contracts for agent introspection */
export function getContracts(): Map<string, ComponentContract> {
  return new Map(contractRegistry)
}

/** Clear all registered contracts (useful for testing) */
export function clearContracts(): void {
  contractRegistry.clear()
}

/**
 * Given a store name and path, return all components that read from it.
 * Enables impact analysis: "if I change todos.items, which components break?"
 */
export function findAffectedComponents(
  storeName: string,
  path?: string
): string[] {
  const affected: string[] = []
  for (const [componentName, contract] of contractRegistry) {
    for (const read of Object.values(contract.reads)) {
      if (read.store === storeName) {
        if (!path || read.path === path || read.path.startsWith(path + '.') || path.startsWith(read.path + '.')) {
          affected.push(componentName)
          break
        }
      }
    }
  }
  return affected
}
```

**Changes to `runtime/react/index.ts`:**

Export `withContract`, `getContracts`, `clearContracts`, `findAffectedComponents`, and `ComponentContract` type.

### Example

```typescript
import { withContract } from 'state-agent/react'

const TodoList = withContract(
  {
    reads: {
      items: { store: 'todos', path: 'items' },
      filter: { store: 'todos', path: 'filter' },
    },
    writes: [{ store: 'todos', actions: ['addTodo', 'toggleTodo', 'deleteTodo'] }],
    gates: [{ store: 'auth', gate: 'isAuthenticated' }],
  },
  function TodoListComponent() {
    const items = useValue('todos', 'items')
    const filter = useValue('todos', 'filter')
    // ...
  }
)

// Agent impact analysis:
import { findAffectedComponents } from 'state-agent/react'
findAffectedComponents('todos', 'items')  // ['TodoList']
```

### Tests: `runtime/react/__tests__/contract.test.ts`

- withContract registers the contract in the registry
- getContracts returns all registered contracts
- findAffectedComponents returns correct component names
- findAffectedComponents with nested path matching
- clearContracts empties the registry
- withContract returns the original component (pass-through)

### Effort: High (new file, new concept, needs adoption in all generated components)

### Recommendation

Implement last. The introspection API (V2-2) provides 80% of the same value — agents can query store structure without per-component contracts. Contracts become valuable only when the codebase is large enough that "which components use this store path?" is a hard question.

---

## 6. Priority Matrix

| # | Feature | Agent Impact | Effort | Risk | Depends On |
|---|---------|-------------|--------|------|-----------|
| V2-1 | [useSelect Hook](#2-useselect-react-hook) | High — completes the selector story | Low | None | Selectors (done) |
| V2-2 | [Introspection Completeness](#3-introspection-api-completeness) | Medium — agents see full contract | Low–Medium | None | All Tier 1–3 (done) |
| V2-3 | [Benchmark Suite](#4-performance-benchmark-suite) | Medium — prevents regressions | Medium | None | None |
| V2-4 | [Component Contracts](#5-component-binding-contracts) | Low — 80% covered by introspection | High | Medium | V2-2 (introspection) |

**Recommended order:** V2-1 → V2-2 → V2-3. Defer V2-4 until user demand warrants it.

V2-1 and V2-2 are independent and can be implemented in parallel.
