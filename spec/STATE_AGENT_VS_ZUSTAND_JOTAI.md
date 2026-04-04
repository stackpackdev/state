# Honest Comparison: state-agent vs Zustand vs Jotai

An unflinching look at where state-agent wins, where it loses, and where it's genuinely different.

---

## TL;DR

state-agent is not competing with Zustand or Jotai on their turf. They're state **libraries** — minimal, focused, do-one-thing-well. state-agent is a state **framework** — opinionated, batteries-included, designed for AI agents to introspect and mutate app state. The comparison is honest only if you acknowledge they're solving different problems.

If you just need global state in a React app, **Zustand wins**. If you need atomic derived state, **Jotai wins**. If you need AI agents to reason about, attribute, and safely mutate your app state — that's state-agent's actual game, and neither Zustand nor Jotai play it.

---

## Feature-by-Feature

### What state-agent has that they don't

| Feature | state-agent | Zustand | Jotai | Why it matters |
|---|---|---|---|---|
| **Actor attribution** | Every mutation tagged with who/what did it (human, agent, system) | No | No | Agent audit trails. You can answer "which AI agent changed this field and when?" |
| **When vs Gates** | Explicit distinction between style-edge (appearance) and mount-edge (component existence) conditions | No | No | Agents know which mutations cause re-renders vs which cause mount/unmount cascades |
| **Introspection API** | `introspectStore()`, `impactOf()`, dependency graph traversal | No | No | An AI agent can ask "if I change auth state, what else breaks?" before acting |
| **Presence tracker** | Deferred unmounting with entering/present/leaving phases | No | No | Solves React's animation-on-unmount problem at the state layer |
| **Optimistic updates with queue rebase** | Built-in: apply immediately, commit async, rollback + rebase pending ops on failure | No (DIY) | No (DIY) | Handles cascading optimistic failures without custom code |
| **Declarative effects** | Watch paths, debounce, retry with exponential backoff, abort on re-trigger | No (use middleware) | Atoms can have effects | Reactive side effects declared at the store level, not scattered in components |
| **Pub/Sub across stores** | `publishes`/`subscribes` on store definitions | No | No | Stores communicate via events without importing each other |
| **Flow state machines** | Hierarchical FSM with tree-addressable navigation | No | No | Multi-step workflows (checkout, auth, modals) as first-class state |
| **Mode-based schemas** | Discriminated unions auto-derive when/gates/transitions | No | No | `z.discriminatedUnion('status', [...])` generates the state machine for you |
| **Properties/invariants** | Declarative consistency checks, warn on violation | No | No | "Items must always have IDs" — checked on every mutation |
| **Schema as source of truth** | Zod schema validates every mutation at runtime | No | No | Invalid state literally cannot be written |
| **Transitions** | Declared valid state transitions, enforced at mutation time | No | No | `'idle -> loading'` is valid, `'idle -> error'` is not — prevents impossible states |
| **Undo/redo** | Built-in snapshot stack with configurable limit | No (DIY) | No (DIY) | One config option, not 50 lines of custom code |
| **Auto-generated selectors** | Type-safe selector tree from Zod schema | No | No | `store.select.items[0].text.$path` with full IDE autocomplete |
| **Agent permissions** | `canAct(agent, 'write', 'user.email')` — path-level access control | No | No | Restrict what an AI agent can touch |
| **Composable state patterns** | `Loadable`, `Filterable`, `Selectable`, `Paginated` — compose into stores | No | No | Common patterns as reusable building blocks |

### What Zustand has that state-agent doesn't

| Feature | Zustand | state-agent | Impact |
|---|---|---|---|
| **Ecosystem size** | 45M+ weekly downloads, massive community | New, small community | Zustand has answers on StackOverflow. state-agent has docs. |
| **Zero boilerplate** | `create((set) => ({ count: 0, inc: () => set(s => ({ count: s.count + 1 })) }))` — done | `defineStore({ name, schema, initial, ... })` — more ceremony | Zustand gets you from 0 to working in 30 seconds |
| **No opinions** | Use it however you want — one store, many stores, slices, vanilla | Opinionated: Zod schemas, actors, named stores | Zustand never tells you you're doing it wrong |
| **Middleware ecosystem** | `devtools`, `persist`, `immer`, `subscribeWithSelector` — all community-maintained | Built-in equivalents, but no plugin marketplace | Zustand's middleware is battle-tested by millions |
| **Vanilla JS support** | Works without React, zero framework coupling | Core is framework-agnostic, but React hooks are the primary DX | Zustand is genuinely used outside React |
| **Bundle size** | ~1KB gzipped | Larger (Zod + Immer + core runtime) | Matters for landing pages, less for apps |
| **Learning curve** | Near zero — it's just `create` and `useStore` | Moderate — schemas, actors, when/gates, flows are new concepts | A junior dev ships with Zustand in 10 minutes |
| **Stability** | Battle-tested in production at massive scale | New, evolving API | Zustand won't break your app with a minor version bump |

### What Jotai has that state-agent doesn't

| Feature | Jotai | state-agent | Impact |
|---|---|---|---|
| **Atomic granularity** | Each piece of state is an independent atom, derived atoms compose automatically | Store-level granularity (path subscriptions help, but it's not atomic) | Jotai re-renders exactly the one component that reads the one atom that changed |
| **Bottom-up composition** | Build complex state by composing small atoms | Top-down: define the full schema, then access paths | Jotai scales naturally — add atoms as needed, no schema refactoring |
| **Async atoms** | `atom(async (get) => fetch(...))` — async is a first-class primitive | Effects handle async, but it's more ceremony | Jotai's async story is cleaner for data fetching patterns |
| **No provider required** | Atoms work without wrapping your app | Needs `StoreProvider` or `MultiStoreProvider` | Less boilerplate, easier testing |
| **Ecosystem integrations** | jotai-tanstack-query, jotai-immer, jotai-optics, jotai-xstate | None yet | Jotai plugs into the existing ecosystem |
| **React Suspense** | Native Suspense support via async atoms | No Suspense integration | Jotai plays well with React's concurrent features |
| **Derived state** | Naturally expressed as atoms that read other atoms | Computed values work but are less composable | Jotai's derivation model is more elegant for complex dependency graphs |

---

## Where state-agent genuinely wins

### 1. Agent-first architecture

This is the real differentiator, and it's not close. Neither Zustand nor Jotai were designed for AI agents to interact with your state. state-agent was built for exactly this:

- **Introspection**: An agent can call `introspectStore()` and get a complete structural description of every store, its schema, conditions, computed values, and dependencies — without parsing source code.
- **Impact analysis**: `storeRegistry.impactOf('auth')` returns which stores are gated by auth, which read from it, and which get triggered. An agent knows the blast radius before mutating.
- **Attribution**: Every mutation carries an actor. You can audit what the AI did vs what the user did.
- **Permissions**: `canAct(agent, 'write', 'user.email')` — restrict agents to specific paths. Zustand has no concept of "who is changing state."
- **Agent status**: `withStatus(agent, 'thinking')` — agents report their phase. Components can show "AI is working..." without custom plumbing.

If you're building an app where AI agents read and write state, this is table stakes that you'd have to build yourself on top of Zustand or Jotai.

### 2. Schema-driven safety

Zod validation on every mutation is genuinely powerful:

```typescript
// state-agent: invalid state is structurally impossible
store.set('user.email', 42, actor)  // Zod rejects, state unchanged

// Zustand: you can write anything
set({ email: 42 })  // TypeScript catches it at compile time, but runtime is unprotected
```

For agent-mutated state, runtime validation isn't a nice-to-have — it's essential. An LLM generating a mutation might produce invalid data. state-agent catches it. Zustand doesn't.

### 3. When/Gates: a real conceptual contribution

The distinction between "this changes how something looks" (when) vs "this changes whether something exists" (gates) is genuinely novel. It lets agents reason about the cost of mutations:

- Changing `isSelected` (when) → cheap CSS update
- Changing `isAuthenticated` (gate) → entire component tree mounts/unmounts, data fetches fire

Neither Zustand nor Jotai encode this distinction. You'd model it ad hoc.

### 4. Presence tracking

React's fundamental animation problem — you can't animate something out of the DOM because React unmounts it immediately — is solved at the state layer. The entering/present/leaving lifecycle is clean and the tracker API is well-designed. Zustand and Jotai punt this to Framer Motion or CSS. state-agent integrates it with the state model.

### 5. Optimistic updates done right

The queue rebase strategy is genuinely better than what most teams build themselves:

- Op A applied optimistically, then commits async
- Op B applied optimistically
- Op A fails → state rolls back to before A, then re-applies B

This handles the cascading failure case that most hand-rolled optimistic updates get wrong.

---

## Where state-agent honestly loses

### 1. Complexity budget

state-agent asks you to learn: stores, schemas, actors, when, gates, computed, effects, persistence, flows, pub/sub, presence, middleware, selectors, properties, transitions, optimistic updates, undo/redo, and the introspection API.

Zustand asks you to learn: `create` and `useStore`.

For most apps, Zustand's simplicity is the right trade. state-agent's features justify their complexity only when you actually need them — primarily in agent-interactive or complex enterprise apps.

### 2. Bundle size

Zustand is ~1KB. state-agent ships Zod (~13KB) + Immer (~6KB) + its own runtime. For a dashboard app this doesn't matter. For a landing page or widget, it's a real cost.

### 3. Ecosystem and community

Zustand has millions of production deployments, extensive StackOverflow answers, blog posts, tutorials, and third-party integrations. Jotai has a rich plugin ecosystem (tanstack-query, xstate, optics).

state-agent has documentation. That's a real gap for adoption. When something goes wrong at 2am, the Zustand community has already seen your bug. With state-agent, you're reading source code.

### 4. Rendering granularity vs Jotai

Jotai's atomic model means changing `userEmail` only re-renders the component reading `userEmail`. state-agent's path subscriptions approach this but don't match Jotai's granularity for deeply nested or highly dynamic state graphs.

### 5. React integration depth vs Jotai

Jotai plays natively with React Suspense, concurrent features, and the React mental model (atoms are like useState but global). state-agent's store model is framework-agnostic by design, which means it doesn't leverage React-specific features as deeply.

### 6. Opinionated means inflexible

Zustand lets you structure state however you want. state-agent says "you will use Zod schemas, you will use actors, you will name your stores." If your team has established patterns that don't fit this mold, state-agent fights you. Zustand never does.

---

## The honest question: "Why not just use Zustand + middleware?"

You could replicate individual state-agent features with Zustand middleware:
- Persist → `zustand/middleware/persist`
- Immer → `zustand/middleware/immer`
- Devtools → `zustand/middleware/devtools`
- Computed → custom selectors
- Undo → `zundo` community package

But you **cannot** replicate:
- Actor attribution and permissions (fundamental to the store model)
- When/Gates distinction (not a middleware concern)
- Introspection API with dependency graph (requires knowing about all stores)
- Presence tracking (state-layer lifecycle, not a middleware)
- Schema validation on every mutation (would need to wrap every `set` call)
- Cross-store pub/sub with event topology
- Agent status reporting

The gap isn't in any single feature — it's that state-agent's features are **co-designed**. Actors feed into introspection. Schemas feed into auto-generated selectors. When/gates feed into agent impact analysis. Modes feed into transitions. The whole is greater than the sum of Zustand middleware.

---

## When to choose what

| Scenario | Choice | Why |
|---|---|---|
| Simple app, small team | **Zustand** | Minimal learning curve, massive ecosystem |
| Complex derived state, fine-grained reactivity | **Jotai** | Atomic model is purpose-built for this |
| AI agents read/write app state | **state-agent** | Introspection, attribution, permissions, schema safety — none of this exists elsewhere |
| Multi-step workflows with state machines | **state-agent** | Flows, transitions, mode-based schemas are first-class |
| Need animated mount/unmount | **state-agent** | Presence tracker solves this at the state layer |
| Offline-first with optimistic sync | **state-agent** | Queue rebase strategy handles cascading failures |
| Widget or library (bundle size matters) | **Zustand** or **Jotai** | state-agent's dependency footprint is too large |
| Existing codebase migration | **Zustand** | Incremental adoption is trivial, no schema refactoring needed |
| Enterprise app with audit requirements | **state-agent** | Actor attribution gives you a mutation audit log for free |

---

## The demo app verdict

The demo app (conference companion) doesn't actually need most of state-agent's unique features. It doesn't have AI agents mutating state. It doesn't need presence tracking. It doesn't have complex workflows.

This means the demo app makes state-agent look **heavier than necessary** compared to Zustand. The features that justify state-agent's complexity — agent introspection, attribution, permissions, impact analysis — are invisible because the demo doesn't exercise them.

A better demo app would:
1. Have an AI agent that modifies state (e.g., auto-scheduling sessions based on preferences)
2. Show the introspection API in action (agent asks "what happens if I change this?")
3. Use presence tracking for animated list transitions
4. Use flows for a multi-step registration or check-in process
5. Show actor attribution in a mutation log (user vs AI vs system actions)
6. Demonstrate agent permissions (AI can suggest but not delete connections)

The current demo proves state-agent *works*. A better demo would prove state-agent *matters*.
