# state-agent

React state management framework optimized for AI agents. Not an agent itself — a framework that any agent uses to build and manage app state.

## What It Is

A runtime library (`npm install state-agent`) with 5 reasoning primitives:

- **Together**: Data that changes as a unit shares a store
- **Separate**: Independent concerns get separate stores
- **When**: Conditions that change appearance (style-edge, cheap re-render)
- **Gate**: Conditions that control component mounting (mount-edge, expensive lifecycle)
- **Presence**: Deferred unmounting for animated elements (presence-edge, animated lifecycle)

## Architecture

```
state-agent/           → core runtime (createStore, actors, flows, fetchers)
state-agent/react      → React bindings (hooks, providers, <Gated>)
```

## File Conventions

| File | Purpose |
|------|---------|
| `name.store.ts` | Zod schema + inferred type + createStore + when/gates |
| `name.flow.ts` | Flow state machine (multi-step processes) |
| `src/state/index.ts` | Barrel exports |
| `src/state/provider.tsx` | MultiStoreProvider wrapping the app |

## Store Template

```typescript
import { defineStore, z } from 'state-agent'

export const name = defineStore({
  name: 'name',
  schema: z.object({ /* fields */ }),
  initial: { /* defaults */ },
  when: { /* style-edge conditions */ },
  gates: { /* mount-edge conditions */ },
  computed: { /* derived values */ },
  dependencies: { reads: [], gatedBy: [], triggers: [] },
})
// name.store → Store<NameState>
// name.schema → ZodObject<...>
```
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

## Runtime Source

- Core: `runtime/core/` — store, actor, flow, when, fetch, path, history, middleware, batch, together
- React: `runtime/react/` — hooks, provider, context, gated, use-fetch
- Tests: `runtime/core/__tests__/` and `runtime/react/__tests__/`

## Install Troubleshooting

- **npm name collision**: `npm install state-agent` installs the wrong package. Use local path: `npm install ../state-agent`
- **Vite alias order**: `state-agent/react` alias must come BEFORE `state-agent` (use array form, not object)
- **React dual-instance errors**: Pin `react` and `react-dom` in `resolve.alias` to your app's `node_modules/`
- **Persist + manual hydration conflict**: Don't manually `localStorage.getItem()` if using `persist` option — it hydrates automatically

See `skill/skill.md` Install section for complete Vite config examples.

## For Agents Using This Framework

Read the skill docs in `skill/` for the complete guide:

- `skill/skill.md` — Entry point. Pattern catalog, decision trees, all store patterns (modes, transitions, effects, persistence, optimistic, undo, pub/sub, properties, ECS composition, backend sync)
- `skill/refactoring.md` — Step-by-step migration from useState, Redux, Zustand, Jotai, XState
- `skill/api-reference.md` — Complete API reference for every export
- `skill/examples.md` — Real-world examples (todo app, auth dashboard, checkout, search, data tables)
