# Changelog

## 0.1.0 (2026-04-08)

Initial public release.

### Core Runtime
- **Stores** with Zod schema validation, path-based reads/writes, Immer mutations
- **Actors** (human/agent/system) with permission system and attribution on every change
- **When/Gate** evaluators — memoized style-edge and mount-edge conditions
- **Flows** — hierarchical state machines with path addressing
- **Computed values** — memoized derived state with lazy evaluation
- **Middleware** — visitor pattern pipeline (enter/apply/leave)
- **History** — O(1) ring buffer with actor attribution
- **Persistence** — localStorage and custom storage adapters
- **Undo/Redo** — snapshot-based with configurable limits
- **Optimistic updates** — with automatic rollback on failure
- **Pub/Sub** — cross-store event bus with condition-based routing
- **Batch/Debounce** — 25ms default coalescing with deduplication
- **Fetch** — declarative data loading with cache, TTL, and Zod response validation
- **Presence** — deferred unmounting for exit animations
- **Schema migration** — versioned state upgrades
- **Modes** — discriminated union support with auto-derived when/gate conditions
- **Transitions** — state machine validation graphs
- **Introspection** — system-level inspection of all stores and dependencies
- **Selectors** — auto-generated selector trees from schemas
- **Properties** — runtime invariant checking

### React Bindings (`stackpack-state/react`)
- `useStore`, `useValue`, `useChange`, `useUpdate` hooks
- `useWhen`, `useGate`, `useComputed`, `useSelect` hooks
- `useFlow`, `useActor`, `useAgentStatus`, `useFetch` hooks
- `usePresence`, `usePresenceList` hooks
- `<Gated>` and `<Presence>` components
- `StoreProvider` and `MultiStoreProvider`
- Component contracts with `withContract()`

### Components Library (`stackpack-state/components`)
- `Loadable` — loading + error state composition
- `Paginated` — pagination state (page, pageSize, total)
- `Filterable` — filter and sort conditions
- `Selectable` — multi-select with selection tracking
- `composeStore()` — ECS-style composition of multiple components
