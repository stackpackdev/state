# state-agent

State management framework for React apps. Install as `state-agent` and use these patterns to design stores.

## Trigger

Activate when:
- User asks to manage state, create stores, add features with state
- Project has `state-agent` as a dependency
- User mentions Together/Separate/When/Gate/Presence patterns
- User asks to migrate from useState/Redux/Zustand

## Install

> **WARNING**: The `state-agent` name on npm is taken by an unrelated package. Install from a local path or private registry:

```bash
npm install ../state-agent
```

### Vite Configuration (Required)

```typescript
// vite.config.ts — alias order matters (specific before general)
resolve: {
  alias: [
    { find: 'react', replacement: path.resolve(__dirname, 'node_modules/react') },
    { find: 'react-dom', replacement: path.resolve(__dirname, 'node_modules/react-dom') },
    { find: 'state-agent/react', replacement: path.resolve(__dirname, '../state-agent/runtime/react') },
    { find: 'state-agent', replacement: path.resolve(__dirname, '../state-agent/runtime/core') },
  ],
}
```

Copy the same `resolve.alias` into `vitest.config.ts` to prevent React dual-instance errors in tests.

## Quick Start

### Store Template (one call)

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
    isFiltered: (s) => s.filter !== 'all',
  },
  gates: {
    hasItems: (s) => s.items.length > 0,
  },
  computed: {
    activeCount: (s) => s.items.filter(i => !i.done).length,
    filteredItems: (s) => s.filter === 'all' ? s.items : s.items.filter(i =>
      s.filter === 'active' ? !i.done : i.done
    ),
  },
})

// todos.store  → Store<TodosState>
// todos.schema → ZodObject<...>
```

### React Usage

```typescript
import { useStore, useWhen, useGate, useComputed } from 'state-agent/react'

// Read + mutate (no actor boilerplate needed)
const { value, change, update } = useStore('todos')
change('filter', 'active')
update(draft => { draft.items.push({ id: '1', text: 'new', done: false }) })

// Computed values
const activeCount = useComputed<number>('todos', 'activeCount')

// When conditions (style-edge, cheap re-render)
const { isEmpty, isFiltered } = useWhen('todos')

// Gate conditions (mount-edge, expensive lifecycle)
const hasItems = useGate('todos', 'hasItems')
```

```tsx
import { Gated } from 'state-agent/react'

<Gated store="auth" gate="isAuthenticated" fallback={<LoginPage />}>
  <Dashboard />
</Gated>
```

```tsx
// Presence — animated enter/leave (deferred unmounting)
import { Presence, usePresence, usePresenceList } from 'state-agent/react'

// Declarative: CSS-only animated modal
<Presence store="modal" gate="isOpen" timeout={300}>
  {({ phase, ref }) => (
    <div ref={ref} className={`modal modal--${phase}`}>
      <ModalContent />
    </div>
  )}
</Presence>
// phase: 'entering' | 'present' | 'leaving'
// ref: auto-calls done() on transitionend

// Hook: direct control
const { isPresent, phase, done, ref } = usePresence('modal', 'isOpen', { timeout: 300 })

// Animated lists
const { items, done, entered } = usePresenceList('todos', 'items', {
  timeout: 250,
  keyFn: (item) => item.id,
})
// items includes leaving records — map over them with record.phase for CSS classes
```

### Decision Checklist

1. **Find data sources**: API calls become stores (data + loading + error together)
2. **Find auth**: If any component checks auth → separate auth store with gates
3. **Find forms**: Components with `onSubmit` → form stores (fields + submitting + errors together)
4. **Find shared state**: Components reading the same variables → together store
5. **Find multi-step flows**: Wizards, checkout → flows (not boolean flags)
6. **Classify conditions**: `when` = cheap re-render (isHovered, isSubmitting). `gate` = mount/unmount (isAuthenticated, hasData)
7. **Map dependencies**: Which stores gate others? Which trigger refreshes?
8. **Leave local state local**: `useState` used by one component doesn't need a store

## Full Reference

### Core Concepts

4 primitives for reasoning about state:

| Primitive | Question | Example |
|-----------|----------|---------|
| **Together** | What data changes as a unit? | `items + filter + isLoading` in a list |
| **Separate** | What should be independent? | Auth state vs UI state |
| **When** | What changes appearance? (style-edge, cheap) | `isHovered`, `isActive`, `isSubmitting` |
| **Gate** | What controls mounting? (mount-edge, expensive) | `isAuthenticated`, `hasData`, `isLoaded` |
| **Presence** | What animates in/out? (presence-edge, deferred) | Modals, toasts, list items, page transitions |

### createStore (low-level)

For cases where you need more control than `defineStore`:

```typescript
import { z, createStore } from 'state-agent'

export const todosSchema = z.object({ /* fields */ })
export type TodosState = z.infer<typeof todosSchema>

export const todosStore = createStore<TodosState>({
  name: 'todos',
  stateSchema: todosSchema,
  initial: { items: [], filter: 'all' },
  when: { /* style-edge conditions */ },
  gates: { /* mount-edge conditions */ },
  computed: { /* derived values */ },
  dependencies: { reads: [], gatedBy: [], triggers: [] },
})
```

### Actors

Actor is optional everywhere — store methods and hooks default to a human "user" actor.

```typescript
// No actor needed for basic use
store.set('filter', 'active')
store.update(draft => { draft.items.push(item) })
store.delete('items.0')

// Explicit actors for system/agent operations
import { createHumanActor, createAgentActor, createSystemActor } from 'state-agent'
const admin = createHumanActor('admin')
const ai = createAgentActor({ name: 'copilot' })
store.set('filter', 'active', admin)          // explicit actor
store.update(draft => { draft.items.push(item) }, ai)
```

### Store Methods

```typescript
store.get('path')                    // read
store.set('path', value)             // write (actor optional)
store.update(draft => {})            // immer mutation (actor optional)
store.reset(newState)                // full reset (actor optional)
store.delete('path')                 // delete a path (actor optional)
store.computed<T>('name')            // get computed value
store.getComputed()                  // get all computed values
store.getWhen()                      // all when conditions
store.isWhen('name')                 // single when check
store.getGates()                     // all gate conditions
store.isGated('name')                // single gate check
store.subscribe(listener, path?)     // listen to changes
store.getHistory()                   // action history
```

### Fetchers

```typescript
import { createFetcher } from 'state-agent'
import { useFetch } from 'state-agent/react'

// Store-level
const postsFetcher = createFetcher({
  name: 'posts',
  fn: () => fetch('/api/posts').then(r => r.json()),
  schema: z.array(PostSchema),
  cacheTtl: 30_000,
})

// React hook
const { data, isLoading, error, refetch } = useFetch({
  key: 'posts',
  fn: () => fetch('/api/posts').then(r => r.json()),
  schema: z.array(PostSchema),
  cacheTtl: 30_000,
})
```

### Flows

```typescript
import { createFlow } from 'state-agent'

export const checkoutFlow = createFlow({
  name: 'checkout',
  mode: 'separate',
  states: ['Cart', 'Shipping', 'Payment', 'Confirmation'],
  initial: 'Cart',
  children: {
    Payment: {
      name: 'payment',
      mode: 'separate',
      states: ['Card', 'PayPal', 'Crypto'],
      initial: 'Card',
    },
  },
})
```

### Middleware

```typescript
createStore({
  middleware: [{
    name: 'logger',
    enter: (action, state) => { console.log(action); return action },
    leave: (action, prev, next) => { /* after mutation */ },
  }],
})
```

Return `null` from `enter` to cancel the action.

### Dependencies

```typescript
createStore({
  name: 'posts',
  dependencies: {
    reads: [],              // stores this reads from
    gatedBy: ['auth'],      // gates that control this store's components
    triggers: ['auth'],     // stores that invalidate this store's data
  },
})
```

### Providers

```tsx
import { MultiStoreProvider } from 'state-agent/react'

<MultiStoreProvider stores={[authStore, todosStore, postsStore]}>
  <App />
</MultiStoreProvider>
```

### Condition Classification

**Gates** (mount-edge): `isAuthenticated`, `isLoaded`, `isReady`, `hasData`, `hasUser`
**When** (style-edge): `isHovered`, `isActive`, `isSelected`, `isFocused`, `isSubmitting`

**Presence** (presence-edge): `isOpen` (modal), `isVisible` (toast), list items that animate out

Array fields often need both:
- `when.hasItems` — show a count badge (style-edge)
- `gates.isEmpty` — show empty state component (mount-edge)

Gate vs Presence:
- Gate for structural conditions (auth, data readiness) — immediate unmount
- Presence for visual transitions (modals, toasts, list items) — deferred unmount with animation

### Important Patterns

- **Import stores directly** — `import { todos } from './todos.store'` gives typed access via `todos.store`. Never use `getStore('name')` (returns untyped `Store<unknown>`).
- **Actions are self-contained** — every action receives all data as parameters. Never close over external arrays/context. E.g., `completeQuest(id, points)` not `completeQuest(id)` with points looked up internally.
- **Persist hydration order** — `persist` overrides `initial` when storage has valid data. `initial` is the fallback. Don't also manually `localStorage.getItem()`.
- **MultiStoreProvider is the default** — real apps have multiple stores. Use `MultiStoreProvider`, not `StoreProvider`.

### File Conventions

- `name.store.ts` — schema + type + store + conditions
- `name.flow.ts` — flow state machines
- `src/state/index.ts` — barrel exports
- `src/state/provider.tsx` — wraps app with all store providers
