# Implementation Plan: First-Class Animation State Management

## Problem Statement

React has no concept of a component that is "unmounting but still visible." When state says an element is gone, React removes it from the DOM immediately. Every animation library works around this with userland hacks that are fragile, race-prone, and invisible to state management tools.

This is the #1 pain point in React UI development. It's been an open issue since 2014 (react#161). Framer Motion's `AnimatePresence` is the most popular workaround, but it has dozens of documented race conditions, stale closure bugs, and conflicts with external state management.

state-agent is uniquely positioned to solve this because **presence is a state concern, not a rendering concern**. The lifecycle phase of a UI element (entering, present, leaving) belongs in the store — observable, debuggable, agent-readable — not buried in component-tree bookkeeping.

## The Real-World Cost

The sticky header bug (from the companion app) is a textbook example. An agent spent **40+ turns** debugging animation state issues caused by:
- CSS `fadeIn` animation on `.main-content > *` forcing opacity 0→1 on an element that should have been hidden
- Scroll restoration timing causing a brief `isSticky=true→false` flash
- `no-transition` class timing vs React's commit cycle vs browser paint
- `requestAnimationFrame` double-buffering still being too early
- Ref vs state timing for suppressing transitions on mount

All of this is a symptom of animation lifecycle living outside the state system. With presence as a first-class primitive, the fix is one line: `<Presence store="schedule" gate="isSticky" timeout={0}>` — the element never enters the DOM until the gate is stable, and it never flashes because the presence tracker manages the lifecycle phase.

## Design: The Presence Primitive

### Conceptual Model

| Primitive | Edge Type | What Changes | Unmount |
|-----------|-----------|-------------|---------|
| **When** | style-edge | Appearance (classes, styles) | Never — element stays mounted |
| **Gate** | mount-edge | Component subtree | Immediate — gone when gate closes |
| **Presence** | presence-edge | Component subtree + lifecycle phase | Deferred — stays until leave completes |

Presence is a **superset of Gate**: it mounts when the condition is true, but **delays unmounting** until the leaving animation signals completion (or a timeout fires). The lifecycle phase (`entering` → `present` → `leaving`) is explicit, observable state.

### Why This Is Different From AnimatePresence

| | AnimatePresence | state-agent Presence |
|---|---|---|
| **Where presence lives** | Component tree (React keys + ref counting) | State layer (store-observable) |
| **Race condition on rapid toggle** | Breaks — internal bookkeeping desyncs from React tree | Handles — `sync()` cancels pending leave, flips back to entering |
| **Stale closures in callbacks** | Yes — `onAnimationComplete` captures render-time values | No — `done()` is keyed by record identity, not closure state |
| **Works without animation library** | No — requires Framer Motion | Yes — CSS transitions work via `timeout` |
| **Agent-readable** | No — invisible internal state | Yes — phase is in the store subscription |
| **Nested gates** | Grandchild exits don't fire (#790) | Works — presence is per-element, not tree-structural |
| **Portal support** | Broken (#2692) | Works — presence tracking is state-side, not DOM-side |

## Architecture

### New Files

```
runtime/core/presence.ts                    — Framework-agnostic presence tracker
runtime/core/__tests__/presence.test.ts     — Core presence tests (pure logic)
runtime/react/presence.tsx                  — <Presence> component (single-item)
runtime/react/use-presence.ts               — usePresence + usePresenceList hooks
runtime/react/__tests__/presence.test.tsx    — React integration tests
```

### Modified Files

```
runtime/core/types.ts      — Add PresencePhase, PresenceRecord types
runtime/core/index.ts      — Export presence tracker + types
runtime/react/index.ts     — Export hooks + component
```

### NOT Modified

- `runtime/react/gated.tsx` — `<Gated>` stays as-is for immediate unmounting
- `runtime/core/store.ts` — No changes to the store internals
- `runtime/core/when.ts` — When/Gate evaluators unchanged

---

## Phase 1: Core Presence Tracker (`runtime/core/presence.ts`)

Framework-agnostic. Pure TypeScript. No React, no DOM.

### Types (added to `runtime/core/types.ts`)

```typescript
export type PresencePhase = 'entering' | 'present' | 'leaving'

export interface PresenceRecord<T = any> {
  /** Stable identity key */
  key: string
  /** The actual data value */
  value: T
  /** Current lifecycle phase */
  phase: PresencePhase
  /** Timestamp when this phase started (ms) */
  at: number
}
```

### PresenceTracker API

```typescript
interface PresenceTrackerOptions {
  /** Default timeout for leaving phase in ms. 0 = manual only (must call done()). */
  timeout?: number
  /** Called when a record completes leaving and is fully removed */
  onRemoved?: (key: string) => void
}

interface PresenceTracker<T> {
  /**
   * Sync with the current truth from state.
   * - Items in `next` but not tracked → phase: 'entering'
   * - Items tracked but not in `next` → phase: 'leaving' (starts timeout)
   * - Items in `next` that were 'leaving' → cancelled, back to 'entering'
   * - Items in both with phase 'entering' → stay 'entering' (enter signal not yet called)
   *
   * Returns the full list including departing items.
   */
  sync(next: T[], keyFn: (item: T) => string): PresenceRecord<T>[]

  /** Signal that an item's enter animation is complete → phase becomes 'present' */
  entered(key: string): void

  /** Signal that an item's leave animation is complete → record removed */
  done(key: string): void

  /** Remove all leaving items immediately */
  flush(): void

  /** Current snapshot of all records */
  records(): PresenceRecord<T>[]

  /** Subscribe to changes */
  subscribe(listener: (records: PresenceRecord<T>[]) => void): () => void

  /** Destroy: clear timeouts, remove listeners */
  destroy(): void
}
```

### Key Implementation Details

**The `sync()` three-way diff** — this is the critical function:

```
1. Build Set<string> of keys from `next`
2. For each existing record:
   - Key in next AND phase is 'leaving'?
     → Cancel leave timeout, set phase to 'entering', update value
     → THIS SOLVES RAPID TOGGLE RACE CONDITIONS
   - Key NOT in next AND phase is not 'leaving'?
     → Set phase to 'leaving', freeze value, start timeout
3. For each item in next with no existing record:
   → Create record with phase 'entering'
4. Emit snapshot to subscribers
```

**Value freezing on leave**: When an item transitions to `leaving`, its `value` is frozen at that moment. This means leaving items don't receive prop updates from state — they animate out with consistent data. This solves the stale closure problem because there's nothing stale; the value is intentionally frozen.

**Timeout as safety net**: If `timeout > 0`, a `setTimeout` fires after the specified ms and calls `done(key)` automatically. This means CSS-only animations work without any JS callback — just set `timeout` to match your CSS transition duration. If `done()` is called before the timeout, the timeout is cancelled.

### Tests (`runtime/core/__tests__/presence.test.ts`)

Must cover:
- Basic add: `sync([a])` → record with phase 'entering'
- Basic remove: `sync([a])` then `sync([])` → record with phase 'leaving'
- Rapid toggle: `sync([a])`, `sync([])`, `sync([a])` → back to 'entering', leave cancelled
- Timeout auto-removal: `sync([a])`, `sync([])`, wait timeout → record gone
- Manual done: `sync([a])`, `sync([])`, `done(key)` → record gone immediately
- Entered signal: `sync([a])`, `entered(key)` → phase 'present'
- Value freeze: `sync([{id:'a', text:'hello'}])`, `sync([])` → leaving record still has text:'hello'
- Subscriber notification: listener called on sync, entered, done
- Flush: removes all leaving items immediately
- Destroy: clears all timeouts
- Multiple items: add 3, remove middle one, verify ordering preserved
- Re-add during leave with different value: value updates to new value

---

## Phase 2: React Hooks (`runtime/react/use-presence.ts`)

### `usePresence(storeName, gateName, options?)` — Single-Item Presence

For boolean gates that control one element's lifecycle.

```typescript
interface UsePresenceOptions {
  /** Leave timeout in ms. Default: 300. Set 0 for manual done() only. */
  timeout?: number
}

interface UsePresenceResult {
  /** Whether the element should be in the DOM (true during entering + present + leaving) */
  isPresent: boolean
  /** Current phase, or null if fully removed */
  phase: PresencePhase | null
  /** Call to signal leave animation complete. Only meaningful during 'leaving'. */
  done: () => void
  /** Ref callback — attach to DOM element for automatic CSS transitionend detection */
  ref: React.RefCallback<HTMLElement>
}
```

**Implementation approach**:
- Creates a single-item `PresenceTracker` in a `useRef` (stable across renders)
- Subscribes to the store's gate via `useSyncExternalStore`
- When gate changes, calls `tracker.sync([gateOpen ? SENTINEL : NOTHING])`
- Returns the current phase and `done` callback
- The `ref` callback is optional convenience: attaches a `transitionend` listener that auto-calls `done()` when the CSS transition finishes. Users who prefer manual control ignore it.

### `usePresenceList(storeName, path, keyFn, options?)` — List Presence

For arrays where items enter and leave.

```typescript
interface UsePresenceListOptions<T> {
  /** Leave timeout in ms. Default: 300. */
  timeout?: number
  /** Extract stable key from item. Default: (item) => item.id */
  keyFn?: (item: T) => string
}

interface UsePresenceListResult<T> {
  /** All items including departing ones, with lifecycle metadata */
  items: PresenceRecord<T>[]
  /** Signal that a specific item's leave animation is done */
  done: (key: string) => void
  /** Signal that a specific item's enter animation is done */
  entered: (key: string) => void
  /** Remove all leaving items immediately */
  flush: () => void
}
```

**Implementation approach**:
- Creates a `PresenceTracker` in a `useRef`
- Subscribes to the store at the given `path` via `useSyncExternalStore`
- On each state change, calls `tracker.sync(nextArray, keyFn)`
- Returns the full record list — components map over it and use `record.phase` for animation classes/props

### Usage Examples

**CSS-only (no animation library)**:
```tsx
function Modal() {
  const { isPresent, phase, ref } = usePresence('modal', 'isOpen', { timeout: 300 })

  if (!isPresent) return null

  return (
    <div ref={ref} className={`modal modal--${phase}`}>
      <ModalContent />
    </div>
  )
}
```
```css
.modal--entering { opacity: 0; transform: translateY(8px); }
.modal--present  { opacity: 1; transform: translateY(0); transition: all 300ms ease; }
.modal--leaving  { opacity: 0; transform: translateY(8px); transition: all 300ms ease; }
```

**With Framer Motion**:
```tsx
function Modal() {
  const { isPresent, phase, done } = usePresence('modal', 'isOpen')

  if (!isPresent) return null

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: phase === 'leaving' ? 0 : 1, y: phase === 'leaving' ? 8 : 0 }}
      onAnimationComplete={() => { if (phase === 'leaving') done() }}
    >
      <ModalContent />
    </motion.div>
  )
}
```

**Animated list**:
```tsx
function TodoList() {
  const { items, done, entered } = usePresenceList('todos', 'items', item => item.id, {
    timeout: 250,
  })

  return (
    <ul>
      {items.map(record => (
        <li
          key={record.key}
          className={`todo todo--${record.phase}`}
          onTransitionEnd={() => {
            if (record.phase === 'leaving') done(record.key)
            if (record.phase === 'entering') entered(record.key)
          }}
        >
          {record.value.text}
        </li>
      ))}
    </ul>
  )
}
```

**Skeleton-to-content crossfade** (solves the dual-mount problem):
```tsx
function PostSection() {
  const loading = usePresence('posts', 'isLoading', { timeout: 300 })
  const loaded = usePresence('posts', 'isLoaded', { timeout: 300 })

  return (
    <div className="post-section">
      {loading.isPresent && (
        <Skeleton className={`skeleton skeleton--${loading.phase}`} ref={loading.ref} />
      )}
      {loaded.isPresent && (
        <PostList className={`content content--${loaded.phase}`} ref={loaded.ref} />
      )}
    </div>
  )
}
```

### Tests (`runtime/react/__tests__/presence.test.tsx`)

Must cover:
- `usePresence`: gate open → isPresent true, phase entering
- `usePresence`: gate close → phase leaving, isPresent still true
- `usePresence`: done() called → isPresent false
- `usePresence`: timeout fires → isPresent false
- `usePresence`: rapid toggle (open/close/open) → back to entering, no stale leaving
- `usePresenceList`: add items → records with phase entering
- `usePresenceList`: remove item → record transitions to leaving
- `usePresenceList`: re-add during leave → cancels leave
- `usePresenceList`: ordering preserved (leaving items stay in position)
- `usePresence` ref callback → auto-done on transitionend

---

## Phase 3: `<Presence>` Component (`runtime/react/presence.tsx`)

Declarative component for the render-prop pattern.

```typescript
interface PresenceProps {
  /** Store name */
  store: string
  /** Gate condition name */
  gate: string
  /** Leave timeout in ms. Default: 300. */
  timeout?: number
  /** Render function receiving phase and done callback */
  children: (props: { phase: PresencePhase; done: () => void }) => React.ReactNode
}
```

Implementation: thin wrapper around `usePresence`.

```tsx
export function Presence({ store, gate, timeout, children }: PresenceProps) {
  const { isPresent, phase, done } = usePresence(store, gate, { timeout })
  if (!isPresent || !phase) return null
  return <>{children({ phase, done })}</>
}
```

This is deliberately simple. The `<Presence>` component is a convenience — the hook is the primary API.

### Relationship to `<Gated>`

| | `<Gated>` | `<Presence>` |
|---|---|---|
| Mount | When gate opens | When gate opens |
| Unmount | Immediately when gate closes | After leave animation completes |
| Fallback | Shows fallback content | No fallback (element fades out) |
| Use case | Auth gates, feature flags, data readiness | Modals, toasts, list items, page transitions |

Both remain in the API. Neither replaces the other.

---

## Phase 4: Export Wiring

### `runtime/core/types.ts`
Add `PresencePhase` and `PresenceRecord` types.

### `runtime/core/index.ts`
```typescript
// Presence
export { createPresenceTracker } from './presence.js'
export type { PresenceTracker, PresenceTrackerOptions } from './presence.js'
```

### `runtime/react/index.ts`
```typescript
export { Presence } from './presence.js'
export type { PresenceProps } from './presence.js'

export { usePresence, usePresenceList } from './use-presence.js'
export type {
  UsePresenceOptions,
  UsePresenceResult,
  UsePresenceListOptions,
  UsePresenceListResult,
} from './use-presence.js'
```

---

## Phase 5: Documentation Updates ✓ COMPLETE

### AGENTS.md ✓
Presence already listed in the primitives (added during implementation).

### skill/skill.md ✓
Added "Presence: Animated Lifecycle" section covering:
- When to use Presence vs Gate (comparison table)
- CSS-only animated modal pattern with timeout
- usePresence hook pattern with direct control
- Animated list items pattern with usePresenceList
- Skeleton-to-content crossfade pattern
- Presence pitfalls (timeout safety net, gates not when, don't use for auth)
- Updated primitives table (4 → 5 primitives)
- Updated decision tree with Presence branch

### integrations/claude-code/skill.md ✓
Added:
- Presence to primitives table
- Presence/usePresence/usePresenceList React usage examples
- Presence to condition classification section
- Gate vs Presence guidance

---

## Implementation Order

| Step | What | Depends On | Est. Complexity |
|------|------|-----------|----------------|
| 1 | Types in `types.ts` | — | Trivial |
| 2 | `presence.ts` core tracker | Step 1 | Medium — the sync() diff is the hardest part |
| 3 | `presence.test.ts` | Step 2 | Medium — many edge cases |
| 4 | `use-presence.ts` hooks | Steps 2 | Medium — useSyncExternalStore integration |
| 5 | `presence.tsx` component | Step 4 | Trivial — wrapper around hook |
| 6 | React tests | Steps 4-5 | Medium |
| 7 | Export wiring | Steps 2-5 | Trivial |
| 8 | Doc updates | Steps 1-7 | Low |

Total: ~5 files new, ~4 files modified, 0 breaking changes.

---

## Edge Cases & Safety

### Memory leaks
If `done()` is never called and `timeout=0`, leaving records accumulate forever. Mitigations:
- Default timeout is 300ms (not 0)
- Dev-mode warning if a record is in `leaving` for >10 seconds
- `flush()` method for manual cleanup

### React StrictMode
Effects run twice in dev. The tracker is stored in a `useRef` and `destroy()` cleans up timeouts. The ref survives the mount-unmount-remount cycle.

### SSR
On the server, all records start as `present` (no entering animation). `setTimeout` is not called. The `ref` callback is a no-op.

### Concurrent features
`useSyncExternalStore` is the subscription mechanism, which is concurrent-safe. The tracker is an external store with a `subscribe` + `getSnapshot` contract.

---

## Success Criteria

1. The sticky header bug from the companion app can be fixed with `usePresence` in a single component — no rAF hacks, no `no-transition` classes, no ref-vs-state timing games.
2. A todo list with animated add/remove works with pure CSS transitions and zero animation library dependencies.
3. Rapid toggling a modal 10 times in 100ms produces no visual glitch and no orphaned DOM nodes.
4. All existing tests continue to pass (no breaking changes).
5. The presence system is observable: an agent can read `record.phase` to understand what the UI is doing.
