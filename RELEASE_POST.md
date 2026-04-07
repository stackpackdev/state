# Introducing stackpack-state: State Management Designed for AI Agents

**TL;DR** -- `stackpack-state` is a React state management library built from the ground up for the age of AI-assisted development. It gives agents -- and humans -- five reasoning primitives to design state that's correct by construction, auditable by default, and fast enough to never think about.

---

## The Problem

Every state management library was designed for humans writing code by hand. Redux, Zustand, Jotai, XState -- all excellent tools, all optimized for a world where a developer sits down, thinks through the state shape, and manually wires it up.

That world is changing.

AI agents are now writing most of the state management code in modern apps. And they're making the same mistakes junior developers make: stuffing everything into one store, splitting things that should move together, creating derived state that drifts from the source, and losing track of who changed what and why.

`stackpack-state` fixes this by giving agents a structured way to *reason* about state before writing it.

## Five Primitives, Not a Framework

The library is built on five reasoning primitives extracted from the [Views Tools](https://docs.views.tools) framework:

**Together** -- data that changes in the same user action belongs in one store. Form fields + validation errors + submitting state. API data + loading + error. If it moves together, it lives together.

**Separate** -- independent concerns get independent stores. Auth doesn't care about your todo list. Settings don't care about your shopping cart. Agents tend to over-consolidate; Separate is the corrective force.

**When** -- declarative conditions that trigger re-renders without remounting. `isLoading`, `isEmpty`, `isFiltered`. Style-edge changes: the component stays mounted, only its appearance shifts.

**Gate** -- declarative conditions that control mounting. `isAuthenticated`, `hasData`, `isReady`. Mount-edge changes: the component enters or leaves the tree entirely.

**Presence** -- deferred unmounting for exit animations. When a Gate closes, Presence gives the component time to animate out before React unmounts it.

These aren't just patterns in a docs page. They're first-class constructs in the runtime. When an agent creates a store, it declares what's Together, what's Separate, which conditions are When (re-render only) and which are Gates (mount/unmount). The library enforces the distinction.

## One Store, One File, One Truth

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
    isEmpty: s => s.items.length === 0,
    isFiltered: s => s.filter !== 'all',
  },
  gates: {
    hasItems: s => s.items.length > 0,
  },
  computed: {
    activeCount: s => s.items.filter(i => !i.done).length,
  },
})
```

Schema, initial state, conditions, computed values -- all in one `defineStore` call. Zod validates every mutation at runtime. Types are inferred, never manually declared.

## Every Change Has an Author

```typescript
import { createHumanActor, createAgentActor } from 'stackpack-state'

const user = createHumanActor('user')
const assistant = createAgentActor({ name: 'claude' })

todos.store.set('filter', 'active', user)           // human changed it
todos.store.update(d => { d.items.push(item) }, assistant)  // agent changed it
todos.store.getHistory()                              // see who did what, when
```

Every mutation is attributed to an actor -- human, agent, or system. The history is a ring buffer (O(1) writes, not O(n) array copies). When you're debugging why the cart suddenly emptied, you don't grep through logs. You call `getHistory()` and see the actor, timestamp, and path of every change.

## React Hooks That Disappear

```typescript
import { useValue, useWhen, useComputed } from 'stackpack-state/react'

function TodoList() {
  const items = useValue('todos', 'items')
  const { isEmpty } = useWhen('todos')
  const activeCount = useComputed('todos', 'activeCount')

  if (isEmpty) return <Empty />
  return <List items={items} count={activeCount} />
}
```

No providers to nest. No selectors to memoize. No dispatch functions to import. The hooks read directly from named stores with path-level subscriptions. Components re-render only when their specific data changes.

## Performance

We benchmark every commit against strict performance budgets:

| Operation | Latency |
|-----------|---------|
| Store creation (30 fields) | ~0.5ms |
| Path mutation (`store.set`) | ~50us |
| Immer mutation (`store.update`) | ~60us |
| Presence sync (100 items) | ~18us |
| Boolean toggle (modal open/close) | ~4us |
| Introspect 20 stores | ~0.8ms |

The library uses Immer for immutable updates (so your mutations read like normal JavaScript), ring buffers for history (so it doesn't slow down as history grows), and memoized When/Gate evaluators (so conditions only recompute when state actually changes).

## What's in the Box

The core is framework-agnostic. The React bindings are optional. The full feature set:

- **Stores** with Zod schema validation and path-based reads/writes
- **Actors** (human/agent/system) with permission systems
- **Flows** -- hierarchical state machines for navigation
- **Computed values** -- memoized derived state
- **Middleware** -- visitor pattern (enter -> apply -> leave)
- **Persistence** -- localStorage/custom adapters
- **Undo/Redo** -- snapshot-based with configurable limits
- **Optimistic updates** -- with automatic rollback
- **Pub/Sub** -- cross-store event bus
- **Batch/Debounce** -- 25ms default coalescing
- **Fetch** -- declarative data loading with cache + TTL
- **Presence** -- deferred unmounting for exit animations
- **Schema migration** -- versioned state upgrades
- **Components** -- composable Loadable/Paginated/Filterable/Selectable patterns

## Built for the Agent Age

`stackpack-state` ships with comprehensive skill documentation -- structured markdown files that AI agents consume to understand the library's patterns, decision trees, and API surface. When an agent reads the skill doc, it doesn't just learn the API. It learns *how to think* about state design.

The refactoring prompt in the README lets any AI agent migrate an existing React app to `stackpack-state` in a single session -- analyze current state, apply Together/Separate/When/Gate reasoning, create stores, rewire components, verify the result.

## Getting Started

```bash
npm install stackpack-state
```

```typescript
// Core (framework-agnostic)
import { defineStore, z } from 'stackpack-state'

// React hooks
import { useValue, useWhen, useGate } from 'stackpack-state/react'

// Composable patterns
import { composeStore, Loadable, Paginated } from 'stackpack-state/components'
```

## What's Next

This is v0.1.0 -- the foundation. Coming next:

- DevTools extension for visualizing store graphs and actor history
- Server-side state hydration for SSR/RSC
- Persistent actor sessions across page reloads
- Multi-agent coordination primitives
- Framework adapters beyond React (Vue, Svelte, Solid)

`stackpack-state` is MIT licensed and part of the [StackPack](https://stackpack.io) platform.

---

*Built by Tom -- solo design engineer, building agent-first infrastructure.*
