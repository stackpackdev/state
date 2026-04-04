# Demo App Comparison Report

Three implementations of the same conference companion app, each using a different state management approach.

## Implementations

| | **demo-app** (vanilla) | **demo-app-sa** (multi-store) | **demo-app-sa-in-folder-refactor** (single-store) |
|---|---|---|---|
| App.tsx | 551 lines | 98 lines | 187 lines |
| State files | 0 (all in App.tsx) | 8 files, 505 lines | 3 files, 488 lines |
| State stores | N/A (useState + props) | 4 stores (user, schedule, network, achievements) | 1 store (app) |
| Prop drilling | Heavy (~60 callback sites) | Eliminated | Eliminated |
| State separation | None | Domain-split | Monolithic |
| Dependencies | react only | state-agent, immer, zod | state-agent |
| Persistence | Manual localStorage in App.tsx | Manual subscribe + localStorage | Declarative `persist` option |

---

## 1. demo-app (Vanilla React)

**Architecture:** All state lives in a single 551-line App.tsx using `useState`. Every page receives state and callbacks as props. Achievement evaluation runs in a 90-line `useEffect`.

**State shape:** Single `AppState` object with ~12 fields (user, sessions, ratings, connections, achievements, quests, booth scans, social flags).

**Data flow:**
- App.tsx holds state and defines ~10 `useCallback` mutation functions
- All callbacks passed through React Router route props
- localStorage sync on every state change
- Optional Supabase sync when authenticated

**Strengths:**
- Zero abstraction — anyone who knows React can read it immediately
- No external state library to learn
- Single file contains all business logic (easy to grep)

**Weaknesses:**
- Massive god-component (551 lines)
- Extreme prop drilling (~60 prop-passing sites across routes)
- Every state change re-renders the entire tree
- Achievement evaluation tightly coupled to the component lifecycle
- Mutation logic mixed with UI wiring

---

## 2. demo-app-sa (Multi-Store state-agent)

**Architecture:** State split into 4 domain stores, each with its own schema, computed values, and conditions. Actions centralized in a separate module. Achievement evaluation extracted into a pure function.

**State directory (8 files):**
```
src/state/
├── user.store.ts          (58 lines)  — profile, auth, social flags
├── schedule.store.ts      (37 lines)  — interested sessions, ratings
├── network.store.ts       (41 lines)  — connections, booth scans
├── achievements.store.ts  (36 lines)  — unlocked achievements, quests
├── actions.ts             (149 lines) — all mutation functions
├── evaluation.ts          (99 lines)  — achievement/quest engine
├── persistence.ts         (54 lines)  — localStorage subscribe/hydrate
└── index.ts               (31 lines)  — barrel exports
```

**Key patterns:**
- `useValue('user', 'profile')` / `useComputed('network', 'uniqueConnectionCount')` — granular subscriptions
- `createHumanActor('user')` / `createSystemActor('achievement-engine')` — actor-based mutation tracking
- Zod schemas on each store for runtime validation
- Immer drafts for immutable updates
- Each store persists independently (`aindcon26_sa_user`, `aindcon26_sa_schedule`, etc.)

**Strengths:**
- App.tsx reduced to 98 lines (82% reduction)
- Domain separation — user state changes don't re-render network components
- Each store testable in isolation
- Achievement engine is a pure function with no React dependencies
- Showcases state-agent differentiators: multi-store, actors, computed, when/gates

**Weaknesses:**
- 8 files to understand the state layer
- New contributors must learn which store owns what
- Manual persistence wiring (subscribe callbacks)
- Cross-store reads needed for achievement evaluation

---

## 3. demo-app-sa-in-folder-refactor (Single-Store state-agent)

**Architecture:** All state consolidated into one `app` store defined in a single 461-line file. Persistence is declarative via the `persist` store option. Provider is a thin wrapper.

**State directory (3 files):**
```
src/state/
├── app.store.ts    (461 lines) — schema, actions, computed, when, gates, evaluation
├── provider.tsx    (10 lines)  — MultiStoreProvider wrapper
└── index.ts        (17 lines) — barrel exports
```

**Key patterns:**
- Single `useStore('app')` hook for all state access
- All 13+ actions colocated with the store definition
- Achievement evaluation embedded in the store file
- Declarative `persist` option with debounce (replaces manual localStorage wiring)
- Auth handling partially moved back to App.tsx (187 lines)

**Strengths:**
- Fewest files to understand (3 vs 8)
- Single entry point — open `app.store.ts` and see everything
- Declarative persistence (no manual subscribe boilerplate)
- Still eliminates all prop drilling

**Weaknesses:**
- 461-line god-store replaces the 551-line god-component
- App.tsx grew back to 187 lines (vs 98 in multi-store)
- All state changes notify all subscribers (no domain isolation)
- Harder to test individual domains in isolation
- `when`/`gates`/`computed` features buried in a massive file

---

## New Tester Perspective

What would someone evaluating state-agent for the first time think?

### What they would like about the refactored version

1. **Clear improvement over vanilla** — The before/after from 551-line App.tsx with prop drilling to a clean store-based approach is immediately compelling.

2. **Easy to find everything** — 3 files vs 8. Open the folder, see the whole picture. No hunting across modules.

3. **Single mental model** — `useStore('app')` everywhere. No need to remember which of 4 stores owns which field.

4. **Declarative persistence** — The `persist` option on `defineStore` is cleaner than manual `subscribe` + `localStorage` wiring. This feels like a framework feature, not DIY glue code.

5. **Low barrier to entry** — A developer could integrate state-agent into their app by creating one store file and one provider. The refactored version proves this is possible.

### What they would dislike about the refactored version

1. **"Why not just use Zustand?"** — A single flat store with colocated actions is exactly what Zustand does, with a much larger ecosystem and community. The refactored version doesn't answer this question. The multi-store version does — domain separation, typed inter-store communication, and actor-based tracking are things Zustand doesn't offer out of the box.

2. **God-store problem** — 461 lines in one file. The same concern that made the vanilla App.tsx painful now applies to the store. A tester would wonder: "Will this scale to a real app with 50+ state fields?"

3. **Lost showcase of key features** — `when` conditions, `gates`, `computed` values, and actor-based mutations are state-agent's differentiators. In the multi-store version, each concept had room to breathe. In the refactored version, they're buried in a wall of code.

4. **Regression in App.tsx size** — Going from 98 to 187 lines feels like a step backward. Auth handling and achievement evaluation wiring moved back into the component, partially undoing the clean separation.

5. **No domain isolation** — With 4 stores, updating `user.points` doesn't notify components that only read `network.connections`. With 1 store, every update notifies every subscriber. For a demo app this is fine, but a tester thinking about production use would flag it.

6. **Testing story weakened** — Multi-store: test user mutations without touching achievements. Single store: every test operates on the full state blob.

---

## Recommendation

| Audience | Best demo |
|---|---|
| "Show me the simplest possible integration" | **demo-app-sa-in-folder-refactor** |
| "Show me why state-agent is different from Zustand/Jotai" | **demo-app-sa** (multi-store) |
| "Show me the before/after improvement" | **demo-app** → **demo-app-sa** |

For onboarding new users to state-agent, the **multi-store version is the stronger showcase**. It demonstrates the framework's unique value proposition: domain-driven state separation, granular subscriptions, actor-based mutations, and independent persistence — things that justify choosing state-agent over simpler alternatives.

The refactored version is valuable as a "quick start" example proving state-agent works with minimal ceremony, but it should not be the primary demo. Consider keeping both:
- `demo-app-sa-in-folder-refactor` → "Getting Started" example
- `demo-app-sa` → "Architecture Guide" example
