# Presence Tracker Performance: Brainstorm

## How We Compare to React Ecosystem

### vs Framer Motion AnimatePresence

| | state-agent Presence | AnimatePresence |
|---|---|---|
| **Bundle** | ~0 KB additional (part of core) | 22-24 KB gzip (full), 4.6 KB (lazy) |
| **Tracking model** | Map<key, record> — state-side, observable | Key-based child diffing — component-tree-side |
| **Re-renders per enter/exit** | 0 React re-renders (state-side notify) | ~2 (AnimatePresence re-renders to register exit, then again on removal) |
| **Memory per item** | ~100 bytes (Map entry + record object) | Heavy — VisualElement instance with gesture handlers, layout measurement, spring state |
| **Rapid toggle** | Structurally race-free (cancel leave, flip to entering) | Buggy — issues #2023, #2554 (animations stuck on fast state changes) |
| **Memory leaks** | None — timer cleanup on destroy() | Yes — issue #625 (container unmount during animation leaks refs) |
| **List scaling** | Linear O(n) — 18µs at 100 items | Degrades at 50-100+ items; per-item VisualElement overhead |
| **Spring physics** | No (CSS only) | Yes (JS spring/keyframe via rAF) |
| **Layout animations** | No | Yes (but conflict with exit animations — issue #1983) |

**Verdict:** We win on correctness (race conditions), memory, and bundle. They win on physics-based animation and gesture integration. For presence tracking specifically, we're unambiguously better.

### vs React Transition Group

| | state-agent Presence | TransitionGroup |
|---|---|---|
| **Bundle** | ~0 KB additional | ~5 KB gzip |
| **Scaling** | O(n) per sync | **O(n²)** — re-renders ALL children when any child added/removed. 500 items = 48s in Chrome, 486s in Firefox (issue #599) |
| **Re-renders** | 0 (state-side) | 3-4+ per item (class state changes) |

**Verdict:** TransitionGroup has a catastrophic scaling problem we completely avoid. Not a close comparison.

### vs Raw React (useState + useEffect + setTimeout)

| | state-agent Presence | Raw React |
|---|---|---|
| **Interruption handling** | Built-in, race-free | Must be manually implemented (most devs get this wrong) |
| **Re-renders** | 0 | 2-3 per animation cycle |
| **Per-item overhead** | One Map entry | One useState + one useEffect + one setTimeout per item |
| **Correctness** | Guaranteed by tracker | Depends on developer (memory leaks if cleanup omitted, timer/animation mismatch common) |

**Verdict:** Similar performance ceiling, but we eliminate the correctness footguns that make this approach unreliable in practice. The big win is agents don't have to reason about cleanup, timers, and race conditions.

---

## Optimization Ideas for the 4 Identified Cons

### 1. Per-item lifecycle signals are expensive (~120µs for 100 items)

**Root cause:** `entered()` and `done()` each call `notify()` which builds a snapshot array and fans out to all subscribers. 100 items × 100 subscribers = 10K listener invocations.

**Ideas:**

**A. Batch API (simplest, highest impact)**
Add `enteredBatch(keys: string[])` and `doneBatch(keys: string[])` that apply all mutations first, then notify once.

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
  if (changed) notify()
}
```

Expected improvement: 100 items goes from 100 notify() calls → 1. Should drop from ~120µs to ~5µs.
Complexity: Low. Additive API, no breaking changes.

**B. Microtask coalescing (automatic batching)**
Queue phase changes and flush on `queueMicrotask`. All `entered()`/`done()` calls within the same microtask batch into one notification.

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

Expected improvement: Same as batch API but automatic — any burst of `entered()` calls within one tick coalesces.
Complexity: Medium. Changes notification timing from sync to async. Subscribers that rely on sync notification would need adjustment. Could be opt-in via `{ coalesce: true }` option.
Tradeoff: Adds ~1 microtask delay. For animations this is invisible (well under 1ms) but changes the contract.

**C. Lazy notify (skip if no subscribers)**
Skip snapshot construction entirely when `listeners.length === 0`.

```typescript
function notify(): void {
  if (listeners.length === 0) return
  // ...existing code
}
```

Expected improvement: Eliminates overhead in the common case (0 or 1 subscriber from React hook). Trivial change.
Complexity: Trivial. Should do this regardless.

**Recommendation:** Do C immediately (free), ship A as a public API, consider B as a future opt-in.

---

### 2. keyOrder array filtering — O(n) per removal

**Root cause:** `removeRecord()` does `keyOrder = keyOrder.filter(k => k !== key)` which scans the full array for every removal. During `flush()` with 100 leaving items, that's 100 × 100 = 10K iterations.

**Ideas:**

**A. Index set with rebuild-on-access (best balance)**
Track a `deletedKeys: Set<string>` instead of filtering immediately. Rebuild `keyOrder` lazily when `getOrderedRecords()` is called.

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
  // ...existing iteration
}
```

Expected improvement: `flush()` of 100 items goes from 100 filter passes (O(n²)) → 1 filter pass (O(n)). But `flush()` calls `notify()` per removal, so combine with idea 1A (batch).
Complexity: Low. Internal-only change.

**B. Doubly-linked list for key ordering**
Replace `keyOrder: string[]` with a linked list. O(1) removal per item.

```typescript
interface OrderNode { key: string; prev: OrderNode | null; next: OrderNode | null }
const orderNodes = new Map<string, OrderNode>()
let orderHead: OrderNode | null = null
let orderTail: OrderNode | null = null
```

Expected improvement: Removal is O(1) always. Iteration for `getOrderedRecords()` is still O(n) but avoids allocation of intermediate arrays.
Complexity: Medium. More code, harder to reason about. Overkill for current scale.

**C. Batch removal in flush()**
Instead of calling `removeRecord()` in a loop (which filters `keyOrder` each time), do a single set-based removal:

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
  notify()
}

```

Expected improvement: `flush()` drops from O(n²) to O(n) with one filter pass and one notify. No API change.
Complexity: Low. Localized change to `flush()`.

**Recommendation:** Do C immediately (flush-specific fix), then A for general case. Skip B — linked lists aren't worth the complexity at this scale.

---

### 3. No memoization on sync

**Root cause:** Every `sync()` call iterates all `next` items to build a Set, then iterates all existing records for the three-way diff, even if the input array hasn't changed.

**Ideas:**

**A. Reference equality check (cheapest memoization)**
Cache the last `next` array reference. If `next === lastNext`, skip the diff entirely.

```typescript
let lastNextRef: T[] | null = null
let lastNextKeySet: Set<string> | null = null

function sync(next: T[], keyFn: (item: T) => string): PresenceRecord<T>[] {
  if (next === lastNextRef) return getOrderedRecords()
  lastNextRef = next
  // ...existing diff logic
}
```

Expected improvement: When React re-renders but the source array hasn't changed (same reference), sync becomes O(1). This is the common case with `useSyncExternalStore` — the store hasn't changed, so the selector returns the same array reference.
Complexity: Trivial. One `===` check.
Tradeoff: Only works when the reference is identical. New array with same contents still does the full diff. This is fine — React hooks that create new arrays every render are already an anti-pattern.

**B. Content hash memoization**
Hash the keys of the `next` array and compare with the last hash. Skip diff if keys haven't changed.

```typescript
let lastKeyHash = ''

function sync(next: T[], keyFn: (item: T) => string): PresenceRecord<T>[] {
  const keys = next.map(keyFn)
  const hash = keys.join('\0')
  if (hash === lastKeyHash) {
    // Keys same — still need to update values for present items
    // but can skip add/remove logic
    return updateValuesOnly(next, keyFn)
  }
  lastKeyHash = hash
  // ...full diff
}
```

Expected improvement: Avoids the add/remove logic when only values change (common in list animations where items shuffle content but membership is stable).
Complexity: Medium. The `join()` itself is O(n) and allocates, so the savings are marginal unless the diff is significantly more expensive. For 100 items, `join()` is ~1µs — saving ~17µs of diff is worth it.
Tradeoff: String joining allocates. Could use a length + first/last key check as a cheaper heuristic.

**C. Generation counter (structural sharing)**
Track a `generation` number on the tracker. Increment on every mutation. Sync callers can cache `[generation, result]` and skip if generation hasn't changed.

```typescript
let generation = 0

function sync(...): PresenceRecord<T>[] {
  // ...if changed...
  generation++
  notify()
  return getOrderedRecords()
}

// External use:
let cachedGen = -1
let cachedResult: PresenceRecord<T>[]
function memoizedSync(next, keyFn) {
  if (tracker.generation === cachedGen) return cachedResult
  cachedResult = tracker.sync(next, keyFn)
  cachedGen = tracker.generation
  return cachedResult
}
```

Expected improvement: Useful for React hooks where `useSyncExternalStore` calls `getSnapshot()` frequently. The hook can check generation before calling sync.
Complexity: Low. Expose `generation` as a read-only property.

**Recommendation:** Do A immediately (reference check is free). Expose generation counter (C) for hook-level memoization. Skip B — the heuristic complexity isn't worth ~15µs savings.

---

### 4. Subscriber notification allocates snapshot arrays

**Root cause:** `getOrderedRecords()` creates a new array every call. With 100 items and 100 subscribers, that's 10K array items allocated per notification cycle.

**Ideas:**

**A. Cached snapshot with dirty flag**
Only rebuild the snapshot when the records have changed. Reuse the same array reference otherwise.

```typescript
let cachedSnapshot: PresenceRecord<T>[] | null = null
let snapshotDirty = true

function invalidateSnapshot(): void {
  cachedSnapshot = null
  snapshotDirty = true
}

function getOrderedRecords(): PresenceRecord<T>[] {
  if (!snapshotDirty && cachedSnapshot) return cachedSnapshot
  const result: PresenceRecord<T>[] = []
  for (const key of keyOrder) {
    const record = recordMap.get(key)
    if (record) result.push(record)
  }
  cachedSnapshot = result
  snapshotDirty = false
  return result
}

// Call invalidateSnapshot() in sync(), entered(), done(), removeRecord()
```

Expected improvement: All subscribers in a single notify() call receive the same array reference. 100 subscribers × 1 array = 1 allocation instead of 100. Also makes `records()` free after the first call.
Complexity: Low. Internal-only. Must ensure the cached array is never mutated externally (it's already a new array of immutable records, so this is safe).
Tradeoff: Subscribers who modify the received array would corrupt the cache. But the records are { ...spread } copies already, so this is extremely unlikely. Could freeze in dev mode.

**B. Notify with generation instead of snapshot**
Instead of passing the snapshot to subscribers, pass a generation number. Subscribers call `records()` themselves only if they need the data.

```typescript
type Listener = (generation: number) => void

function notify(): void {
  generation++
  cachedSnapshot = null
  for (const listener of listeners) {
    listener(generation)
  }
}
```

Expected improvement: Zero allocations during notify. Subscribers that don't need the full list (e.g., a hook that only checks `phase` of one item) can skip the snapshot entirely.
Complexity: Medium. Changes the subscriber contract (breaking change for external consumers of `subscribe()`). Could be a separate `onChanged(callback)` API alongside the existing `subscribe()`.

**C. Object pool for records**
Pre-allocate a pool of PresenceRecord objects and reuse them instead of spreading new objects on every phase change.

Expected improvement: Reduces GC pressure for high-frequency updates.
Complexity: High. Object pooling in JS is error-prone and the records are small. Not worth it at current scale.

**Recommendation:** Do A immediately (high impact, low complexity). Consider B as an advanced API for performance-critical consumers. Skip C.

---

## Priority Matrix

| Fix | Impact | Complexity | Breaking? | Do When? |
|-----|--------|-----------|-----------|----------|
| Lazy notify (1C) | Low-medium | Trivial | No | Now |
| Reference equality sync check (3A) | Medium | Trivial | No | Now |
| Cached snapshot (4A) | Medium | Low | No | Now |
| Batch flush (2C) | Medium | Low | No | Now |
| Batch API — enteredBatch/doneBatch (1A) | High | Low | No (additive) | Next release |
| Generation counter (3C) | Medium | Low | No (additive) | Next release |
| Index set with lazy rebuild (2A) | Medium | Low | No | Next release |
| Microtask coalescing (1B) | High | Medium | Opt-in | Future |
| Generation-only notify (4B) | Medium | Medium | Yes (or additive) | Future |
| Linked list ordering (2B) | Low | Medium | No | Never (overkill) |
| Object pool (4C) | Low | High | No | Never |

## Quick Wins (do now, ~30 min total)

1. **Lazy notify** — `if (listeners.length === 0) return` at top of `notify()`
2. **Reference equality** — `if (next === lastNextRef) return getOrderedRecords()` at top of `sync()`
3. **Cached snapshot** — dirty-flag on `getOrderedRecords()`, invalidate on mutation
4. **Batch flush** — single `keyOrder.filter()` + single `notify()` in `flush()`

Expected combined improvement: `entered()` 100 items with 0 subscribers goes from 120µs → ~5µs. `flush()` 100 items goes from O(n²) → O(n). Sync with unchanged input becomes O(1).

## Non-goals

- **Spring physics / JS interpolation** — Not our problem. CSS handles the visual animation. We track lifecycle.
- **Competing with Framer Motion on features** — We compete on correctness, predictability, and agent-friendliness.
- **Sub-microsecond presence** — When/Gate are 15-24ns because they're pure boolean evaluation. Presence is fundamentally heavier (keyed record management). 2-20µs is the right ballpark.
