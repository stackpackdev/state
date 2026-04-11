---
name: stackpack-state
description: "Agent-first React state management. Use when: project has stackpack-state as dependency, user asks to manage state or create stores, user mentions Together/Separate/When/Gate/Presence patterns, user migrates from useState/Redux/Zustand/Jotai/XState. Read skill/skill.md for patterns, skill/api-reference.md for full API."
---

# stackpack-state — Agent-First React State Management

Schema is the single source of truth — types, validation, transitions, selectors, invariants, and effects all derive from one Zod schema.

## Quick Start

```bash
npm install stackpack-state
```

No other dependencies. Zod is bundled — import `z` from `stackpack-state` directly.

```typescript
import { defineStore, z } from 'stackpack-state'
import { StoreProvider, useValue, useComputed, useGate, Gated, usePresenceList } from 'stackpack-state/react'
```

## The 5 Primitives

Every state decision maps to one of these:

| Primitive | Question | Rule |
|-----------|----------|------|
| **Together** | What data changes as a unit? | Group into one store |
| **Separate** | What is independent? | Split into separate stores |
| **When** | What changes appearance? | Style-edge condition (cheap re-render) |
| **Gate** | What controls mounting? | Mount-edge condition (expensive lifecycle) |
| **Presence** | What animates in/out? | Deferred unmount (animated lifecycle) |

## Store Template

```typescript
import { defineStore, z } from 'stackpack-state'

const { store, schema, select } = defineStore({
  name: 'todos',
  schema: z.object({
    items: z.array(z.object({
      id: z.string(),
      text: z.string(),
      done: z.boolean(),
    })),
    loaded: z.boolean(),
  }),
  initial: { items: [], loaded: true },
  when: {
    isEmpty: (s) => s.items.length === 0,
    allDone: (s) => s.items.every((t) => t.done),
  },
  gates: {
    isLoaded: (s) => s.loaded,
  },
  computed: {
    doneCount: (s) => s.items.filter((t) => t.done).length,
    totalCount: (s) => s.items.length,
  },
  effects: {
    onItemsChange: {
      watch: 'items',
      debounce: 300,
      handler: ({ store }) => {
        localStorage.setItem('todos', JSON.stringify(store.getState().items))
      },
    },
  },
  undo: { limit: 50 },
})
```

## Key React Hooks

```typescript
// Read state
const items = useValue<Item[]>('todos', 'items')
const doneCount = useComputed<number>('todos', 'doneCount')
const isLoaded = useGate('todos', 'isLoaded')

// Write state (actor optional, defaults to human)
const { update } = useStore<TodosState>('todos')
update((draft) => { draft.items.push(newItem) }, actor)

// Animated list (items in 'leaving' phase still render for exit animation)
const presence = usePresenceList<Item>('todos', 'items', { timeout: 300 })
presence.items.map(record => (
  <div key={record.key} className={`item item--${record.phase}`}>
    {record.value.text}
  </div>
))

// Conditional mount with fallback
<Gated store="todos" gate="isLoaded" fallback={<Skeleton />}>
  <TodoList />
</Gated>
```

## Undo / Optimistic Updates

```typescript
store.undo()                    // revert last action
store.canUndo()                 // check availability

// Skip undo for system mutations (don't let undo break Gate conditions)
store.set('loaded', true, systemActor, { skipUndo: true })
store.clearUndoStack()          // clear after initialization

// Optimistic: apply immediately, rollback on server failure
const result = await store.optimistic({
  apply: (draft) => { draft.items = draft.items.filter(i => i.id !== id) },
  commit: () => api.deleteItem(id),
  actor,
})
if (!result.success) showToast(`Failed: ${result.error?.message}`)
```

## Actor System

```typescript
import { createHumanActor, createAgentActor } from 'stackpack-state'

const human = createHumanActor('user')
const agent = createAgentActor({ name: 'my-agent', model: 'claude-sonnet-4-6' })

store.set('items.0.done', true, agent)  // tagged — introspectable
```

## Common Pitfalls

1. **Undo + Gate**: Use `{ skipUndo: true }` for gate-controlling mutations, or undo can break the UI
2. **Presence reads gates, not when**: `usePresenceList` requires the store to have a gate
3. **Use `usePresenceList` for lists**: Not `<Presence>` component (that's for single boolean gates like modals)
4. **Vite alias order**: `stackpack-state/react` alias must come BEFORE `stackpack-state`
5. **React dual-instance**: Pin `react`/`react-dom` in Vite aliases when using local file link

## Full Documentation

For complete patterns, API reference, and migration guides, read:
- `skill/skill.md` — Pattern catalog, decision trees, 10+ store patterns
- `skill/api-reference.md` — Every hook, component, and type signature
- `skill/examples.md` — Real-world examples
- `skill/refactoring.md` — Migration from useState/Redux/Zustand/Jotai/XState
