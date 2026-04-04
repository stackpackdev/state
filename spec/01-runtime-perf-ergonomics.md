# state-agent Improvement Spec

10 improvements across runtime performance and agent ergonomics.

## Runtime Performance

### 1. Remove structuredClone on store creation

**File:** `runtime/core/store.ts:132`
**Current:** `let state: T = structuredClone(initial)`
**Change:** `let state: T = initial`
Immer produces new references on every mutation. The clone is defensive but unnecessary — the user passes `initial` once and never touches it again. If they do, Zod validation catches the drift. Saves allocation cost on large initial states.

### 2. Memoize when/gate evaluation

**File:** `runtime/core/store.ts` (getWhen/getGates) + `runtime/core/when.ts`
**Problem:** `getWhen()` and `getGates()` re-evaluate all predicates on every call. With 10 conditions, that's 10 function calls per render even if state didn't change.
**Change:** Cache the result object and only re-evaluate when `state` reference changes. Store a `lastState` + `lastResult` pair in each evaluator. Since Immer guarantees new references on mutation, a `===` check is sufficient.

```typescript
// In createEvaluator:
let cachedState: unknown = undefined
let cachedResult: Record<string, boolean> = {}

evaluate(state: T) {
  if (state === cachedState) return cachedResult
  cachedState = state
  cachedResult = { /* run predicates */ }
  return cachedResult
}
```

This also fixes improvement #4 — the returned object is reference-stable when state hasn't changed.

### 3. Ring buffer for history

**File:** `runtime/core/history.ts`
**Problem:** `push()` does `[action, ...actions].slice(0, limit)` — O(n) array allocation on every mutation.
**Change:** Fixed-size ring buffer. O(1) push, O(n) only on `getAll()`.

```typescript
let buffer: Action[] = new Array(limit)
let head = 0
let size = 0

push(action) {
  buffer[head] = action
  head = (head + 1) % limit
  if (size < limit) size++
}

getAll() {
  // Return newest-first, wrapping around the ring
}
```

### 4. Reference-stable snapshots for useSyncExternalStore

**File:** `runtime/react/hooks.ts` (useWhen, useGate)
**Problem:** `getWhen()` and `getGates()` return new objects every call → React always re-renders even when conditions haven't changed.
**Fix:** Solved by #2 — memoized evaluators return the same object reference when state is unchanged. No changes needed in hooks once evaluators are memoized.

### 5. Expose DELETE on Store interface

**File:** `runtime/core/types.ts` (Store interface) + `runtime/core/store.ts`
**Current:** Reducer handles `DELETE` action type but Store interface has no `delete()` method.
**Change:** Add `delete(path: string, actor: Actor): void` to the Store interface and implement it in createStore. Mirrors `set()` but dispatches a DELETE action.

```typescript
// types.ts — Store interface
delete(path: string, actor: Actor): void

// store.ts
delete(path: string, value: unknown, actor: Actor) {
  if (!canAct(actor, 'delete', path)) { /* warn */ return }
  dispatch({ id: createActionId(), type: 'DELETE', path, actor, timestamp: Date.now() })
}
```

## Agent Ergonomics

### 6. Split skill into quick-start + reference

**File:** `integrations/claude-code/skill.md`
**Problem:** 250+ lines is a lot of context to load for "create a store". Most tasks only need the template and decision checklist.
**Change:** Restructure skill.md:
- Top section (< 80 lines): trigger, install, store template, decision checklist, React usage. Enough for 90% of tasks.
- Bottom section: full reference (middleware, history, fetchers, flows, dependencies, batch). Agent reads on demand.

No new files — just reorder within skill.md with a clear `## Quick Start` / `## Full Reference` split.

### 7. defineStore helper

**File:** new `runtime/core/define.ts`, export from `runtime/core/index.ts`
**Problem:** Agents write 3 lines of boilerplate per store: `z.object(...)`, `z.infer<...>`, `createStore<T>(...)`. The schema name, type name, and store name must all be consistent. This is error-prone and token-heavy.
**Change:** `defineStore` infers everything from one call:

```typescript
import { defineStore, z } from 'state-agent'

export const todos = defineStore({
  name: 'todos',
  schema: z.object({
    items: z.array(z.object({ id: z.string(), text: z.string(), done: z.boolean() })),
    filter: z.enum(['all', 'active', 'done']),
  }),
  initial: { items: [], filter: 'all' as const },
  when: {
    isEmpty: (s) => s.items.length === 0,
  },
  gates: {
    hasItems: (s) => s.items.length > 0,
  },
})

// todos.store  → Store<TodosState>
// todos.schema → ZodObject<...>
// todos.type   → TodosState (as a type, not a value)
```

Implementation:

```typescript
export function defineStore<S extends ZodType>(options: {
  name: string
  schema: S
  initial: z.infer<S>
  when?: Record<string, (state: z.infer<S>) => boolean>
  gates?: Record<string, (state: z.infer<S>) => boolean>
  middleware?: Middleware[]
  dependencies?: StoreDependencies
  // ... other StoreOptions fields
}) {
  type T = z.infer<S>
  const store = createStore<T>({
    name: options.name,
    stateSchema: options.schema,
    initial: options.initial,
    when: options.when,
    gates: options.gates,
    middleware: options.middleware,
    dependencies: options.dependencies,
  })
  return { store, schema: options.schema } as {
    store: Store<T>
    schema: S
  }
}
```

Agent now writes one function call instead of three declarations. Skill template shrinks accordingly.

### 8. Default human actor + useActor hook

**File:** new logic in `runtime/core/actor.ts`, new `useActor` in `runtime/react/hooks.ts`
**Problem:** Every component that mutates state needs `const user = createHumanActor('user')` — noisy boilerplate. Most apps have one human actor.
**Change:**

a) Lazy default human actor:
```typescript
// actor.ts
let defaultHumanActor: Actor | null = null

export function getDefaultActor(): Actor {
  if (!defaultHumanActor) {
    defaultHumanActor = createHumanActor('user')
  }
  return defaultHumanActor
}
```

b) `useActor` hook that provides actor from context or falls back to default:
```typescript
// hooks.ts
export function useActor(actor?: Actor): Actor {
  return actor ?? getDefaultActor()
}
```

c) Make actor optional in `useStore`, `useChange`, `useUpdate` — falls back to default:
```typescript
export function useChange(storeName: string, actor?: Actor) {
  const resolvedActor = actor ?? getDefaultActor()
  // ...
}
```

This is backwards-compatible. Explicit actors still work. Agent-generated code gets shorter.

### 9. Computed/derived values

**File:** new `runtime/core/computed.ts`, integrate into `runtime/core/store.ts`
**Problem:** Agents frequently need derived values (filtered list, cart total, unread count). Currently they compute in components or abuse `when` conditions. No way to declare derived state at the store level.
**Change:** Add `computed` option to store:

```typescript
export const todos = defineStore({
  name: 'todos',
  schema: todosSchema,
  initial: { items: [], filter: 'all' as const },
  computed: {
    activeCount: (s) => s.items.filter(i => !i.done).length,
    filteredItems: (s) => s.filter === 'all' ? s.items : s.items.filter(i =>
      s.filter === 'active' ? !i.done : i.done
    ),
  },
})
```

Store interface:
```typescript
interface Store<T> {
  // ...existing...
  /** Get a computed value by name */
  computed<V = unknown>(name: string): V
  /** Get all computed values */
  getComputed(): Record<string, unknown>
}
```

Computed values are memoized the same way as when/gates — cached result + `===` state check. They're lazy (only computed when accessed).

React hook:
```typescript
export function useComputed<V = unknown>(storeName: string, name: string): V
```

### 10. Read-only useStore without actor

**File:** `runtime/react/hooks.ts`
**Problem:** `useStore('todos')` works for reading but throws if you try to mutate. The throw message says "pass an actor", but the ergonomics are awkward — you have to know upfront whether you'll mutate.
**Change:** Return `change`/`update`/`reset` as functions that accept an optional actor override, falling back to the default actor from #8:

```typescript
const { value, change, update, when } = useStore('todos')
// Reading works without actor (already works)
// Mutating uses default actor (new):
change('filter', 'active')
// Explicit actor still works:
change('filter', 'active', adminActor)
```

This is a signature change on the returned functions — `change(path, value, actor?)` instead of requiring actor at hook call site. Backwards-compatible since existing code passes actor to `useStore` which still works.

## Implementation Order

Ordered by dependency and impact:

| # | Improvement | Depends on | Impact | Effort |
|---|-------------|------------|--------|--------|
| 1 | Remove structuredClone | — | perf | trivial |
| 3 | Ring buffer history | — | perf | small |
| 2 | Memoize when/gates | — | perf + fixes #4 | small |
| 5 | Expose DELETE | — | completeness | trivial |
| 8 | Default actor + useActor | — | agent ergonomics | small |
| 10 | Read-only useStore | #8 | agent ergonomics | small |
| 7 | defineStore | — | agent ergonomics | small |
| 9 | Computed values | — | agent ergonomics | medium |
| 6 | Split skill doc | #7, #8 | agent context | small |
| 4 | Snapshot stability | #2 | perf (auto-fixed) | none |

Total: ~400 lines of new code, ~100 lines removed, ~150 lines modified.
