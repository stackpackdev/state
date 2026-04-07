# stackpack-state Examples

Real-world examples showing how to implement common app patterns.

---

## Example 1: Todo App (Complete)

### Stores

```typescript
// src/state/todos.store.ts
import { defineStore, z } from 'stackpack-state'

const TodoSchema = z.object({
  id: z.string(),
  text: z.string().min(1),
  done: z.boolean(),
  createdAt: z.number(),
})

export type Todo = z.infer<typeof TodoSchema>

export const todos = defineStore({
  name: 'todos',
  schema: z.object({
    items: z.array(TodoSchema),
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
    doneCount: (s) => s.items.filter(i => i.done).length,
    filteredItems: (s) => {
      if (s.filter === 'all') return s.items
      return s.items.filter(i => s.filter === 'active' ? !i.done : i.done)
    },
  },
  properties: {
    'no duplicate ids': (s) => new Set(s.items.map(i => i.id)).size === s.items.length,
  },
  undo: { limit: 20 },
  persist: {
    key: 'todos',
    storage: localStorage,
    paths: ['items', 'filter'],
  },
})
```

### Components

```tsx
// src/components/TodoApp.tsx
import { useStore, useComputed, useGate, Gated } from 'stackpack-state/react'
import type { Todo } from '../state/todos.store'

export function TodoApp() {
  const { update } = useStore('todos')
  const activeCount = useComputed<number>('todos', 'activeCount')

  function addTodo(text: string) {
    update(draft => {
      draft.items.push({
        id: crypto.randomUUID(),
        text,
        done: false,
        createdAt: Date.now(),
      })
    })
  }

  return (
    <div>
      <AddTodoForm onAdd={addTodo} />
      <Gated store="todos" gate="hasItems" fallback={<p>No todos yet</p>}>
        <TodoList />
      </Gated>
      <footer>{activeCount} items left</footer>
      <FilterBar />
      <UndoControls />
    </div>
  )
}

function TodoList() {
  const filteredItems = useComputed<Todo[]>('todos', 'filteredItems')
  const { update } = useStore('todos')

  function toggle(id: string) {
    update(draft => {
      const todo = draft.items.find(i => i.id === id)
      if (todo) todo.done = !todo.done
    })
  }

  return (
    <ul>
      {filteredItems.map(todo => (
        <li key={todo.id}>
          <input type="checkbox" checked={todo.done} onChange={() => toggle(todo.id)} />
          <span style={{ textDecoration: todo.done ? 'line-through' : 'none' }}>{todo.text}</span>
        </li>
      ))}
    </ul>
  )
}

function FilterBar() {
  const { value, change } = useStore('todos')
  return (
    <div>
      {(['all', 'active', 'done'] as const).map(f => (
        <button key={f} onClick={() => change('filter', f)} disabled={value.filter === f}>
          {f}
        </button>
      ))}
    </div>
  )
}

function UndoControls() {
  const { store } = require('../state/todos.store').todos
  return (
    <div>
      <button disabled={!store.canUndo()} onClick={() => store.undo()}>Undo</button>
      <button disabled={!store.canRedo()} onClick={() => store.redo()}>Redo</button>
    </div>
  )
}
```

---

## Example 2: Auth-Gated Dashboard

### Stores

```typescript
// src/state/auth.store.ts
import { defineStore, z, createSystemActor } from 'stackpack-state'

const UserSchema = z.object({ id: z.string(), name: z.string(), email: z.string(), role: z.enum(['admin', 'user']) })

export const auth = defineStore({
  name: 'auth',
  schema: z.discriminatedUnion('status', [
    z.object({ status: z.literal('idle') }),
    z.object({ status: z.literal('loading') }),
    z.object({ status: z.literal('authenticated'), user: UserSchema, token: z.string() }),
    z.object({ status: z.literal('error'), error: z.string() }),
  ]),
  initial: { status: 'idle' as const },
  computed: {
    isAdmin: (s) => s.status === 'authenticated' && s.user.role === 'admin',
  },
  persist: {
    key: 'auth',
    storage: localStorage,
    version: 1,
  },
  publishes: {
    authenticated: (prev, next) => next.status === 'authenticated' && prev.status !== 'authenticated',
    deauthenticated: (prev, next) => next.status !== 'authenticated' && prev.status === 'authenticated',
  },
  // Auto-derived gates: idle, loading, authenticated, error
  // Auto-derived when: isIdle, isLoading, isAuthenticated, isError
})

// src/state/dashboard.store.ts
import { defineStore, z } from 'stackpack-state'
import { composeStore, Loadable } from 'stackpack-state/components'

const StatSchema = z.object({ label: z.string(), value: z.number(), trend: z.number() })

export const dashboard = composeStore({
  name: 'dashboard',
  schema: z.object({
    stats: z.array(StatSchema),
    lastRefresh: z.number(),
  }),
  components: [Loadable],
  initial: { stats: [], lastRefresh: 0 },
  dependencies: {
    reads: [],
    gatedBy: ['auth'],
    triggers: ['auth'],
  },
  subscribes: {
    'auth.authenticated': async ({ store, actor }) => {
      store.set('isLoading', true, actor)
      const data = await fetch('/api/dashboard').then(r => r.json())
      store.update(draft => {
        draft.stats = data.stats
        draft.lastRefresh = Date.now()
        draft.isLoading = false
      }, actor)
    },
    'auth.deauthenticated': ({ store, actor }) => {
      store.reset({ stats: [], lastRefresh: 0, isLoading: false, error: null }, actor)
    },
  },
})
```

### Components

```tsx
// src/App.tsx
import { Gated } from 'stackpack-state/react'

export function App() {
  return (
    <Gated store="auth" gate="authenticated" fallback={<LoginPage />}>
      <Gated store="auth" gate="loading" fallback={null}>
        <LoadingOverlay />
      </Gated>
      <DashboardPage />
    </Gated>
  )
}

function DashboardPage() {
  const { value } = useStore('dashboard')
  const stats = useValue<Stat[]>('dashboard', 'stats')

  return (
    <Gated store="dashboard" gate="isLoaded" fallback={<Spinner />}>
      <div>
        {stats.map(stat => (
          <StatCard key={stat.label} label={stat.label} value={stat.value} trend={stat.trend} />
        ))}
      </div>
    </Gated>
  )
}
```

---

## Example 3: E-Commerce Checkout (Transitions)

```typescript
// src/state/checkout.store.ts
import { defineStore, z, createSystemActor } from 'stackpack-state'

const ItemSchema = z.object({ id: z.string(), name: z.string(), price: z.number(), qty: z.number() })
const AddressSchema = z.object({ street: z.string(), city: z.string(), zip: z.string() })
const PaymentSchema = z.object({ method: z.enum(['card', 'paypal']), last4: z.string().optional() })

export const checkout = defineStore({
  name: 'checkout',
  schema: z.discriminatedUnion('step', [
    z.object({ step: z.literal('cart'), items: z.array(ItemSchema) }),
    z.object({ step: z.literal('shipping'), items: z.array(ItemSchema), address: AddressSchema }),
    z.object({ step: z.literal('payment'), items: z.array(ItemSchema), address: AddressSchema, payment: PaymentSchema }),
    z.object({ step: z.literal('reviewing'), items: z.array(ItemSchema), address: AddressSchema, payment: PaymentSchema }),
    z.object({ step: z.literal('confirmed'), orderId: z.string(), total: z.number() }),
  ]),
  initial: { step: 'cart' as const, items: [] },
  transitions: {
    'cart -> shipping': 'proceedToShipping',
    'shipping -> payment': 'proceedToPayment',
    'shipping -> cart': 'backToCart',
    'payment -> reviewing': 'review',
    'payment -> shipping': 'backToShipping',
    'reviewing -> confirmed': 'confirm',
    'reviewing -> payment': 'editPayment',
    '* -> cart': 'reset',
  },
  computed: {
    subtotal: (s) => 'items' in s ? s.items.reduce((sum, i) => sum + i.price * i.qty, 0) : 0,
    itemCount: (s) => 'items' in s ? s.items.reduce((sum, i) => sum + i.qty, 0) : 0,
  },
  effects: {
    submitOrder: {
      watch: 'reviewing -> confirmed',
      handler: async ({ state, store, signal }) => {
        if (state.step !== 'reviewing') return
        const res = await fetch('/api/orders', {
          method: 'POST',
          body: JSON.stringify({ items: state.items, address: state.address, payment: state.payment }),
          signal,
        })
        const { orderId, total } = await res.json()
        store.reset({ step: 'confirmed' as const, orderId, total }, createSystemActor('checkout'))
      },
    },
  },
  // Auto-derived gates: cart, shipping, payment, reviewing, confirmed
})
```

```tsx
// src/components/Checkout.tsx
import { Gated, useStore } from 'stackpack-state/react'

export function Checkout() {
  return (
    <>
      <Gated store="checkout" gate="cart"><CartStep /></Gated>
      <Gated store="checkout" gate="shipping"><ShippingStep /></Gated>
      <Gated store="checkout" gate="payment"><PaymentStep /></Gated>
      <Gated store="checkout" gate="reviewing"><ReviewStep /></Gated>
      <Gated store="checkout" gate="confirmed"><ConfirmationStep /></Gated>
    </>
  )
}

function CartStep() {
  const { value, update } = useStore('checkout')
  const subtotal = useComputed<number>('checkout', 'subtotal')

  function proceedToShipping(address: Address) {
    update(draft => {
      Object.assign(draft, { step: 'shipping', address })
    })
  }

  return (
    <div>
      <h2>Cart ({value.items.length} items, ${subtotal})</h2>
      {/* item list, address form, etc. */}
      <button onClick={() => proceedToShipping(addressFormData)}>Continue to Shipping</button>
    </div>
  )
}
```

---

## Example 4: Real-Time Search with Effects

```typescript
// src/state/search.store.ts
import { defineStore, z, createSystemActor } from 'stackpack-state'

const ResultSchema = z.object({
  id: z.string(),
  title: z.string(),
  snippet: z.string(),
  score: z.number(),
})

export const search = defineStore({
  name: 'search',
  schema: z.object({
    query: z.string(),
    results: z.array(ResultSchema),
    isSearching: z.boolean(),
    totalResults: z.number(),
  }),
  initial: { query: '', results: [], isSearching: false, totalResults: 0 },
  when: {
    isSearching: (s) => s.isSearching,
    hasQuery: (s) => s.query.length > 0,
    hasResults: (s) => s.results.length > 0,
  },
  gates: {
    showResults: (s) => s.query.length > 0 && !s.isSearching,
    showEmpty: (s) => s.query.length > 0 && !s.isSearching && s.results.length === 0,
  },
  effects: {
    search: {
      watch: 'query',
      debounce: 300,
      handler: async ({ state, store, signal }) => {
        if (!state.query.trim()) {
          store.update(draft => { draft.results = []; draft.totalResults = 0 }, createSystemActor('search'))
          return
        }
        store.set('isSearching', true, createSystemActor('search'))
        try {
          const res = await fetch(`/api/search?q=${encodeURIComponent(state.query)}`, { signal })
          const { results, total } = await res.json()
          store.update(draft => {
            draft.results = results
            draft.totalResults = total
            draft.isSearching = false
          }, createSystemActor('search'))
        } catch (e: any) {
          if (e.name !== 'AbortError') {
            store.set('isSearching', false, createSystemActor('search'))
          }
        }
      },
    },
  },
})
```

```tsx
// src/components/Search.tsx
import { useStore, useWhen, Gated } from 'stackpack-state/react'

export function SearchPage() {
  const { change } = useStore('search')
  const { isSearching, hasQuery } = useWhen('search')

  return (
    <div>
      <input
        placeholder="Search..."
        onChange={(e) => change('query', e.target.value)}
      />
      {isSearching && <Spinner />}
      <Gated store="search" gate="showResults">
        <SearchResults />
      </Gated>
      <Gated store="search" gate="showEmpty">
        <p>No results found</p>
      </Gated>
    </div>
  )
}
```

---

## Example 5: Optimistic Todo Toggle

```typescript
// src/actions/todos.ts
import { todos } from '../state/todos.store'
import { getDefaultActor } from 'stackpack-state'

export async function toggleTodo(id: string) {
  const result = await todos.store.optimistic({
    apply: (draft) => {
      const todo = draft.items.find(i => i.id === id)
      if (todo) todo.done = !todo.done
    },
    commit: async () => {
      const todo = todos.store.getState().items.find(i => i.id === id)
      return fetch(`/api/todos/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ done: todo?.done }),
      })
    },
    actor: getDefaultActor(),
  })

  if (!result.success) {
    // State was automatically rolled back
    console.error('Toggle failed:', result.error)
  }
}

export async function deleteTodo(id: string) {
  await todos.store.optimistic({
    apply: (draft) => {
      draft.items = draft.items.filter(i => i.id !== id)
    },
    commit: () => fetch(`/api/todos/${id}`, { method: 'DELETE' }),
    actor: getDefaultActor(),
  })
}
```

---

## Example 6: Composed Data Table

```typescript
// src/state/users-table.store.ts
import { z } from 'stackpack-state'
import { composeStore, Loadable, Paginated, Filterable, Selectable } from 'stackpack-state/components'

const UserRowSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string(),
  role: z.string(),
  createdAt: z.number(),
})

export const usersTable = composeStore({
  name: 'usersTable',
  schema: z.object({
    rows: z.array(UserRowSchema),
  }),
  components: [Loadable, Paginated, Filterable, Selectable],
  initial: { rows: [] },
  // Gets you for free:
  // Fields: isLoading, error, page, pageSize, total, filter, sortBy, sortOrder, selectedIds
  // When: isLoading, hasError, isFirstPage, isLastPage, hasFilter, isAscending, hasSelection
  // Gates: isLoaded, hasError
  // Computed: totalPages, hasNextPage, hasPrevPage, selectedCount
})
```

```tsx
function UsersTable() {
  const { value, change } = useStore('usersTable')
  const totalPages = useComputed<number>('usersTable', 'totalPages')
  const selectedCount = useComputed<number>('usersTable', 'selectedCount')
  const { isFirstPage, isLastPage, hasSelection } = useWhen('usersTable')

  return (
    <Gated store="usersTable" gate="isLoaded" fallback={<TableSkeleton />}>
      <div>
        <input placeholder="Filter..." onChange={e => change('filter', e.target.value)} />
        {hasSelection && <span>{selectedCount} selected</span>}
        <table>{/* render value.rows */}</table>
        <div>
          <button disabled={isFirstPage} onClick={() => change('page', value.page - 1)}>Prev</button>
          <span>Page {value.page} of {totalPages}</span>
          <button disabled={isLastPage} onClick={() => change('page', value.page + 1)}>Next</button>
        </div>
      </div>
    </Gated>
  )
}
```

---

## Example 7: Provider Setup

```tsx
// src/state/index.ts
export { auth } from './auth.store'
export { todos } from './todos.store'
export { search } from './search.store'
export { checkout } from './checkout.store'

// src/state/provider.tsx
import { MultiStoreProvider } from 'stackpack-state/react'
import { auth, todos, search, checkout } from './index'

export function StateProvider({ children }: { children: React.ReactNode }) {
  return (
    <MultiStoreProvider stores={[auth.store, todos.store, search.store, checkout.store]}>
      {children}
    </MultiStoreProvider>
  )
}

// src/main.tsx
import { StateProvider } from './state/provider'

createRoot(document.getElementById('root')!).render(
  <StateProvider>
    <App />
  </StateProvider>
)
```
