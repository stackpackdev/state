# stackpack-state

React state management framework optimized for AI agents. Not an agent itself — a framework that any agent uses to build and manage app state.

## IMPORTANT: Read the Skill Docs First

Before writing ANY state code, read the skill docs. They ship with the npm package:

```
node_modules/stackpack-state/skill/skill.md         ← START HERE: patterns, decision trees, pitfalls
node_modules/stackpack-state/skill/api-reference.md  ← Full API: every hook, component, type signature
node_modules/stackpack-state/skill/examples.md       ← Real-world examples
node_modules/stackpack-state/skill/refactoring.md    ← Migration from useState/Redux/Zustand/Jotai/XState
```

If developing from a local clone, the paths are relative: `skill/skill.md`, etc.

**Why this matters:** The framework has specific APIs (like `usePresenceList` for animated lists, `store.optimistic()` for rollback) that you will not discover from type definitions alone. The skill docs contain patterns, pitfalls, and decision trees that prevent common mistakes.

## What It Is

A runtime library (`npm install stackpack-state`) with 5 reasoning primitives:

- **Together**: Data that changes as a unit shares a store
- **Separate**: Independent concerns get separate stores
- **When**: Conditions that change appearance (style-edge, cheap re-render)
- **Gate**: Conditions that control component mounting (mount-edge, expensive lifecycle)
- **Presence**: Deferred unmounting for animated elements (presence-edge, animated lifecycle)

## Architecture

```
stackpack-state/           → core runtime (defineStore, actors, flows, effects, optimistic, undo)
stackpack-state/react      → React bindings (hooks, providers, <Gated>, <Presence>, usePresenceList)
stackpack-state/components → ECS-style composable state (Loadable, Paginated, Filterable, Selectable)
```

## File Conventions

| File | Purpose |
|------|---------|
| `name.store.ts` | Zod schema + inferred type + defineStore + when/gates/computed |
| `name.flow.ts` | Flow state machine (multi-step processes) |
| `src/state/index.ts` | Barrel exports |
| `src/state/provider.tsx` | MultiStoreProvider wrapping the app |

## Store Template

```typescript
import { defineStore, z } from 'stackpack-state'

export const name = defineStore({
  name: 'name',
  schema: z.object({ /* fields */ }),
  initial: { /* defaults */ },
  when: { /* style-edge conditions */ },
  gates: { /* mount-edge conditions */ },
  computed: { /* derived values */ },
  effects: { /* reactive side effects */ },
  undo: { limit: 50 },            // optional: enable undo/redo
  persist: { key: 'name' },       // optional: localStorage persistence
  dependencies: { reads: [], gatedBy: [], triggers: [] },
})
// name.store → Store<NameState>
// name.schema → ZodObject<...>
```

## Key Rules

1. Actor is optional everywhere: `store.set(path, value)` defaults to a human "user" actor
2. Zod validates on creation and every mutation (auto-rollback on violation)
3. `when` = cheap re-render (isHovered, isSubmitting). `gate` = mount/unmount cascade (isAuthenticated, hasData)
4. One store per API endpoint (data + loading + error together)
5. Auth is always a separate store that gates the app
6. Forms are always together stores (fields + submitting + errors)
7. Single-component useState doesn't need a store
8. Import store directly (`import { todos } from './todos.store'`), never use `getStore('name')` (untyped)
9. Actions are self-contained — receive all data as parameters, never close over external state
10. Use `MultiStoreProvider` for app-level state (not `StoreProvider`)

## Common Pitfalls (Read These)

1. **Undo records ALL mutations** — including system `set()` calls. If undo can revert a Gate condition (like `loaded: false`), the UI breaks. Separate system state from user state.
2. **Presence reads gates, not when** — `usePresence` and `usePresenceList` require a gate on the store.
3. **Use `usePresenceList` for animated lists** — not `<Presence>` component (which is for single boolean gates like modals). Iterate `presence.items`, not the raw store array.
4. **Vite alias order matters** — `stackpack-state/react` must come BEFORE `stackpack-state` in alias array.
5. **React dual-instance errors** — when using local file link, pin `react` and `react-dom` in `resolve.alias`.
6. **Don't manually hydrate if using `persist`** — persist handles localStorage automatically.

## Runtime Source

- Core: `runtime/core/` — store, actor, flow, when, fetch, path, history, middleware, batch, together
- React: `runtime/react/` — hooks, provider, context, gated, presence, use-presence, use-fetch
- Tests: `runtime/core/__tests__/` and `runtime/react/__tests__/`

## Install Troubleshooting

- **npm name collision**: `npm install stackpack-state` installs the wrong package. Use local path: `npm install ../stackpack-state`
- **Vite alias order**: `stackpack-state/react` alias must come BEFORE `stackpack-state` (use array form, not object)
- **React dual-instance errors**: Pin `react` and `react-dom` in `resolve.alias` to your app's `node_modules/`
- **Persist + manual hydration conflict**: Don't manually `localStorage.getItem()` if using `persist` option — it hydrates automatically

See `skill/skill.md` Install section for complete Vite config examples.

## For Agents Using This Framework

Read the skill docs in `skill/` for the complete guide:

- `skill/skill.md` — Entry point. Pattern catalog, decision trees, all store patterns (modes, transitions, effects, persistence, optimistic, undo, pub/sub, properties, ECS composition, backend sync)
- `skill/api-reference.md` — Complete API reference for every export including Presence hooks
- `skill/refactoring.md` — Step-by-step migration from useState, Redux, Zustand, Jotai, XState
- `skill/examples.md` — Real-world examples (todo app, auth dashboard, checkout, search, data tables)
