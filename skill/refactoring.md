# Refactoring to state-agent

Step-by-step migration guides for moving existing React projects to state-agent.

---

## General Strategy

1. **Audit** — List all state sources (useState, context, Redux slices, Zustand stores, atoms, state machines)
2. **Classify** — For each: Together (one store) or Separate (own store)? When or Gate conditions?
3. **Migrate bottom-up** — Start with leaf stores (no dependencies), then stores that depend on them
4. **One store at a time** — Don't do a big-bang rewrite. Migrate one slice/hook/atom, verify, move on.
5. **Delete old code** — After each migration, remove the old state management code completely

---

## From useState

### Before

```typescript
function TodoApp() {
  const [items, setItems] = useState<Todo[]>([])
  const [filter, setFilter] = useState<'all' | 'active' | 'done'>('all')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setIsLoading(true)
    fetch('/api/todos')
      .then(r => r.json())
      .then(data => { setItems(data); setIsLoading(false) })
      .catch(err => { setError(err.message); setIsLoading(false) })
  }, [])

  const filteredItems = useMemo(() =>
    filter === 'all' ? items : items.filter(i => filter === 'active' ? !i.done : i.done),
    [items, filter]
  )

  // ... renders
}
```

**Problems**: State scattered across 4 hooks. Loading/error/data can be in impossible combinations. Side effect in useEffect. Computed value manually memoized. None of this is reusable.

### After

```typescript
// src/state/todos.store.ts
import { defineStore, z, createSystemActor } from 'state-agent'

const TodoSchema = z.object({ id: z.string(), text: z.string(), done: z.boolean() })

export const todos = defineStore({
  name: 'todos',
  schema: z.discriminatedUnion('status', [
    z.object({ status: z.literal('idle'), items: z.array(TodoSchema), filter: z.enum(['all', 'active', 'done']) }),
    z.object({ status: z.literal('loading'), items: z.array(TodoSchema), filter: z.enum(['all', 'active', 'done']) }),
    z.object({ status: z.literal('success'), items: z.array(TodoSchema), filter: z.enum(['all', 'active', 'done']) }),
    z.object({ status: z.literal('error'), items: z.array(TodoSchema), filter: z.enum(['all', 'active', 'done']), error: z.string() }),
  ]),
  initial: { status: 'idle' as const, items: [], filter: 'all' as const },
  computed: {
    filteredItems: (s) => s.filter === 'all' ? s.items : s.items.filter(i =>
      s.filter === 'active' ? !i.done : i.done
    ),
    activeCount: (s) => s.items.filter(i => !i.done).length,
  },
  effects: {
    fetchOnMount: {
      watch: 'status',  // or trigger manually
      handler: async ({ state, store, signal }) => {
        if (state.status !== 'loading') return
        try {
          const res = await fetch('/api/todos', { signal })
          const data = await res.json()
          store.update(draft => { draft.status = 'success'; draft.items = data }, createSystemActor('fetch'))
        } catch (e: any) {
          store.update(draft => { draft.status = 'error'; draft.error = e.message }, createSystemActor('fetch'))
        }
      },
    },
  },
  // Auto-derived: gates.idle, gates.loading, gates.success, gates.error
  // Auto-derived: when.isIdle, when.isLoading, when.isSuccess, when.isError
})
```

```tsx
// Component — clean, no state management logic
function TodoApp() {
  const { value, change, update } = useStore('todos')
  const filteredItems = useComputed<Todo[]>('todos', 'filteredItems')
  const activeCount = useComputed<number>('todos', 'activeCount')

  return (
    <Gated store="todos" gate="loading" fallback={<Spinner />}>
      <Gated store="todos" gate="error" fallback={<ErrorMessage />}>
        <TodoList items={filteredItems} />
        <span>{activeCount} items left</span>
      </Gated>
    </Gated>
  )
}
```

### Migration Checklist (useState)

- [ ] Group related `useState` calls → one store schema
- [ ] Multiple boolean flags that are mutually exclusive → discriminated union
- [ ] `useMemo` derived values → `computed` in store
- [ ] `useEffect` for data fetching → `effects` in store
- [ ] `useCallback` mutation handlers → `useChange`/`useUpdate` hooks
- [ ] Prop drilling → `useStore`/`useValue` in child components
- [ ] Context providers wrapping half the app → one `MultiStoreProvider`

---

## From Redux / Redux Toolkit

### Before (Redux Toolkit)

```typescript
// todosSlice.ts
const todosSlice = createSlice({
  name: 'todos',
  initialState: { items: [], filter: 'all', isLoading: false },
  reducers: {
    addTodo: (state, action) => { state.items.push(action.payload) },
    toggleTodo: (state, action) => {
      const todo = state.items.find(i => i.id === action.payload)
      if (todo) todo.done = !todo.done
    },
    setFilter: (state, action) => { state.filter = action.payload },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchTodos.pending, (state) => { state.isLoading = true })
      .addCase(fetchTodos.fulfilled, (state, action) => {
        state.isLoading = false
        state.items = action.payload
      })
  },
})

// selectors.ts
const selectFilteredTodos = createSelector(
  [(s) => s.todos.items, (s) => s.todos.filter],
  (items, filter) => filter === 'all' ? items : items.filter(i => ...)
)
```

### After

```typescript
// src/state/todos.store.ts
export const todos = defineStore({
  name: 'todos',
  schema: z.object({
    items: z.array(TodoSchema),
    filter: z.enum(['all', 'active', 'done']),
    isLoading: z.boolean(),
  }),
  initial: { items: [], filter: 'all' as const, isLoading: false },
  when: {
    isLoading: (s) => s.isLoading,
  },
  gates: {
    hasItems: (s) => s.items.length > 0,
  },
  computed: {
    filteredTodos: (s) => s.filter === 'all' ? s.items : s.items.filter(i =>
      s.filter === 'active' ? !i.done : i.done
    ),
  },
})

// Usage — no action creators, no dispatch, no selectors to write:
const { update, change } = useStore('todos')
update(draft => { draft.items.push(newTodo) })     // same Immer syntax as RTK
change('filter', 'active')                          // direct path set
```

### Migration Mapping (Redux → state-agent)

| Redux Concept | state-agent Equivalent |
|--------------|----------------------|
| `createSlice` | `defineStore` |
| `initialState` | `initial` |
| `reducers` | `store.update(draft => {})` (Immer, same syntax) |
| `extraReducers` | `effects` (declarative, auto-cancel) |
| `createAsyncThunk` | `store.optimistic()` or `effects` |
| `createSelector` | `computed` or `store.select` tree |
| `useSelector(selector)` | `useValue('store', 'path')` or `useComputed` |
| `useDispatch` + `dispatch(action)` | `useChange`/`useUpdate` (no dispatch concept) |
| `configureStore({ reducer })` | `MultiStoreProvider` |
| `middleware` | `middleware` (same enter/leave pattern) |
| Multiple slices in one store | Separate stores with `dependencies` |

### Migration Checklist (Redux)

- [ ] Each Redux slice → one `defineStore`
- [ ] `configureStore` root reducer → `MultiStoreProvider` with all stores
- [ ] `useSelector` calls → `useValue` or `useComputed`
- [ ] `useDispatch` + `dispatch(action())` → `useChange`/`useUpdate`
- [ ] `createAsyncThunk` → `effects` or `store.optimistic()`
- [ ] `createSelector` → `computed` in store definition
- [ ] Redux DevTools → `storeRegistry.introspect()` + `store.getHistory()`
- [ ] Remove `@reduxjs/toolkit`, `react-redux` from dependencies

---

## From Zustand

### Before

```typescript
const useTodoStore = create((set, get) => ({
  items: [],
  filter: 'all',
  addTodo: (todo) => set((state) => ({ items: [...state.items, todo] })),
  toggleTodo: (id) => set((state) => ({
    items: state.items.map(i => i.id === id ? { ...i, done: !i.done } : i)
  })),
  setFilter: (filter) => set({ filter }),
  get filteredItems() {
    const { items, filter } = get()
    return filter === 'all' ? items : items.filter(i => ...)
  },
}))

// Component
const items = useTodoStore(s => s.items)            // manual selector
const addTodo = useTodoStore(s => s.addTodo)        // action selector
```

### After

```typescript
export const todos = defineStore({
  name: 'todos',
  schema: z.object({
    items: z.array(TodoSchema),
    filter: z.enum(['all', 'active', 'done']),
  }),
  initial: { items: [], filter: 'all' as const },
  computed: {
    filteredItems: (s) => s.filter === 'all' ? s.items : s.items.filter(i =>
      s.filter === 'active' ? !i.done : i.done
    ),
  },
})

// Component — no action selectors, no manual selectors
const items = useValue<Todo[]>('todos', 'items')              // path-scoped subscription
const filteredItems = useComputed<Todo[]>('todos', 'filteredItems')
const update = useUpdate<TodosState>('todos')
update(draft => { draft.items.push(newTodo) })
```

### Migration Mapping (Zustand → state-agent)

| Zustand Concept | state-agent Equivalent |
|----------------|----------------------|
| `create((set, get) => ({...}))` | `defineStore({ schema, initial })` |
| `set(partial)` | `store.set(path, value, actor)` |
| `set(fn)` | `store.update(draft => {}, actor)` |
| `get()` | `store.getState()` |
| `useStore(selector)` | `useValue('store', 'path')` |
| `useStore(s => s.action)` | `useChange`/`useUpdate` (no action selectors needed) |
| Actions inside store | Actions are just `store.update()` calls — define anywhere |
| `persist` middleware | `persist` option in `defineStore` |
| `devtools` middleware | `storeRegistry.introspect()` |
| `subscribeWithSelector` | `store.subscribe(listener, path)` (built-in) |

### Migration Checklist (Zustand)

- [ ] `create()` calls → `defineStore()` with Zod schema
- [ ] Inline actions → standalone functions using `store.update()`
- [ ] `useStore(selector)` → `useValue('store', 'path')`
- [ ] `persist` middleware → `persist` option
- [ ] Manual memoization → `computed`
- [ ] `immer` middleware → built-in (Immer is default)
- [ ] Remove `zustand` from dependencies

---

## From Jotai

### Before

```typescript
const itemsAtom = atom<Todo[]>([])
const filterAtom = atom<'all' | 'active' | 'done'>('all')
const filteredItemsAtom = atom((get) => {
  const items = get(itemsAtom)
  const filter = get(filterAtom)
  return filter === 'all' ? items : items.filter(i => ...)
})
const isLoadingAtom = atom(false)

// Component
const [items, setItems] = useAtom(itemsAtom)
const [filter, setFilter] = useAtom(filterAtom)
const filteredItems = useAtomValue(filteredItemsAtom)
```

### After

```typescript
// All atoms that change together → one store
export const todos = defineStore({
  name: 'todos',
  schema: z.object({
    items: z.array(TodoSchema),
    filter: z.enum(['all', 'active', 'done']),
    isLoading: z.boolean(),
  }),
  initial: { items: [], filter: 'all' as const, isLoading: false },
  computed: {
    filteredItems: (s) => s.filter === 'all' ? s.items : s.items.filter(i =>
      s.filter === 'active' ? !i.done : i.done
    ),
  },
})
```

### Key Difference

Jotai's atoms are bottom-up (compose small atoms into derived atoms). state-agent is top-down (declare the schema, derive everything from it). The migration strategy:

1. Group atoms that change together → one store
2. Derived atoms (`atom((get) => ...)`) → `computed`
3. Atoms used by one component only → keep as `useState`
4. Async atoms → `effects` or `store.optimistic()`

---

## From XState

### Before

```typescript
const checkoutMachine = createMachine({
  id: 'checkout',
  initial: 'cart',
  states: {
    cart: { on: { PROCEED: 'shipping' } },
    shipping: { on: { PROCEED: 'payment', BACK: 'cart' } },
    payment: { on: { CONFIRM: 'confirmed', CANCEL: 'cart' } },
    confirmed: { type: 'final' },
  },
})
```

### After

```typescript
// Option A: Discriminated union with transitions (recommended for data-heavy state machines)
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
    'cart -> shipping': 'proceed',
    'shipping -> payment': 'proceed',
    'shipping -> cart': 'back',
    'payment -> confirmed': 'confirm',
    'payment -> cart': 'cancel',
  },
})

// Option B: createFlow (for navigation-like state machines with little data per state)
export const checkoutFlow = createFlow({
  name: 'checkout',
  mode: 'separate',
  states: ['Cart', 'Shipping', 'Payment', 'Confirmation'],
  initial: 'Cart',
})
```

### When to use which

| XState Feature | state-agent Equivalent |
|---------------|----------------------|
| Simple state machine (few states, no data) | `createFlow` |
| State machine with data per state | Discriminated union + `transitions` |
| Guards/conditions | Zod validation + `transitions` constraints |
| Actions on transition | `effects` with transition watching: `watch: 'cart -> shipping'` |
| Nested/parallel states | `createFlow` with `children` or separate stores |
| Context (extended state) | Store state IS the context — no separation |
| Invoke (async services) | `effects` with retry and cancellation |
| `@xstate/react` `useMachine` | `useStore` + `useGate` |

---

## Common Migration Patterns

### Pattern: Replace Context + Provider

**Before**: 3 context providers nested
```tsx
<AuthContext.Provider value={authState}>
  <ThemeContext.Provider value={themeState}>
    <CartContext.Provider value={cartState}>
      <App />
    </CartContext.Provider>
  </ThemeContext.Provider>
</AuthContext.Provider>
```

**After**: One provider
```tsx
<MultiStoreProvider stores={[auth.store, theme.store, cart.store]}>
  <App />
</MultiStoreProvider>
```

### Pattern: Replace useEffect Data Fetching

**Before**: useEffect + useState
```tsx
useEffect(() => {
  let cancelled = false
  setLoading(true)
  fetch(url).then(r => r.json()).then(data => {
    if (!cancelled) { setData(data); setLoading(false) }
  })
  return () => { cancelled = true }
}, [url])
```

**After**: Effect declaration
```typescript
effects: {
  fetchData: {
    watch: 'url',
    handler: async ({ state, store, signal }) => {
      const res = await fetch(state.url, { signal })
      const data = await res.json()
      store.set('data', data, createSystemActor('fetch'))
    },
  },
}
```

### Pattern: Replace Boolean Flag State Machines

**Before**: Impossible states possible
```typescript
const [isLoading, setIsLoading] = useState(false)
const [isError, setIsError] = useState(false)
const [data, setData] = useState(null)
// Bug: isLoading=true AND isError=true AND data=something
```

**After**: Impossible states impossible
```typescript
schema: z.discriminatedUnion('status', [
  z.object({ status: z.literal('idle') }),
  z.object({ status: z.literal('loading') }),
  z.object({ status: z.literal('success'), data: DataSchema }),
  z.object({ status: z.literal('error'), error: z.string() }),
])
```

### Pattern: Replace Manual Selectors

**Before**: Hand-written selectors
```typescript
const selectActiveCount = (state) => state.todos.items.filter(i => !i.done).length
```

**After**: Computed values or auto-selectors
```typescript
computed: {
  activeCount: (s) => s.items.filter(i => !i.done).length,
}
// Or use the auto-generated selector tree:
todos.select.items.$path  // 'items'
```
