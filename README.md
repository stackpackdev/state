# stackpack-state

An AI agent that designs and manages app state.

You describe what you're building. The agent figures out what state it needs.

## Philosophy

stackpack-state thinks in three dimensions, extracted from the [Views Tools](https://docs.views.tools) framework:

- **Together** — data that moves as a unit belongs in one store (form fields, API data + loading + error)
- **Separate** — independent concerns get independent stores (auth, features, settings)
- **When** — every store has declarative conditions (isLoading, isEmpty, isAuthenticated, hasError)

## Quick Start

```bash
npm install stackpack-state
```

## What It Creates

Each store is a single file — schema, type, and store in one place.

```
src/state/
  auth.store.ts        — Schema + type + store + when/gates
  todos.store.ts       — Same pattern, one file per store
  navigation.flow.ts   — Navigation state machine
  provider.tsx         — All providers wrapped
  index.ts             — Barrel exports
```

## Runtime API

### Stores (with Zod schemas)

```typescript
import { z, createStore, createHumanActor, createAgentActor } from 'stackpack-state'

// Schema is the single source of truth
const todosSchema = z.object({
  items: z.array(z.object({
    id: z.string(),
    text: z.string().min(1),
    done: z.boolean(),
  })),
  filter: z.enum(['all', 'active', 'done']),
})

type TodosState = z.infer<typeof todosSchema>

const todos = createStore<TodosState>({
  name: 'todos',
  stateSchema: todosSchema,  // validates initial state + mutations
  initial: { items: [], filter: 'all' },
  when: {
    isEmpty: state => state.items.length === 0,
    isFiltered: state => state.filter !== 'all',
  },
})

// Every change knows who made it
const user = createHumanActor('user')
const ai = createAgentActor({ name: 'assistant' })

todos.set('filter', 'active', user)           // human changed it
todos.update(d => { d.items.push(item) }, ai)  // agent changed it
todos.getHistory()                              // see who did what
```

### React Hooks

```typescript
import { useValue, useChange, useWhen } from 'stackpack-state/react'

function TodoList() {
  const items = useValue('todos', 'items')
  const { isEmpty, isFiltered } = useWhen('todos')
  const change = useChange('todos', user)

  if (isEmpty) return <Empty />
  return <List items={items} />
}
```

### Flows (State Machines)

```typescript
import { createFlow } from 'stackpack-state'
import { useFlow } from 'stackpack-state/react'

const checkout = createFlow({
  name: 'checkout',
  states: ['Cart', 'Shipping', 'Payment', 'Done'],
  initial: 'Cart',
})

function Checkout() {
  const { current, go, has } = useFlow('checkout')
  if (has('Cart')) return <Cart onNext={() => go('Shipping', user)} />
}
```

### Together (Grouped Stores)

```typescript
import { together } from 'stackpack-state'

const checkoutGroup = together({
  name: 'checkout',
  stores: { cart: cartStore, shipping: shippingStore },
  flow: checkoutFlow,
})
```

### Middleware

```typescript
const logger = {
  name: 'logger',
  enter: (action, state) => {
    console.log(`[${action.actor.name}] ${action.type}`)
    return action  // return null to cancel
  },
}

const store = createStore({ name: 'app', initial: {}, middleware: [logger] })
```

## Agent Commands

| Command | Description |
|---|---|
| `stackpack-state init` | Analyze app, design full state architecture |
| `stackpack-state add "feature"` | Add state for a new feature |
| `stackpack-state why "store"` | Explain design reasoning |
| `stackpack-state refactor` | Suggest optimizations |
| `stackpack-state types` | Regenerate TypeScript types |

## Core Concepts from Views Tools

| Views Pattern | stackpack-state Equivalent |
|---|---|
| DataProvider (wrapping related state) | `together()` — group stores |
| DataContexts (named, lazy contexts) | Named store registry |
| Immer produce (immutable updates) | `store.update(draft => ...)` |
| Flow.js (navigation state machine) | `createFlow()` |
| `when isHovered/isFocused` (scoped conditions) | `when: { isEmpty: ... }` |
| walk.js (visitor enter/leave) | Middleware pipeline |
| Touched tracking | Actor attribution on every change |
| flowDefinition (valid state registry) | Flow schema validation |
| 25ms buffered dispatch | `batchMs` option |
| MAX_ACTIONS history | `historyLimit` option |

## Try It: Refactor Your App to stackpack-state

Copy the prompt below into Claude Code (or any AI agent) from inside your React project to refactor it onto stackpack-state. The agent will work on a branch so your main code is untouched.

<details>
<summary><strong>Refactor prompt (click to expand)</strong></summary>

```
I want to refactor this React app to use stackpack-state for state management. Work on a new branch called `refactor/stackpack-state`.

## Setup

1. Create and check out the branch: `git checkout -b refactor/stackpack-state`
2. Read AGENTS.md at the root of the stackpack-state repo for framework conventions
3. Read the skill doc at integrations/claude-code/skill.md for the full pattern catalog

## Phase 1: Analyze current state

Before writing any code, map the existing state:
- Find all useState, useReducer, useContext, Redux stores, Zustand stores, or any other state management
- Identify prop drilling chains (props passed 2+ levels)
- Identify data that changes together (form fields, API data + loading + error)
- Identify independent concerns (auth, settings, feature-specific data)
- List all context providers wrapping the app

## Phase 2: Design stores

Apply Together/Separate/When/Gate reasoning:
- **Together**: Group state that mutates in the same user action into one store
- **Separate**: Auth, settings, and each API domain get their own store
- **When**: Add conditions for UI states (isEmpty, isLoading, isFiltered, hasError)
- **Gate**: Add gates for mount/unmount decisions (isAuthenticated, hasData)
- One store per API endpoint — data + loading + error belong together
- Forms are always together stores — fields + submitting + errors

Create stores in `src/state/` using the single-file pattern:
```typescript
import { defineStore, z } from 'stackpack-state'

export const storeName = defineStore({
  name: 'storeName',
  schema: z.object({ /* fields from analysis */ }),
  initial: { /* defaults */ },
  when: { /* style-edge conditions */ },
  gates: { /* mount-edge conditions */ },
  computed: { /* derived values that other components need */ },
})
```

## Phase 3: Create actions

Create `src/state/actions.ts` with centralized mutation functions:
- Import store references directly (not getStore): `import { user } from './user.store'`
- Each action is a plain exported function that calls `store.update()` or `store.set()`
- Cross-store actions call multiple stores in sequence
- Every action takes all data it needs as parameters — don't close over external state

## Phase 4: Refactor components

CRITICAL RULES:
- **Keep ALL existing JSX markup and CSS classes exactly as-is**
- **Only change the state access layer** — replace props/context reads with hooks, replace callbacks with action imports
- Do NOT simplify, restructure, or "clean up" the markup
- Do NOT remove CSS classes, inline styles, or component structure
- The app must look pixel-identical before and after

For each component:
1. Remove state props from the interface
2. Add `useValue`, `useComputed`, `useWhen`, `useGate` hooks from `stackpack-state/react`
3. Import and call actions directly instead of receiving callbacks as props
4. Keep all local UI state (useState for modals, forms, toggles) — only lift shared state to stores

Hook patterns:
```typescript
import { useValue, useWhen, useComputed } from 'stackpack-state/react'
import { someAction } from '../state'

function MyComponent() {
  // Replace: const { user } = useContext(AuthContext)
  const user = useValue<UserProfile | null>('auth', 'profile')

  // Replace: const { isLoading } = props
  const { isLoading, hasError } = useWhen('data')

  // Replace: props.onSave(data)
  someAction(data)
}
```

## Phase 5: Wire up App.tsx

1. Wrap the app in `<MultiStoreProvider stores={[...allStores]}>` (not single StoreProvider)
2. Remove all old context providers that were replaced by stores
3. Remove all prop drilling from route definitions — components read from stores directly
4. App.tsx should be mostly routing + provider setup

## Phase 6: Vite/bundler config

If using Vite with local stackpack-state (not npm):
```typescript
// vite.config.ts — array form, specific path FIRST
resolve: {
  alias: [
    { find: 'stackpack-state/react', replacement: resolve(__dirname, 'path/to/runtime/react/index.ts') },
    { find: 'stackpack-state', replacement: resolve(__dirname, 'path/to/runtime/core/index.ts') },
  ],
},
```

## Phase 7: Verify

1. Run `npx tsc --noEmit` — fix all type errors
2. Run the dev server — verify the app renders identically to the original
3. Run existing tests — fix any broken imports
4. Commit with a clear message describing what was refactored

## What NOT to do

- Don't remove or simplify JSX markup — the UI must stay identical
- Don't change CSS classes or styling
- Don't refactor component structure — only change state access
- Don't create a store for useState that lives in a single component
- Don't use `getStore('name')` — import the typed store reference directly
- Don't forget the second argument to `completeQuest`-style actions — stackpack-state actions are self-contained, they take all needed data as parameters
```

</details>

## License

MIT
