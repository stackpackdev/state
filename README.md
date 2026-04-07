# stackpack-state

Agent-first React state management. Schema is the single source of truth — types, validation, transitions, selectors, invariants, and effects all derive from one Zod schema.

## Install

```bash
npm install stackpack-state
```

No other dependencies needed. Zod is bundled — import `z` from `stackpack-state` directly.

> **Note:** Always import `z` from `stackpack-state`, not from your own `zod` package. stackpack-state bundles Zod 4 internally.

## Philosophy

stackpack-state thinks in five primitives:

| Primitive | Question | Rule |
|-----------|----------|------|
| **Together** | What data changes as a unit? | Group into one store |
| **Separate** | What is independent? | Split into separate stores |
| **When** | What changes appearance? | Style-edge condition (cheap re-render) |
| **Gate** | What controls mounting? | Mount-edge condition (expensive lifecycle) |
| **Presence** | What animates in/out? | Deferred unmount (animated lifecycle) |

## Quick Example

```typescript
import { defineStore, z } from 'stackpack-state'

export const todos = defineStore({
  name: 'todos',
  schema: z.object({
    items: z.array(z.object({
      id: z.string(),
      text: z.string().min(1),
      done: z.boolean(),
    })),
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
  },
})
```

```typescript
import { useValue, useWhen, useComputed } from 'stackpack-state/react'

function TodoList() {
  const items = useValue<Todo[]>('todos', 'items')
  const { isEmpty } = useWhen('todos')
  const activeCount = useComputed<number>('todos', 'activeCount')

  if (isEmpty) return <Empty />
  return <List items={items} count={activeCount} />
}
```

For type-safe access without generics, use `useSelect`:

```typescript
import { useSelect } from 'stackpack-state/react'
import { todos } from './state/todos.store'

const filter = useSelect('todos', todos.select.filter)  // typed automatically
```

### Actors (optional)

Every mutation accepts an optional actor. Defaults to a human "user" actor — no boilerplate needed for basic use.

```typescript
// No actor needed for basic use
todos.store.set('filter', 'active')
todos.store.update(draft => { draft.items.push(item) })

// Explicit actors for system/agent operations
import { createAgentActor, createSystemActor } from 'stackpack-state'
const ai = createAgentActor({ name: 'copilot' })
todos.store.set('filter', 'active', ai)
```

## Full Documentation

For the complete API, patterns, and migration guides, see:

- **[Skill doc](skill/skill.md)** — Full pattern catalog, decision tree, all 12 store patterns
- **[API reference](skill/api-reference.md)** — Every export from `stackpack-state`, `stackpack-state/react`, and `stackpack-state/components`
- **[Refactoring guide](skill/refactoring.md)** — Step-by-step migration from useState, Redux, Zustand, Jotai, and XState
- **[Examples](skill/examples.md)** — Complete real-world app examples

## AI Agent Integration

After `npm install stackpack-state`, the skill doc is available at:

```
node_modules/stackpack-state/skill/skill.md
```

Point your AI agent to read this file before writing any state code.

## Try It: Refactor Your App to stackpack-state

Copy the prompt below into Claude Code (or any AI agent) from inside your React project to refactor it onto stackpack-state. The agent will work on a branch so your main code is untouched.

<details>
<summary><strong>Refactor prompt (click to expand)</strong></summary>

```
I want to refactor this React app to use stackpack-state for state management. Work on a new branch called `refactor/stackpack-state`.

## Setup

1. Create and check out the branch: `git checkout -b refactor/stackpack-state`
2. Install: `npm install stackpack-state`
3. Read the skill doc at node_modules/stackpack-state/skill/skill.md for the full pattern catalog

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

Create stores in `src/state/` using `defineStore` (not `createStore`):
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

Additional store options to consider:
- If the old store persists to localStorage → add `persist` option
- If the old store has debounced side effects → add `effects`
- If the old store has undo → add `undo: { limit: N }`
- If the store has loading/pagination patterns → use `composeStore` with `Loadable`/`Paginated` from `stackpack-state/components`

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
5. If a component must stay mounted for state preservation (canvas, video, scroll position), use `useWhen` + `style={{ display: condition ? undefined : 'none' }}`, not `<Gated>` which would unmount it

Hook patterns:
```typescript
import { useValue, useWhen, useComputed, useSelect } from 'stackpack-state/react'
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

In React components, import the typed store reference directly.
In effects, server actions, or imperative callbacks, `getStore()` is
acceptable for reading current snapshots.

## Phase 5: Wire up App.tsx

1. Wrap the app in `<MultiStoreProvider stores={[...allStores]}>` (not single StoreProvider)
2. Place MultiStoreProvider inside any auth/session providers but outside route components, so stores are available everywhere but can access session context if needed
3. Remove all old context providers that were replaced by stores
4. Remove all prop drilling from route definitions — components read from stores directly
5. App.tsx should be mostly routing + provider setup

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
2. If a test suite exists, run it too. Stop on the first failure and fix before continuing.
3. Run the dev server — verify the app renders identically to the original
4. Commit with a clear message describing what was refactored

## What NOT to do

- Don't remove or simplify JSX markup — the UI must stay identical
- Don't change CSS classes or styling
- Don't refactor component structure — only change state access
- Don't create a store for useState that lives in a single component
- Don't use `getStore('name')` in components — import the typed store reference directly
- Don't forget the second argument to `completeQuest`-style actions — stackpack-state actions are self-contained, they take all needed data as parameters
```

</details>

## License

MIT
