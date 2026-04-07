# stackpack-state

Agent-first React state management. Schema is the single source of truth — types, validation, transitions, selectors, invariants, and effects all derive from one Zod schema.

## Trigger

Activate when:
- User asks to manage state, create stores, add features with state
- Project has `stackpack-state` as a dependency
- User mentions Together/Separate/When/Gate patterns
- User asks to migrate from useState/Redux/Zustand/Jotai/XState
- User asks to add state to a React project

## Install

```bash
npm install stackpack-state
```

No other dependencies. Zod is bundled — import `z` from `stackpack-state` directly.

### Vite Configuration (Required)

When using stackpack-state with Vite, you must configure aliases. **Order matters** — specific paths must come before general ones:

```typescript
// vite.config.ts
import path from 'path'

export default defineConfig({
  resolve: {
    alias: [
      // stackpack-state/react MUST come before stackpack-state (prefix matching)
      { find: 'stackpack-state/react', replacement: path.resolve(__dirname, '../stackpack-state/runtime/react') },
      { find: 'stackpack-state', replacement: path.resolve(__dirname, '../stackpack-state/runtime/core') },
    ],
  },
})
```

Do NOT use object-form aliases — `{ 'stackpack-state': '...' }` swallows `stackpack-state/react`.

### React Dual-Instance Fix

When installed via local path, React may resolve from stackpack-state's own `node_modules` instead of your app's, causing "Invalid hook call" errors. Fix by pinning React resolution in **both** `vite.config.ts` and `vitest.config.ts`:

```typescript
resolve: {
  alias: [
    // Pin React to app's copy (prevents dual-instance errors)
    { find: 'react', replacement: path.resolve(__dirname, 'node_modules/react') },
    { find: 'react-dom', replacement: path.resolve(__dirname, 'node_modules/react-dom') },
    // stackpack-state aliases...
    { find: 'stackpack-state/react', replacement: path.resolve(__dirname, '../stackpack-state/runtime/react') },
    { find: 'stackpack-state', replacement: path.resolve(__dirname, '../stackpack-state/runtime/core') },
  ],
},
```

---

## How to Think: The 4 Primitives

Every state decision maps to one of these:

| Primitive | Question | Rule |
|-----------|----------|------|
| **Together** | What data changes as a unit? | Group into one store |
| **Separate** | What is independent? | Split into separate stores |
| **When** | What changes appearance? | Style-edge condition (cheap re-render) |
| **Gate** | What controls mounting? | Mount-edge condition (expensive lifecycle) |
| **Presence** | What animates in/out? | Deferred unmount (animated lifecycle) |

### When vs Gate Decision

```
Is the condition controlling whether a component MOUNTS or UNMOUNTS?
  YES → Gate (mount-edge: isAuthenticated, hasData, isLoaded)
  NO  → When (style-edge: isHovered, isActive, isSubmitting, isEmpty)
```

Gates destroy and recreate component trees. When conditions just trigger re-renders.

---

## New Project: Step-by-Step

### Step 1: Identify Stores

Walk through the UI and ask:
1. **API endpoints** → one store per endpoint (data + loading + error together)
2. **Auth** → always a separate store that gates the app
3. **Forms** → one store per form (fields + submitting + errors together)
4. **Shared state** → components reading same data → together store
5. **Multi-step flows** → wizard/checkout → flow, not boolean flags
6. **Single-component state** → leave as `useState`, no store needed

### Step 2: Create File Structure

```
src/state/
  auth.store.ts          # auth store
  todos.store.ts         # feature store
  checkout.flow.ts       # multi-step flow
  index.ts               # barrel exports
  provider.tsx           # MultiStoreProvider
```

### Step 3: Write Stores

Use `defineStore` for every store. Pick the right pattern from the catalog below.

`defineStore` returns a typed result — **always import the result directly**, never use `getStore()`:

```typescript
// src/state/todos.store.ts
import { defineStore, z } from 'stackpack-state'

export const todos = defineStore({ name: 'todos', schema: ..., initial: ... })
// todos.store → Store<TodosState>  (fully typed, no casting)
// todos.schema → ZodObject<...>
// todos.select → selector tree
```

```typescript
// src/state/actions.ts — cross-store actions use direct imports
import { todos } from './todos.store'
import { user } from './user.store'

export function completeTodo(id: string, points: number) {
  todos.store.update(d => { ... })   // typed, no registry lookup
  user.store.set('score', ...)       // typed, no casting
}
```

**Never use `getStore('name')`** — it returns `Store<unknown>`, requires manual casting, and breaks silently if the store name changes.

### Step 4: Wire React

Real apps always have multiple stores. Use `MultiStoreProvider` (not `StoreProvider`):

```tsx
// src/state/provider.tsx
import { MultiStoreProvider } from 'stackpack-state/react'
import { auth } from './auth.store'
import { todos } from './todos.store'

export function StateProvider({ children }: { children: React.ReactNode }) {
  return (
    <MultiStoreProvider stores={[auth.store, todos.store]}>
      {children}
    </MultiStoreProvider>
  )
}
```

```tsx
// src/main.tsx or src/App.tsx
import { StateProvider } from './state/provider'

<StateProvider>
  <App />
</StateProvider>
```

`StoreProvider` is only for isolated single-store widgets. For app-level state, always use `MultiStoreProvider`.

---

## Store Pattern Catalog

### Pattern 1: Flat Object Store (most common)

For straightforward state with no mode logic.

```typescript
// src/state/settings.store.ts
import { defineStore, z } from 'stackpack-state'

export const settings = defineStore({
  name: 'settings',
  schema: z.object({
    theme: z.enum(['light', 'dark', 'system']),
    language: z.string(),
    fontSize: z.number().min(10).max(24),
  }),
  initial: { theme: 'system' as const, language: 'en', fontSize: 14 },
  when: {
    isDark: (s) => s.theme === 'dark',
  },
})
```

### Pattern 2: Mode Store (discriminated union)

For state with mutually exclusive modes. **Eliminates impossible state combinations.**

```typescript
// src/state/users.store.ts
import { defineStore, z } from 'stackpack-state'

const UserSchema = z.object({ id: z.string(), name: z.string(), email: z.string() })

export const users = defineStore({
  name: 'users',
  schema: z.discriminatedUnion('status', [
    z.object({ status: z.literal('idle') }),
    z.object({ status: z.literal('loading'), startedAt: z.number() }),
    z.object({ status: z.literal('success'), data: z.array(UserSchema), fetchedAt: z.number() }),
    z.object({ status: z.literal('error'), error: z.string(), retryCount: z.number() }),
  ]),
  initial: { status: 'idle' as const },
  // Gates auto-derived: idle, loading, success, error
  // When auto-derived: isIdle, isLoading, isSuccess, isError
})
```

When you use a `z.discriminatedUnion` schema, `defineStore` automatically creates:
- **Gates** named after each mode: `idle`, `loading`, `success`, `error`
- **When conditions** prefixed with `is`: `isIdle`, `isLoading`, `isSuccess`, `isError`

Use in React:
```tsx
<Gated store="users" gate="success">
  <UserList />
</Gated>
<Gated store="users" gate="error">
  <ErrorMessage />
</Gated>
<Gated store="users" gate="loading">
  <Spinner />
</Gated>
```

### Pattern 3: Mode Store with Transitions

For state machines with constrained valid paths.

```typescript
// src/state/checkout.store.ts
import { defineStore, z } from 'stackpack-state'

export const checkout = defineStore({
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

// Query valid transitions at runtime:
checkout.store.canTransition?.('payment', 'cart')       // true
checkout.store.canTransition?.('confirmed', 'shipping') // false
checkout.store.validTargets?.('shipping')               // ['payment', 'cart']
```

Invalid transitions are **rolled back** with an agent-friendly error message.

### Pattern 4: Composed Store (ECS components)

For stores that combine common patterns (loading, pagination, filtering, selection).

```typescript
// src/state/posts.store.ts
import { defineStore, z } from 'stackpack-state'
import { composeStore, Loadable, Paginated, Filterable } from 'stackpack-state/components'

const PostSchema = z.object({ id: z.string(), title: z.string(), body: z.string() })

export const posts = composeStore({
  name: 'posts',
  schema: z.object({
    items: z.array(PostSchema),
  }),
  components: [Loadable, Paginated, Filterable],
  initial: { items: [] },
  // Loadable adds: isLoading, error + when.isLoading, when.hasError, gates.isLoaded, gates.hasError
  // Paginated adds: page, pageSize, total + when.isFirstPage, when.isLastPage, computed.totalPages, computed.hasNextPage, computed.hasPrevPage
  // Filterable adds: filter, sortBy, sortOrder + when.hasFilter, when.isAscending
})
```

Available components:
| Component | Fields Added | Conditions Added |
|-----------|-------------|-----------------|
| `Loadable` | `isLoading`, `error` | when: `isLoading`, `hasError`. gates: `isLoaded`, `hasError` |
| `Paginated` | `page`, `pageSize`, `total` | when: `isFirstPage`, `isLastPage`. computed: `totalPages`, `hasNextPage`, `hasPrevPage` |
| `Filterable` | `filter`, `sortBy`, `sortOrder` | when: `hasFilter`, `isAscending` |
| `Selectable` | `selectedIds` | when: `hasSelection`. computed: `selectedCount` |

### Pattern 5: Store with Effects

For stores that trigger side effects on state changes.

```typescript
// src/state/search.store.ts
import { defineStore, z, createSystemActor } from 'stackpack-state'

export const search = defineStore({
  name: 'search',
  schema: z.object({ query: z.string(), results: z.array(z.string()), isSearching: z.boolean() }),
  initial: { query: '', results: [], isSearching: false },
  effects: {
    searchOnQueryChange: {
      watch: 'query',
      debounce: 300,
      handler: async ({ state, store, signal }) => {
        if (!state.query) return
        const actor = createSystemActor('search')
        store.set('isSearching', true, actor)
        const res = await fetch(`/api/search?q=${state.query}`, { signal })
        const data = await res.json()
        store.set('results', data, actor)
        store.set('isSearching', false, actor)
      },
    },
  },
})
```

Effects support:
- **Dot-path watching**: `watch: 'query'` — triggers when that path changes
- **Mode transition watching**: `watch: 'idle -> loading'` — triggers on mode change
- **Debounce**: `debounce: 300` — waits 300ms after last trigger
- **Auto-cancellation**: Previous invocation aborted via `signal` when re-triggered
- **Retry**: `retry: { max: 3, backoff: 'exponential' }`

### Pattern 6: Store with Persistence

For state that survives page reloads.

```typescript
// src/state/settings.store.ts
import { defineStore, z, createMemoryStorage } from 'stackpack-state'

export const settings = defineStore({
  name: 'settings',
  schema: z.object({ theme: z.enum(['light', 'dark']), language: z.string() }),
  initial: { theme: 'light' as const, language: 'en' },
  persist: {
    key: 'app-settings',
    storage: localStorage,        // or sessionStorage, or createMemoryStorage() for testing
    debounceMs: 200,
    version: 1,
    paths: ['theme', 'language'], // only persist these paths (omit transient state)
    migrate: (old: any, version: number) => {
      if (version === 0) return { ...old, language: 'en' }
      return old
    },
  },
})
```

**Hydration order**: On store creation, `persist` attempts to hydrate from storage. If storage has a valid value, it **overrides** `initial`. If storage is empty or fails validation, `initial` is used as fallback. Do not also manually hydrate with `localStorage.getItem()` — this causes double-writes and race conditions. Let `persist` handle it.

### Pattern 7: Store with Optimistic Updates

For instant UI feedback on async operations.

```typescript
// In a component or action file:
import { getDefaultActor } from 'stackpack-state'

async function toggleTodo(id: string, currentDone: boolean) {
  await todosStore.optimistic({
    apply: (draft) => {
      const todo = draft.items.find((i) => i.id === id)
      if (todo) todo.done = !todo.done
    },
    commit: () => api.updateTodo(id, { done: !currentDone }),
    reconcile: (draft, response: any) => {
      // Optional: update with server response (e.g., server-assigned timestamp)
      const todo = draft.items.find((i) => i.id === id)
      if (todo) todo.updatedAt = response.updatedAt
    },
    actor: getDefaultActor(),
  })
}
```

The framework handles: snapshot before apply, instant UI update, auto-rollback on failure, queue rebase for concurrent operations.

### Pattern 8: Store with Undo/Redo

For user-facing undo or agent speculative mutation.

```typescript
export const canvas = defineStore({
  name: 'canvas',
  schema: canvasSchema,
  initial: { shapes: [], selectedId: null },
  undo: { limit: 50 },
})

// Undo/redo:
canvas.store.undo()                    // revert last action
canvas.store.undo(3)                   // revert last 3 actions
canvas.store.redo()                    // re-apply last undone action
canvas.store.canUndo()                 // boolean
canvas.store.canRedo()                 // boolean

// In React:
<button disabled={!canvas.store.canUndo()} onClick={() => canvas.store.undo()}>Undo</button>
<button disabled={!canvas.store.canRedo()} onClick={() => canvas.store.redo()}>Redo</button>
```

### Pattern 9: Cross-Store Communication (Pub/Sub)

For stores that react to other stores' state changes.

```typescript
// src/state/auth.store.ts
export const auth = defineStore({
  name: 'auth',
  schema: authSchema,
  initial: { status: 'idle' as const },
  publishes: {
    authenticated: (prev, next) => next.status === 'authenticated' && prev.status !== 'authenticated',
    deauthenticated: (prev, next) => next.status !== 'authenticated' && prev.status === 'authenticated',
  },
})

// src/state/posts.store.ts
export const posts = defineStore({
  name: 'posts',
  schema: postsSchema,
  initial: { items: [], isLoading: false, error: null },
  subscribes: {
    'auth.authenticated': async ({ store, actor }) => {
      store.set('isLoading', true, actor)
      const data = await fetch('/api/posts').then(r => r.json())
      store.set('items', data, actor)
      store.set('isLoading', false, actor)
    },
    'auth.deauthenticated': ({ store, actor }) => {
      store.reset({ items: [], isLoading: false, error: null }, actor)
    },
  },
})
```

### Pattern 10: Store with Property Invariants

For catching logic bugs during development.

```typescript
export const cart = defineStore({
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

Properties are checked after every mutation. Violations log `console.warn` with the property name and action that caused it. They warn, not block — use Zod `.refine()` for hard enforcement.

### Pattern 11: Sync with Backend (Auth + Pub/Sub)

For apps that sync state to a backend (Supabase, Firebase, etc.) based on auth context. Use a separate `auth` store and pub/sub — never thread `authUserId` through every action.

```typescript
// src/state/auth.store.ts
export const auth = defineStore({
  name: 'auth',
  schema: z.discriminatedUnion('status', [
    z.object({ status: z.literal('anonymous') }),
    z.object({ status: z.literal('authenticated'), userId: z.string(), token: z.string() }),
  ]),
  initial: { status: 'anonymous' as const },
  publishes: {
    authenticated: (prev, next) => next.status === 'authenticated' && prev.status !== 'authenticated',
    deauthenticated: (prev, next) => next.status !== 'authenticated' && prev.status === 'authenticated',
  },
})

// src/state/app.store.ts — subscribes to auth events, syncs to backend
export const app = defineStore({
  name: 'app',
  schema: appSchema,
  initial: defaultAppState,
  subscribes: {
    'auth.authenticated': async ({ store, actor }) => {
      // Fetch user data from backend on login
      const userId = auth.store.get<string>('userId')
      const data = await fetchUserData(userId!)
      store.update(d => { Object.assign(d, data) }, actor)
    },
    'auth.deauthenticated': ({ store, actor }) => {
      store.reset(defaultAppState, actor)
    },
  },
  effects: {
    syncToBackend: {
      watch: '*',
      debounce: 500,
      handler: async ({ state }) => {
        if (auth.store.get('status') !== 'authenticated') return
        await saveToBackend(auth.store.get<string>('userId')!, state)
      },
    },
  },
})
```

This avoids threading `authUserId?: string` through every action — the sync effect reads auth state directly from the auth store.

### Pattern 12: Effects with External Data

When effects need data from outside the store (static configs, API responses, React context):

**Option A** — Copy reference data into the store on mount, then use effects:
```typescript
// On app mount, seed static data into the store
app.store.set('quests', questsFromConfig)
app.store.set('achievements', achievementsFromConfig)

// Now effects can reference it directly
effects: {
  evaluateAchievements: {
    watch: 'completedQuestIds',
    handler: ({ state, store }) => {
      const newlyUnlocked = state.achievements.filter(a => checkCriteria(a, state))
      store.set('unlockedAchievements', newlyUnlocked)
    },
  },
}
```

**Option B** — Keep orchestration in React when it bridges multiple non-store data sources. A `useEffect` in a top-level component is the pragmatic choice when the logic requires `DataContext`, route params, or other React-only state.

---

## React Hooks Reference

```typescript
import {
  useStore, useValue, useChange, useUpdate,
  useWhen, useGate, useComputed, useFlow,
  useStoreListener, useAgentStatus,
} from 'stackpack-state/react'
import { Gated, MultiStoreProvider } from 'stackpack-state/react'
```

### useStore — Full access

```typescript
const { value, change, update, reset, has, when, history } = useStore<T>('storeName')

value                           // T — current state
change('path', newValue)        // set a path
update(draft => { /* immer */ })// Immer mutation
reset({ ...newState })          // full reset
when.isEmpty                    // when condition values
```

### useValue — Single path (fine-grained)

```typescript
const filter = useValue<string>('todos', 'filter')
// Only re-renders when 'filter' changes, not the whole store
```

**Note**: `useValue` returns `unknown` without the type parameter — always provide the generic: `useValue<string>(...)`. For type-safe access without generics, use selectors: `useSelect('todos', todos.select.filter)`.

### useChange / useUpdate — Mutation only

```typescript
const change = useChange('todos')
change('filter', 'active')

const update = useUpdate<TodosState>('todos')
update(draft => { draft.items.push(newItem) })
```

### useWhen / useGate — Conditions

```typescript
const { isEmpty, isFiltered } = useWhen('todos')
const isAuthenticated = useGate('auth', 'isAuthenticated')
```

### useComputed — Derived values

```typescript
const activeCount = useComputed<number>('todos', 'activeCount')
const totalPages = useComputed<number>('posts', 'totalPages')
```

### Gated — Conditional mounting

```tsx
<Gated store="auth" gate="isAuthenticated" fallback={<LoginPage />}>
  <Dashboard />
</Gated>
```

### useFlow — Flow navigation

```typescript
const { current, has, go } = useFlow('checkout')
go('/checkout', 'Payment')
```

### Auto-Generated Selectors

When a store has a Zod schema, `defineStore` creates a selector tree:

```typescript
const todos = defineStore({
  name: 'todos',
  schema: z.object({
    items: z.array(z.object({ id: z.string(), text: z.string() })),
    filter: z.string(),
    ui: z.object({ searchOpen: z.boolean() }),
  }),
  initial: { items: [], filter: 'all', ui: { searchOpen: false } },
})

// Access selectors:
todos.select.filter.$path      // 'filter'
todos.select.filter.$select(state)  // reads state.filter
todos.select.ui.searchOpen.$path    // 'ui.searchOpen'

// Use with useValue for fine-grained subscriptions:
const filter = useValue('todos', todos.select.filter.$path)
```

---

## Introspection API

For agents that need to understand the state system at runtime:

```typescript
import { storeRegistry } from 'stackpack-state'

const system = storeRegistry.introspect()
// Returns:
// {
//   stores: {
//     auth: { name, state, when, gates, computed, dependencies, historyLength },
//     todos: { ... },
//   },
//   storeNames: ['auth', 'todos'],
//   storeCount: 2,
// }
```

---

## Schema Migrations

For safely evolving store schemas:

```typescript
import { applyMigration, createSystemActor } from 'stackpack-state'

const result = applyMigration(settingsStore, {
  add: { 'preferences.notifications': { schema: z.boolean(), default: true } },
  rename: { userName: 'user.displayName' },
  remove: ['legacyField'],
  transform: { 'user.email': (v) => (v as string).toLowerCase() },
}, createSystemActor('migration'))

if (!result.success) console.error(result.errors)
```

Operations apply in order: rename, transform, remove, add. The result is validated against the Zod schema before committing.

---

## Refactoring Existing Projects

See [refactoring.md](./refactoring.md) for detailed migration guides from useState, Redux, Zustand, Jotai, and XState.

---

## Presence: Animated Lifecycle

The fifth primitive. Presence solves React's fundamental animation problem — React has no concept of "this element should be removed, but not yet."

### When to Use Presence vs Gate

| | `<Gated>` | `<Presence>` |
|---|---|---|
| Mount | When gate opens | When gate opens |
| Unmount | Immediately | After leave animation completes |
| Fallback | Shows fallback content | No fallback (element fades out) |
| Use case | Auth, feature flags, data readiness | Modals, toasts, list items, page transitions |

**Rule**: If the user will *see* the element disappear, use Presence. If it's a structural gate (auth, data loading), use Gate.

### Pattern: CSS-Only Animated Modal

```typescript
// src/state/modal.store.ts
import { defineStore, z } from 'stackpack-state'

export const modal = defineStore({
  name: 'modal',
  schema: z.object({ isOpen: z.boolean(), content: z.string() }),
  initial: { isOpen: false, content: '' },
  gates: {
    isOpen: (s) => s.isOpen,
  },
})
```

```tsx
// Component — CSS transitions, no animation library
import { Presence } from 'stackpack-state/react'

<Presence store="modal" gate="isOpen" timeout={300}>
  {({ phase, ref }) => (
    <div ref={ref} className={`modal modal--${phase}`}>
      <ModalContent />
    </div>
  )}
</Presence>
```

```css
.modal--entering { opacity: 0; transform: translateY(8px); }
.modal--present  { opacity: 1; transform: translateY(0); transition: all 300ms ease; }
.modal--leaving  { opacity: 0; transform: translateY(8px); transition: all 300ms ease; }
```

Set `timeout` to match the CSS transition duration. The element auto-removes after the timeout.

### Pattern: usePresence Hook (Direct Control)

```tsx
import { usePresence } from 'stackpack-state/react'

function Modal() {
  const { isPresent, phase, done, ref } = usePresence('modal', 'isOpen', { timeout: 300 })

  if (!isPresent) return null

  return (
    <div ref={ref} className={`modal modal--${phase}`}>
      <ModalContent />
    </div>
  )
}
```

The `ref` callback auto-detects `transitionend` events and calls `done()` automatically. You can also call `done()` manually.

### Pattern: Animated List Items

```tsx
import { usePresenceList } from 'stackpack-state/react'

function TodoList() {
  const { items, done, entered } = usePresenceList('todos', 'items', {
    timeout: 250,
    keyFn: (item) => item.id,
  })

  return (
    <ul>
      {items.map(record => (
        <li
          key={record.key}
          className={`todo todo--${record.phase}`}
          onTransitionEnd={() => {
            if (record.phase === 'leaving') done(record.key)
            if (record.phase === 'entering') entered(record.key)
          }}
        >
          {record.value.text}
        </li>
      ))}
    </ul>
  )
}
```

Removed items stay in the DOM during their leave animation. The `record.value` is frozen at leave time — no stale data.

### Pattern: Skeleton-to-Content Crossfade

```tsx
function PostSection() {
  const loading = usePresence('posts', 'isLoading', { timeout: 300 })
  const loaded = usePresence('posts', 'isLoaded', { timeout: 300 })

  return (
    <div className="post-section">
      {loading.isPresent && (
        <Skeleton className={`skeleton skeleton--${loading.phase}`} ref={loading.ref} />
      )}
      {loaded.isPresent && (
        <PostList className={`content content--${loaded.phase}`} ref={loaded.ref} />
      )}
    </div>
  )
}
```

Both elements can overlap briefly during the transition — the skeleton leaves while content enters.

### Presence Pitfalls

- **Always set a timeout as safety net** — if `done()` is never called and `timeout=0`, leaving items accumulate. Default timeout is 300ms.
- **Presence reads gates, not when** — the gate must exist on the store for `usePresence` to track it.
- **Don't use Presence for auth/data gates** — those should mount/unmount immediately with `<Gated>`.

---

## Component Binding Contracts

Declare which store data a component reads, writes, and gates. Machine-readable for agent impact analysis. In dev mode, warns when a component reads store paths not declared in its contract.

```typescript
import { withContract } from 'stackpack-state/react'

const TodoList = withContract(
  {
    reads: {
      items: { store: 'todos', path: 'items' },
      filter: { store: 'todos', path: 'filter' },
    },
    writes: [{ store: 'todos', actions: ['toggleTodo', 'deleteTodo'] }],
    gates: [{ store: 'auth', gate: 'isAuthenticated' }],
  },
  function TodoList() {
    const { value } = useStore('todos')
    // In dev mode: warns if component reads paths not in `reads`
    return <ul>{/* ... */}</ul>
  }
)
```

Query contracts programmatically:

```typescript
import { findAffectedComponents, findComponentsByAction, findGatedComponents } from 'stackpack-state/react'

findAffectedComponents('todos', 'items')        // ['TodoList'] — who re-renders when items change?
findComponentsByAction('todos', 'toggleTodo')    // ['TodoList'] — who calls toggleTodo?
findGatedComponents('auth', 'isAuthenticated')   // ['TodoList'] — who unmounts when auth drops?
```

Contracts are optional — introspection covers 80% of the same need. Use contracts when you need precise per-component impact analysis.

---

## Quick Decision Tree

```
Need state?
├── Used by one component only → useState (no store)
├── Shared across components
│   ├── Is it auth? → Separate auth store with gates
│   ├── Is it a form? → Together store (fields + submitting + errors)
│   ├── Is it API data? → Together store (data + loading + error)
│   │   ├── Has distinct modes? → Use discriminated union schema
│   │   ├── Needs loading/pagination? → composeStore with Loadable/Paginated
│   │   └── Needs persistence? → Add persist option
│   ├── Is it a multi-step process? → createFlow
│   └── Otherwise → Together store
├── Condition type?
│   ├── Controls mounting (no animation needed) → Gate
│   ├── Controls mounting (animated enter/leave) → Presence
│   └── Changes appearance → When
└── Cross-store coordination?
    ├── Store A changes cause Store B to act → Pub/Sub
    └── Multiple stores change atomically → together()
```

## Key Rules

1. **Actor is optional** — `store.set('path', value)` works without an actor (defaults to a human "user" actor). Explicit actors for system/agent operations: `store.set('path', value, systemActor)`
2. **Zod validates everything** — initial state and every mutation auto-validated, invalid mutations rolled back
3. **When = cheap, Gate = expensive** — when triggers re-render, gate triggers mount/unmount
4. **One store per API endpoint** — data + loading + error together
5. **Auth is always separate** — separate store that gates the app
6. **Forms are always together** — fields + submitting + errors in one store
7. **Single-component state stays local** — `useState` doesn't need a store
8. **Schema is the contract** — agents query the schema, not the code
9. **Actions are self-contained** — every action receives all data it needs as parameters. Actions never close over external arrays, context, or component state. This is a deliberate design choice for testability:
   ```typescript
   // WRONG: closes over external data
   const quests = [...]; function completeQuest(id: string) { const q = quests.find(...) }
   // RIGHT: self-contained
   export function completeQuest(id: string, points: number) { ... }
   ```
10. **Import stores directly, never use getStore()** — `getStore()` returns untyped `Store<unknown>`. Import the `defineStore` result: `import { todos } from './todos.store'`
