# state-agent: Implementation Plan V3

> Unified plan incorporating all insights from v1 (agent-first evolution), v2 (gap completions), animations (presence primitive), and the presence perf brainstorm. Everything below is **not yet done**.

---

## What's Already Shipped

Before diving into what's next, here's the current state:

**Core Runtime (24 modules, 3,875 lines):**
- Store with Zod validation, Immer mutations, history, when/gates, computed
- Ring buffer history (from SPEC.md #3)
- defineStore helper (from SPEC.md #7)
- Memoized computed values
- Auto-generated selector tree from Zod schemas
- Declared transition graphs + mode extraction
- Optimistic updates with queue rebase
- Effect runner (debounce, retry, abort)
- Persistence with migrations
- Cross-store pub/sub event bus
- Property invariants
- Undo/redo with snapshots
- Schema migrations
- Runtime introspection API
- Presence tracker (entering → present → leaving)

**React Layer (9 modules):**
- useStore, useSelect, useValue, useChange, useUpdate, useWhen, useGate, useComputed, useActor, useFlow
- usePresence (single gate), usePresenceList (array items)
- `<Presence>`, `<Gated>`, `<StoreProvider>`, `<MultiStoreProvider>`
- Component binding contracts

**Tests:** 35 files, all passing

**What's NOT done yet (carried from previous specs):**
- SPEC.md #1 (remove structuredClone on store creation)
- SPEC.md #2/#4 (memoize when/gate evaluation + reference-stable snapshots)
- SPEC.md #5 (expose DELETE on Store interface)
- SPEC.md #8 (default human actor — partial, useActor exists but actor not optional everywhere)
- SPEC.md #6 (split skill doc into quick-start + reference)
- SPEC.md #10 (read-only useStore without actor)
- V2-2 (introspection completeness — modes, transitions, effects, selectors, properties, undo, pub/sub)
- V2-3 (performance benchmark enforcement)
- V2-4 (component binding contracts — implemented but not adopted)
- All presence perf optimizations from brainstorm

---

## V3 Strategy: Three Waves

**Wave 1 — Performance Foundation** (no API changes, no breaking changes)
Ship the quick wins that make the existing API faster. All internal. Can be done in one session.

**Wave 2 — API Polish** (additive API changes, backwards-compatible)
Close the ergonomic gaps that make agent-generated code verbose or error-prone.

**Wave 3 — Advanced Capabilities** (new features, new patterns)
Features that expand what's possible, informed by real usage patterns.

---

## Wave 1: Performance Foundation

### 1.1 Presence Tracker Quick Wins

**Source:** brainstorm-presence-perf.md — "Quick Wins (do now)" section

Four internal optimizations, zero API changes:

**a) Lazy notify** — `runtime/core/presence.ts`
```typescript
function notify(): void {
  if (listeners.length === 0) return
  // ...existing
}
```
Skip snapshot construction when nobody's listening. Trivial.

**b) Reference equality check on sync** — `runtime/core/presence.ts`
```typescript
let lastNextRef: T[] | null = null

function sync(next: T[], keyFn: (item: T) => string): PresenceRecord<T>[] {
  if (next === lastNextRef) return getOrderedRecords()
  lastNextRef = next
  // ...existing diff
}
```
When React re-renders but the source array hasn't changed, sync becomes O(1).

**c) Cached snapshot with dirty flag** — `runtime/core/presence.ts`
```typescript
let cachedSnapshot: PresenceRecord<T>[] | null = null
let snapshotDirty = true

function getOrderedRecords(): PresenceRecord<T>[] {
  if (!snapshotDirty && cachedSnapshot) return cachedSnapshot
  // ...build snapshot
  cachedSnapshot = result
  snapshotDirty = false
  return result
}
// Invalidate in sync(), entered(), done(), removeRecord()
```
All subscribers in one notify() cycle get the same array reference.

**d) Batch flush** — `runtime/core/presence.ts`
Replace per-item `removeRecord()` loop in `flush()` with single-pass set-based removal:
```typescript
function flush(): void {
  const leavingKeys = new Set<string>()
  for (const [key, record] of recordMap) {
    if (record.phase === 'leaving') leavingKeys.add(key)
  }
  if (leavingKeys.size === 0) return
  for (const key of leavingKeys) {
    cancelTimer(key)
    recordMap.delete(key)
    onRemoved?.(key)
  }
  keyOrder = keyOrder.filter(k => !leavingKeys.has(k))
  notify()  // single notification
}
```
`flush()` drops from O(n^2) to O(n).

**Expected impact:** `entered()` on 100 items: 120us → ~5us. `flush()` 100 items: O(n^2) → O(n). Sync with unchanged input: O(1).

**Tests:** Add to `runtime/core/__tests__/presence.test.ts`:
- Lazy notify: no snapshot allocated when 0 subscribers
- Reference equality: sync with same array ref returns cached result
- Cached snapshot: two consecutive `records()` calls return same reference
- Batch flush: verify single notify call during flush of N items

---

### 1.2 Remove structuredClone on Store Creation

**Source:** SPEC.md #1

**File:** `runtime/core/store.ts`
**Change:** `let state: T = structuredClone(initial)` → `let state: T = initial`

Immer produces new references on every mutation. The clone is defensive but unnecessary — the user passes `initial` once. Zod validation catches drift. Saves allocation on large initial states.

**Note:** `structuredClone` is still used in undo/redo and optimistic updates (lines ~270, ~570, ~607 in store.ts). Those are correct — they clone *current state* for snapshots. Only the initial state clone is unnecessary.

**Tests:** Existing store creation tests cover this. Add one assertion: verify that `store.getState()` initially returns the same reference as `initial` (or an Immer-frozen version of it).

---

### 1.3 Memoize When/Gate Evaluation

**Source:** SPEC.md #2 + #4 (reference-stable snapshots are auto-fixed by this)

**File:** `runtime/core/store.ts` (getWhen/getGates) or `runtime/core/when.ts`

Cache the result object per evaluator. Only re-evaluate when state reference changes:
```typescript
let cachedState: unknown = undefined
let cachedResult: Record<string, boolean> = {}

function evaluate(state: T): Record<string, boolean> {
  if (state === cachedState) return cachedResult
  cachedState = state
  cachedResult = { /* run all predicates */ }
  return cachedResult
}
```

Since Immer guarantees new references on mutation, `===` check is sufficient. This also fixes SPEC.md #4 — `useWhen` and `useGate` hooks get reference-stable objects from `useSyncExternalStore`, preventing unnecessary re-renders.

**Tests:** Add to when/gate tests:
- Same state reference → same result object reference
- Different state reference → re-evaluated result
- useWhen/useGate don't re-render when state changes but conditions don't

---

### 1.4 Performance Benchmark Enforcement

**Source:** IMPLEMENTATIONV2.md #4

**File:** `runtime/core/__bench__/budget.test.ts` (may already exist as bench files)

Enforce the performance budget as test assertions:

| Metric | Budget | Test Threshold (2x) |
|--------|--------|---------------------|
| Store creation (30 fields) | < 5ms | < 10ms |
| Mutation (path write) | < 1ms | < 2ms |
| Introspection (20 stores) | < 10ms | < 20ms |
| Presence sync (100 items) | < 1ms | < 2ms |
| Presence flush (100 items) | < 1ms | < 2ms |

Add `"bench": "vitest bench"` to package.json scripts if not present.

**Tests:** Budget tests run in CI. 2x threshold accounts for CI variance.

---

## Wave 2: API Polish

### 2.1 Expose DELETE on Store Interface

**Source:** SPEC.md #5

**Files:** `runtime/core/types.ts`, `runtime/core/store.ts`

Add `delete(path: string, actor: Actor): void` to the Store interface. The reducer already handles DELETE actions internally — this just exposes it as a first-class method:

```typescript
// types.ts
delete(path: string, actor: Actor): void

// store.ts
delete(path: string, actor: Actor) {
  if (!canAct(actor, 'delete', path)) { /* warn */ return }
  dispatch({ id: createActionId(), type: 'DELETE', path, actor, timestamp: Date.now() })
}
```

**Tests:**
- `store.delete('items.0', actor)` removes the item
- DELETE respects actor permissions
- DELETE is recorded in history

---

### 2.2 Default Actor Everywhere

**Source:** SPEC.md #8 + #10

Make `actor` parameter optional in all mutation methods. Falls back to the lazy default human actor.

**Files:** `runtime/core/store.ts`, `runtime/react/hooks.ts`

Currently `useActor` exists but `store.set()`, `store.update()`, `useChange()`, `useUpdate()` still require explicit actors. Change signatures:

```typescript
// store.ts
set(path: string, value: unknown, actor?: Actor): void
update(fn: (draft: T) => void, actor?: Actor): void
delete(path: string, actor?: Actor): void
reset(actor?: Actor): void

// hooks.ts — useStore return values
change(path: string, value: unknown, actor?: Actor): void
update(fn: (draft: T) => void, actor?: Actor): void
```

All resolve to `getDefaultActor()` when omitted. Explicit actors still work. Backwards-compatible (optional params).

**Tests:**
- `store.set('name', 'Alice')` works without actor
- `useChange('todos')` works without actor argument
- Explicit actor still takes precedence

---

### 2.3 Introspection API Completeness

**Source:** IMPLEMENTATIONV2.md #3

Extend `StoreIntrospection` to include everything the store knows:

```typescript
interface StoreIntrospection {
  // Existing
  name, state, when, gates, computed, dependencies, historyLength

  // NEW
  currentMode?: string
  modes?: string[]
  validTransitions?: string[]
  transitionNames?: string[]
  effects?: Record<string, string>
  selectorPaths?: string[]
  properties?: Record<string, boolean>
  undoEnabled?: boolean
  undoDepth?: number
  canRedo?: boolean
  publishes?: string[]
  subscribes?: string[]
}
```

**Approach:** Add `__meta` to the Store object during `createStore()`. Introspection reads from `__meta`. No new registry needed.

**Files:** `runtime/core/types.ts`, `runtime/core/store.ts`, `runtime/core/introspect.ts`

**Tests:** Extend `introspect.test.ts`:
- Returns modes/currentMode for discriminated union stores
- Returns validTransitions from current mode
- Returns effect names and status
- Returns selectorPaths
- Returns property check results
- Returns undo state
- Returns pub/sub event names
- Plain stores omit mode/transition fields

---

### 2.4 Presence Batch API

**Source:** brainstorm-presence-perf.md — optimization 1A

Add `enteredBatch(keys[])` and `doneBatch(keys[])` to PresenceTracker:

```typescript
function enteredBatch(keys: string[]): void {
  let changed = false
  for (const key of keys) {
    const record = recordMap.get(key)
    if (record && record.phase === 'entering') {
      recordMap.set(key, { ...record, phase: 'present', at: now() })
      changed = true
    }
  }
  if (changed) { invalidateSnapshot(); notify() }
}
```

100 items: 100 notify() calls → 1. ~120us → ~5us.

**Files:** `runtime/core/presence.ts`, `runtime/core/types.ts` (PresenceTracker interface)

**Tests:**
- enteredBatch transitions all specified keys to 'present'
- doneBatch removes all specified leaving keys
- Single notify per batch call

---

### 2.5 Generation Counter on Presence Tracker

**Source:** brainstorm-presence-perf.md — optimization 3C

Expose a read-only `generation` number that increments on every mutation. Hooks can skip redundant work:

```typescript
interface PresenceTracker<T> {
  // ...existing
  readonly generation: number
}
```

React hooks use this for cheap `getSnapshot` identity:
```typescript
// use-presence.ts
const getSnapshot = useCallback(() => tracker.generation, [tracker])
```

**Files:** `runtime/core/presence.ts`, `runtime/react/use-presence.ts`

---

### 2.6 Split Skill Doc

**Source:** SPEC.md #6

**File:** `integrations/claude-code/skill.md` (or `skill/skill.md`)

Restructure into two sections:
- **Quick Start** (< 80 lines): trigger, install, store template with `defineStore`, decision checklist, React hooks. Covers 90% of tasks.
- **Full Reference**: middleware, history, fetchers, flows, dependencies, batch, presence, transitions, effects, pub/sub, persistence, introspection. Agent reads on demand.

No new files — just reorder content with clear `## Quick Start` / `## Full Reference` headers.

---

## Wave 3: Advanced Capabilities

### 3.1 Microtask Coalescing for Presence (Opt-in)

**Source:** brainstorm-presence-perf.md — optimization 1B

Queue presence phase changes and flush on `queueMicrotask`. All `entered()`/`done()` calls within the same tick coalesce into one notification.

```typescript
interface PresenceTrackerOptions {
  // ...existing
  coalesce?: boolean  // default: false
}
```

When `coalesce: true`:
```typescript
let pendingFlush = false
function scheduleNotify(): void {
  if (!pendingFlush) {
    pendingFlush = true
    queueMicrotask(() => {
      pendingFlush = false
      notify()
    })
  }
}
```

**Tradeoff:** Adds ~1 microtask delay. For animations this is invisible but changes the notification contract from sync to async. Opt-in avoids breaking existing consumers.

**Tests:**
- With `coalesce: true`, multiple `entered()` calls in same tick produce one notify
- Without coalesce, behavior unchanged

---

### 3.2 Index Set with Lazy Rebuild for keyOrder

**Source:** brainstorm-presence-perf.md — optimization 2A

Replace immediate `keyOrder.filter()` on every removal with a `deletedKeys: Set<string>` and lazy rebuild:

```typescript
const deletedKeys = new Set<string>()
let keyOrderDirty = false

function removeRecord(key: string): void {
  cancelTimer(key)
  recordMap.delete(key)
  deletedKeys.add(key)
  keyOrderDirty = true
  onRemoved?.(key)
  notify()
}

function getOrderedRecords(): PresenceRecord<T>[] {
  if (keyOrderDirty) {
    keyOrder = keyOrder.filter(k => !deletedKeys.has(k))
    deletedKeys.clear()
    keyOrderDirty = false
  }
  // ...build snapshot
}
```

Multiple removals between reads only filter once. Internal-only change.

---

### 3.3 Component Binding Contract Adoption

**Source:** IMPLEMENTATIONV2.md #5

The `withContract` / `findAffectedComponents` API exists in `runtime/react/contract.ts` but has no adoption. This phase is about:

1. Adding contract examples to the skill doc
2. Teaching agents to emit contracts when generating components
3. Adding a dev-mode validation layer that warns when a component reads paths not declared in its contract

**Deferred until demand warrants it.** Introspection API covers 80% of the same need.

---

## Priority Matrix

| # | Feature | Wave | Impact | Effort | Breaking? | Depends On |
|---|---------|------|--------|--------|-----------|------------|
| 1.1 | Presence quick wins (4 fixes) | 1 | High perf | Low | No | — |
| 1.2 | Remove structuredClone | 1 | Medium perf | Trivial | No | — |
| 1.3 | Memoize when/gate | 1 | High perf + React | Low | No | — |
| 1.4 | Benchmark enforcement | 1 | Medium (CI) | Medium | No | — |
| 2.1 | Expose DELETE | 2 | Low | Trivial | No | — |
| 2.2 | Default actor everywhere | 2 | High ergonomics | Low | No | — |
| 2.3 | Introspection completeness | 2 | Medium agent DX | Medium | No | — |
| 2.4 | Presence batch API | 2 | High perf | Low | No (additive) | 1.1 |
| 2.5 | Generation counter | 2 | Medium perf | Low | No (additive) | 1.1 |
| 2.6 | Split skill doc | 2 | High agent DX | Low | No | 2.2 |
| 3.1 | Microtask coalescing | 3 | Medium perf | Medium | No (opt-in) | 2.4 |
| 3.2 | Lazy keyOrder rebuild | 3 | Low perf | Low | No | 1.1 |
| 3.3 | Contract adoption | 3 | Low | High | No | 2.3 |

---

## Execution Order

### Session 1: Wave 1 (Performance Foundation)
All items are independent. Can be parallelized:

1. **1.1** Presence quick wins (4 internal changes)
2. **1.2** Remove structuredClone on init
3. **1.3** Memoize when/gate evaluators
4. **1.4** Add benchmark budget tests

Run all tests. Verify no regressions. Commit.

### Session 2: Wave 2 (API Polish)
Some dependencies:

1. **2.1** Expose DELETE (independent)
2. **2.2** Default actor everywhere (independent)
3. **2.4** Presence batch API (depends on 1.1 being done)
4. **2.5** Generation counter (depends on 1.1)
5. **2.3** Introspection completeness (independent but benefits from all above being done)
6. **2.6** Split skill doc (last — reflects all API changes)

### Session 3: Wave 3 (Advanced — as needed)
Only if perf profiling or user feedback demands it:

1. **3.1** Microtask coalescing
2. **3.2** Lazy keyOrder rebuild
3. **3.3** Contract adoption

---

## Real-World Integration Insights (from demo-app-sa refactor)

The AINDCon conference app refactor (demo-app → demo-app-sa) exposed practical issues that should inform Wave 2 and future work.

### Insight 1: `getStore()` returns untyped — agents guess wrong

`getStore('user')` returns `Store<unknown>`. Every call site needs a manual cast: `getStore('user')! as Store<UserState>`. Agents generating code either forget the cast or get the type wrong. The typed accessor pattern we started (`function userStore() { return getStore('user')! as Store<UserState> }`) works but is boilerplate that should be unnecessary.

**Recommendation for 2.2 (Default Actor) or new item:** `defineStore` should return a typed accessor. When a store is created via `defineStore('user', schema)`, the returned object should include a typed `store` property that doesn't require casting. The current `defineStore` already does this — but `getStore()` from the registry doesn't benefit from it. Consider making `getStore` generic: `getStore<UserState>('user')` with the type parameter, or deprecate `getStore` in favour of the typed store reference from `defineStore`.

### Insight 2: Cross-store actions need the store reference, not the registry

Centralized action files (like `actions.ts`) that coordinate across stores call `getStore()` repeatedly. This creates a runtime lookup on every action call. More importantly, it's fragile — if a store name changes, the string breaks silently.

**Recommendation:** The skill doc should teach the pattern of importing store references directly:
```typescript
import { user } from './user.store'
import { schedule } from './schedule.store'

export function addRating(...) {
  schedule.store.update(...)  // typed, no registry lookup
  user.store.set(...)         // typed, no registry lookup
}
```
This is already possible but the skill doc and AGENTS.md don't emphasize it over `getStore()`.

### Insight 3: `completeQuest(id)` vs `completeQuest(id, points)` — action signatures diverge from expectations

The original app's `completeQuest` took one argument (quest ID) and looked up the points internally. The state-agent version takes two arguments. This mismatch caused broken call sites that TypeScript only caught because `noImplicitAny` was on.

**Recommendation for 2.6 (Skill Doc Split):** The skill doc should explicitly warn that action signatures in state-agent are self-contained — they don't close over external data (like a `quests` array). Each action receives everything it needs as parameters. This is a deliberate design choice for testability and agent-friendliness, but it's a migration trap.

### Insight 4: Vite alias ordering matters for subpath imports

`state-agent` and `state-agent/react` as Vite aliases must use array form (not object) with the more specific path first. Object-form aliases match by prefix, so `state-agent` swallows `state-agent/react`. This will bite every new project that sets up Vite aliases.

**Recommendation:** Add a Vite config example to the skill doc's quick-start section:
```typescript
resolve: {
  alias: [
    { find: 'state-agent/react', replacement: '...' },  // specific first
    { find: 'state-agent', replacement: '...' },
  ],
},
```

### Insight 5: `useValue` return types require explicit generic annotation

`useValue('user', 'profile')` returns `unknown` without a type parameter. Every call site needs `useValue<UserProfile | null>('user', 'profile')`. This is verbose and error-prone — agents often omit the generic or get it wrong.

**Recommendation:** If the store was created with a Zod schema, the hook should infer the type from the schema path. This may require a `useTypedValue` variant or a store-scoped hook factory:
```typescript
const { useValue } = user.hooks  // pre-typed to UserState
const profile = useValue('profile')  // inferred as UserProfile | null
```
This is a Wave 3 candidate — high ergonomic impact but requires API design work.

### Insight 6: `MultiStoreProvider` is the right default, not `StoreProvider`

Real apps always have multiple stores. The demo app uses `MultiStoreProvider` with all 4 stores. Single-store `StoreProvider` is only useful for isolated widgets. The skill doc should lead with `MultiStoreProvider`.

### Insight 7: Persistence should be a first-class store option, not a manual subscription

The demo app's `persistence.ts` manually subscribes to each store and writes to localStorage. This is the same boilerplate every app will write. The existing persistence module in runtime should be surfaced more prominently, or `defineStore` should accept a `persist: { key: string, storage?: Storage }` option.

---

## Real-World Integration Insights — Part 2 (from demo-app-sa-in-folder-refactor)

A second refactor of the same AINDCon app — this time keeping it in-folder and using the skill doc as the sole reference — exposed additional issues distinct from the first refactor.

### Insight 8: The `state-agent` npm name is taken by an unrelated package

Running `npm install state-agent` installs a Claude Code agent runtime, not this library. The refactoring agent installed the wrong package and only discovered the mismatch when TypeScript couldn't find `state-agent/react`. This will happen to every agent and every developer who follows the skill doc.

**Recommendation:** Either publish under a scoped name (`@state-agent/core`, `@anthropic/state-agent`), or add a loud warning at the top of the skill doc's Install section explaining that `npm install state-agent` installs the wrong package and providing the correct local/registry path.

### Insight 9: Local-linked packages cause React dual-instance errors

When state-agent is installed via local path (`npm install ../state-agent`), it resolves its own `react` from the parent project's `node_modules`, not the consuming app's. This causes the classic "Invalid hook call" / "Cannot read properties of null (reading 'useRef')" error at runtime and in tests.

The fix requires `resolve.alias` in both `vite.config.ts` AND `vitest.config.ts`:
```typescript
resolve: {
  alias: {
    react: path.resolve(__dirname, 'node_modules/react'),
    'react-dom': path.resolve(__dirname, 'node_modules/react-dom'),
  },
}
```

**Recommendation:** Either mark `react` and `react-dom` as `peerDependencies` only (no `dependencies` entry) in state-agent's package.json, or add this alias boilerplate to the skill doc's Install section. This is mandatory friction for every local install.

### Insight 10: Supabase sync threading creates awkward action signatures

The original app's actions were `useCallback` closures that captured `authUser` from the React scope. When actions move to the store file (outside React), they lose access to auth context. Every action needs an explicit `authUserId?: string` parameter:

```typescript
export function toggleInterest(sessionId: string, authUserId?: string) { ... }
export function addRating(sessionId: string, stars: number, comment: string | undefined, authUserId?: string) { ... }
```

App.tsx then creates bound wrappers: `const boundToggleInterest = (id) => toggleInterest(id, authUser?.id)`. This is boilerplate that defeats the purpose of extracting actions from the component.

**Recommendation for future design:** A cleaner pattern would be:
1. A separate `auth` store (Separate primitive) that publishes login/logout events
2. The app store subscribes to `auth.authenticated` / `auth.deauthenticated`
3. A sync middleware or effect that watches all mutations and conditionally syncs to Supabase based on the auth store's state — no `authUserId` threading needed

This pub/sub + middleware approach is already supported by state-agent but the skill doc doesn't show it for this use case. Adding a "Sync with Backend" pattern to the skill doc would significantly improve real-world adoption.

### Insight 11: Achievement engine as an effect vs useEffect

The achievement evaluation engine runs on every state change and checks all achievements/quests. In the refactored app, it's still a `useEffect` in App.tsx because it needs access to both the store state AND the `DataContext` (achievements/quests data). This means one of the main benefits of state-agent (moving logic out of components) is only partially achieved.

**Recommendation:** The skill doc should show a pattern for effects that depend on external data:
- Option A: Copy the reference data into the store on mount, then use a store `effect` with `watch: '*'`
- Option B: Accept that some orchestration logic stays in React when it bridges multiple data sources — this is the pragmatic choice

### Insight 12: `persist` option and manual localStorage hydration conflict

The store's `persist` option handles saving to localStorage, but initial state hydration was done manually in `loadInitialState()` to merge with `defaultState`. If `persist` also hydrates on creation, there's a race condition or double-write. The interaction between `persist.storage` hydration and the `initial` value passed to `defineStore` needs clearer documentation.

**Recommendation for 2.6 (Skill Doc Split):** Document the hydration order explicitly: Does `persist` override `initial`? Is `initial` used as fallback when storage is empty? When both are present, which wins?

---

## Non-Goals

Carried from brainstorm-presence-perf.md:

- **Spring physics / JS interpolation** — CSS handles visuals. We track lifecycle.
- **Competing with Framer Motion on features** — We compete on correctness and agent-friendliness.
- **Sub-microsecond presence** — When/Gate are 15-24ns (pure booleans). Presence manages keyed records. 2-20us is the right ballpark.
- **Linked list for keyOrder** — Overkill at current scale (brainstorm ruled this out).
- **Object pool for PresenceRecord** — High complexity, low gain (brainstorm ruled this out).

---

## Risk Register

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Memoized when/gate returns stale result | Low | High | `===` check on Immer-produced state is reliable; add regression test with rapid mutations |
| Default actor breaks explicit actor code | Low | Medium | Optional params are backwards-compatible; existing code passing actors still works |
| Benchmark tests are flaky in CI | Medium | Low | 2x threshold; mark as non-blocking if needed |
| Presence coalescing changes timing expectations | Medium | Medium | Opt-in only; default remains synchronous |
| Introspection __meta leaks into serialization | Low | Low | Use non-enumerable property or Symbol key |

---

## Success Criteria

After Wave 1 + Wave 2:

1. **Presence perf:** sync(100 items) < 1ms, flush(100 items) < 1ms, entered(100 items) with batch < 0.1ms
2. **When/gate stability:** useWhen/useGate don't re-render when conditions haven't changed
3. **Agent ergonomics:** A new store + component can be generated with zero explicit actor boilerplate
4. **Introspection:** `storeRegistry.introspect()` returns modes, transitions, effects, selectors, properties, undo, pub/sub for every store
5. **Budget enforcement:** CI catches any regression beyond 2x the performance budget
6. **All existing tests still pass** — zero breaking changes
