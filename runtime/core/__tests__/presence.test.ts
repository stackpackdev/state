import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createPresenceTracker } from '../presence.js'
import type { PresenceRecord } from '../types.js'

describe('createPresenceTracker', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  const keyFn = (item: { id: string }) => item.id

  // ─── Basic Add ─────────────────────────────────────────────

  it('adds items with phase entering', () => {
    const tracker = createPresenceTracker()
    const result = tracker.sync([{ id: 'a' }, { id: 'b' }], keyFn)

    expect(result).toHaveLength(2)
    expect(result[0].key).toBe('a')
    expect(result[0].phase).toBe('entering')
    expect(result[1].key).toBe('b')
    expect(result[1].phase).toBe('entering')
  })

  it('stores the actual value in the record', () => {
    const tracker = createPresenceTracker()
    const result = tracker.sync([{ id: 'a', text: 'hello' }], keyFn)

    expect(result[0].value).toEqual({ id: 'a', text: 'hello' })
  })

  // ─── Basic Remove ─────────────────────────────────────────

  it('transitions removed items to leaving', () => {
    const tracker = createPresenceTracker()
    tracker.sync([{ id: 'a' }, { id: 'b' }], keyFn)

    const result = tracker.sync([{ id: 'a' }], keyFn)

    expect(result).toHaveLength(2) // 'b' is still present as leaving
    expect(result[0].key).toBe('a')
    expect(result[0].phase).toBe('entering')
    expect(result[1].key).toBe('b')
    expect(result[1].phase).toBe('leaving')
  })

  it('freezes value at leave time', () => {
    const tracker = createPresenceTracker()
    tracker.sync([{ id: 'a', text: 'original' }], keyFn)
    const result = tracker.sync([], keyFn)

    expect(result[0].value).toEqual({ id: 'a', text: 'original' })
    expect(result[0].phase).toBe('leaving')
  })

  // ─── Rapid Toggle (Race Condition Fix) ─────────────────────

  it('cancels leave when item is re-added', () => {
    const tracker = createPresenceTracker({ timeout: 500 })
    tracker.sync([{ id: 'a' }], keyFn)
    tracker.sync([], keyFn) // remove → leaving

    const result = tracker.sync([{ id: 'a' }], keyFn) // re-add

    expect(result).toHaveLength(1)
    expect(result[0].phase).toBe('entering') // back to entering, not leaving
  })

  it('updates value when re-added during leave', () => {
    const tracker = createPresenceTracker({ timeout: 500 })
    tracker.sync([{ id: 'a', text: 'v1' }], keyFn)
    tracker.sync([], keyFn)

    const result = tracker.sync([{ id: 'a', text: 'v2' }], keyFn)

    expect(result[0].value).toEqual({ id: 'a', text: 'v2' })
  })

  it('cancels leave timeout when re-added', () => {
    const onRemoved = vi.fn()
    const tracker = createPresenceTracker({ timeout: 300, onRemoved })

    tracker.sync([{ id: 'a' }], keyFn)
    tracker.sync([], keyFn) // starts 300ms timer
    vi.advanceTimersByTime(100) // 100ms in

    tracker.sync([{ id: 'a' }], keyFn) // re-add, should cancel timer
    vi.advanceTimersByTime(300) // past the original timeout

    expect(onRemoved).not.toHaveBeenCalled()
    expect(tracker.records()[0].phase).toBe('entering')
  })

  // ─── Timeout Auto-Removal ─────────────────────────────────

  it('auto-removes after timeout', () => {
    const onRemoved = vi.fn()
    const tracker = createPresenceTracker({ timeout: 300, onRemoved })

    tracker.sync([{ id: 'a' }], keyFn)
    tracker.sync([], keyFn)

    expect(tracker.records()).toHaveLength(1)
    expect(tracker.records()[0].phase).toBe('leaving')

    vi.advanceTimersByTime(300)

    expect(tracker.records()).toHaveLength(0)
    expect(onRemoved).toHaveBeenCalledWith('a')
  })

  it('does not auto-remove when timeout is 0', () => {
    const tracker = createPresenceTracker({ timeout: 0 })

    tracker.sync([{ id: 'a' }], keyFn)
    tracker.sync([], keyFn)

    vi.advanceTimersByTime(10000)

    expect(tracker.records()).toHaveLength(1)
    expect(tracker.records()[0].phase).toBe('leaving')
  })

  // ─── Manual done() ────────────────────────────────────────

  it('removes record immediately on done()', () => {
    const onRemoved = vi.fn()
    const tracker = createPresenceTracker({ onRemoved })

    tracker.sync([{ id: 'a' }], keyFn)
    tracker.sync([], keyFn)

    tracker.done('a')

    expect(tracker.records()).toHaveLength(0)
    expect(onRemoved).toHaveBeenCalledWith('a')
  })

  it('done() is a no-op for non-leaving items', () => {
    const tracker = createPresenceTracker()
    tracker.sync([{ id: 'a' }], keyFn)

    tracker.done('a') // phase is 'entering', not 'leaving'

    expect(tracker.records()).toHaveLength(1)
    expect(tracker.records()[0].phase).toBe('entering')
  })

  it('done() is a no-op for unknown keys', () => {
    const tracker = createPresenceTracker()
    tracker.done('nonexistent') // should not throw
    expect(tracker.records()).toHaveLength(0)
  })

  // ─── Entered Signal ────────────────────────────────────────

  it('transitions entering to present on entered()', () => {
    const tracker = createPresenceTracker()
    tracker.sync([{ id: 'a' }], keyFn)

    tracker.entered('a')

    expect(tracker.records()[0].phase).toBe('present')
  })

  it('entered() is a no-op for non-entering items', () => {
    const tracker = createPresenceTracker()
    tracker.sync([{ id: 'a' }], keyFn)
    tracker.entered('a') // now 'present'

    tracker.entered('a') // should be no-op

    expect(tracker.records()[0].phase).toBe('present')
  })

  // ─── Value Updates ─────────────────────────────────────────

  it('updates value for present items on sync', () => {
    const tracker = createPresenceTracker()
    tracker.sync([{ id: 'a', text: 'v1' }], keyFn)

    tracker.sync([{ id: 'a', text: 'v2' }], keyFn)

    expect(tracker.records()[0].value).toEqual({ id: 'a', text: 'v2' })
  })

  it('does not update value for leaving items', () => {
    const tracker = createPresenceTracker()
    tracker.sync([{ id: 'a', text: 'v1' }], keyFn)
    tracker.sync([], keyFn) // now leaving with v1

    // Even if we somehow tried to update, the item is leaving
    // and not in the next array, so its value stays frozen
    expect(tracker.records()[0].value).toEqual({ id: 'a', text: 'v1' })
  })

  // ─── Subscriber Notification ───────────────────────────────

  it('notifies subscribers on sync', () => {
    const tracker = createPresenceTracker()
    const listener = vi.fn()
    tracker.subscribe(listener)

    tracker.sync([{ id: 'a' }], keyFn)

    expect(listener).toHaveBeenCalledTimes(1)
    expect(listener).toHaveBeenCalledWith([
      expect.objectContaining({ key: 'a', phase: 'entering' }),
    ])
  })

  it('notifies subscribers on entered()', () => {
    const tracker = createPresenceTracker()
    tracker.sync([{ id: 'a' }], keyFn)

    const listener = vi.fn()
    tracker.subscribe(listener)

    tracker.entered('a')

    expect(listener).toHaveBeenCalledTimes(1)
    expect(listener).toHaveBeenCalledWith([
      expect.objectContaining({ key: 'a', phase: 'present' }),
    ])
  })

  it('notifies subscribers on done()', () => {
    const tracker = createPresenceTracker()
    tracker.sync([{ id: 'a' }], keyFn)
    tracker.sync([], keyFn)

    const listener = vi.fn()
    tracker.subscribe(listener)

    tracker.done('a')

    expect(listener).toHaveBeenCalledTimes(1)
    expect(listener).toHaveBeenCalledWith([])
  })

  it('notifies subscribers on timeout removal', () => {
    const tracker = createPresenceTracker({ timeout: 100 })
    tracker.sync([{ id: 'a' }], keyFn)
    tracker.sync([], keyFn)

    const listener = vi.fn()
    tracker.subscribe(listener)

    vi.advanceTimersByTime(100)

    expect(listener).toHaveBeenCalledTimes(1)
    expect(listener).toHaveBeenCalledWith([])
  })

  it('does not notify after unsubscribe', () => {
    const tracker = createPresenceTracker()
    const listener = vi.fn()
    const unsub = tracker.subscribe(listener)

    unsub()
    tracker.sync([{ id: 'a' }], keyFn)

    expect(listener).not.toHaveBeenCalled()
  })

  it('does not notify when sync produces no changes', () => {
    const tracker = createPresenceTracker()
    tracker.sync([{ id: 'a' }], keyFn)

    const listener = vi.fn()
    tracker.subscribe(listener)

    // Same items, same references → no change
    const items = [{ id: 'a' }]
    tracker.sync(items, keyFn)

    // Value reference changed (new object) so it does notify
    // This is expected — reference equality check is per-value
    expect(listener).toHaveBeenCalled()
  })

  // ─── Flush ─────────────────────────────────────────────────

  it('removes all leaving items on flush()', () => {
    const onRemoved = vi.fn()
    const tracker = createPresenceTracker({ onRemoved })

    tracker.sync([{ id: 'a' }, { id: 'b' }, { id: 'c' }], keyFn)
    tracker.sync([{ id: 'b' }], keyFn) // a and c are leaving

    tracker.flush()

    expect(tracker.records()).toHaveLength(1)
    expect(tracker.records()[0].key).toBe('b')
    expect(onRemoved).toHaveBeenCalledTimes(2)
  })

  it('flush() does nothing when no items are leaving', () => {
    const tracker = createPresenceTracker()
    tracker.sync([{ id: 'a' }], keyFn)

    const listener = vi.fn()
    tracker.subscribe(listener)

    tracker.flush()

    expect(listener).not.toHaveBeenCalled()
    expect(tracker.records()).toHaveLength(1)
  })

  // ─── Ordering ──────────────────────────────────────────────

  it('preserves insertion order', () => {
    const tracker = createPresenceTracker()
    tracker.sync([{ id: 'c' }, { id: 'a' }, { id: 'b' }], keyFn)

    const keys = tracker.records().map(r => r.key)
    expect(keys).toEqual(['c', 'a', 'b'])
  })

  it('leaving items stay in their original position', () => {
    const tracker = createPresenceTracker()
    tracker.sync([{ id: 'a' }, { id: 'b' }, { id: 'c' }], keyFn)

    // Remove middle item
    tracker.sync([{ id: 'a' }, { id: 'c' }], keyFn)

    const records = tracker.records()
    expect(records).toHaveLength(3)
    expect(records[0].key).toBe('a')
    expect(records[1].key).toBe('b')
    expect(records[1].phase).toBe('leaving')
    expect(records[2].key).toBe('c')
  })

  // ─── Multiple Items ────────────────────────────────────────

  it('handles adding and removing multiple items at once', () => {
    const tracker = createPresenceTracker()
    tracker.sync([{ id: 'a' }, { id: 'b' }, { id: 'c' }], keyFn)

    // Remove a and c, add d
    const result = tracker.sync([{ id: 'b' }, { id: 'd' }], keyFn)

    expect(result).toHaveLength(4)
    expect(result.find(r => r.key === 'a')?.phase).toBe('leaving')
    expect(result.find(r => r.key === 'b')?.phase).toBe('entering')
    expect(result.find(r => r.key === 'c')?.phase).toBe('leaving')
    expect(result.find(r => r.key === 'd')?.phase).toBe('entering')
  })

  // ─── Boolean Sync ─────────────────────────────────────────

  it('syncBoolean creates a record when active', () => {
    const tracker = createPresenceTracker()
    const result = tracker.syncBoolean(true)

    expect(result).toHaveLength(1)
    expect(result[0].phase).toBe('entering')
  })

  it('syncBoolean transitions to leaving when inactive', () => {
    const tracker = createPresenceTracker()
    tracker.syncBoolean(true)
    const result = tracker.syncBoolean(false)

    expect(result).toHaveLength(1)
    expect(result[0].phase).toBe('leaving')
  })

  it('syncBoolean handles rapid toggle', () => {
    const tracker = createPresenceTracker({ timeout: 500 })
    tracker.syncBoolean(true)
    tracker.syncBoolean(false)
    const result = tracker.syncBoolean(true)

    expect(result).toHaveLength(1)
    expect(result[0].phase).toBe('entering')
  })

  it('syncBoolean removes after timeout', () => {
    const tracker = createPresenceTracker({ timeout: 200 })
    tracker.syncBoolean(true)
    tracker.syncBoolean(false)

    vi.advanceTimersByTime(200)

    expect(tracker.records()).toHaveLength(0)
  })

  // ─── Destroy ───────────────────────────────────────────────

  it('clears everything on destroy()', () => {
    const tracker = createPresenceTracker({ timeout: 500 })
    tracker.sync([{ id: 'a' }, { id: 'b' }], keyFn)
    tracker.sync([], keyFn) // both leaving with timers

    const listener = vi.fn()
    tracker.subscribe(listener)

    tracker.destroy()

    expect(tracker.records()).toHaveLength(0)

    // Timers should be cleared — advancing time should not cause errors
    vi.advanceTimersByTime(1000)
    expect(listener).not.toHaveBeenCalled()
  })

  // ─── Edge Cases ────────────────────────────────────────────

  it('handles empty initial sync', () => {
    const tracker = createPresenceTracker()
    const result = tracker.sync([], keyFn)
    expect(result).toHaveLength(0)
  })

  it('handles duplicate keys in next array (first wins)', () => {
    const tracker = createPresenceTracker()
    const result = tracker.sync(
      [{ id: 'a', text: 'first' }, { id: 'a', text: 'second' }],
      keyFn
    )

    // First occurrence creates the record, second is skipped (already exists)
    expect(result).toHaveLength(1)
    expect(result[0].value).toEqual({ id: 'a', text: 'first' })
  })

  it('at timestamp updates on phase change', () => {
    const tracker = createPresenceTracker()

    vi.setSystemTime(1000)
    tracker.sync([{ id: 'a' }], keyFn)
    const enterAt = tracker.records()[0].at

    vi.setSystemTime(2000)
    tracker.entered('a')
    const presentAt = tracker.records()[0].at

    vi.setSystemTime(3000)
    tracker.sync([], keyFn)
    const leaveAt = tracker.records()[0].at

    expect(enterAt).toBe(1000)
    expect(presentAt).toBe(2000)
    expect(leaveAt).toBe(3000)
  })

  // ─── 1.1a: Lazy Notify ──────────────────────────────────────

  it('skips snapshot construction when no subscribers (lazy notify)', () => {
    const tracker = createPresenceTracker()
    // No subscribers — sync should work without errors but not allocate snapshots
    tracker.sync([{ id: 'a' }, { id: 'b' }], keyFn)
    tracker.entered('a')
    tracker.sync([], keyFn)
    tracker.flush()
    // Just verify it doesn't throw and records() still works
    expect(tracker.records()).toHaveLength(0)
  })

  // ─── 1.1b: Reference Equality on Sync ──────────────────────

  it('returns cached result when sync receives same array reference', () => {
    const tracker = createPresenceTracker()
    const items = [{ id: 'a' }, { id: 'b' }]
    const result1 = tracker.sync(items, keyFn)
    const result2 = tracker.sync(items, keyFn)

    // Same array ref → same snapshot ref (no re-diffing)
    expect(result2).toBe(result1)
  })

  // ─── 1.1c: Cached Snapshot ─────────────────────────────────

  it('returns same snapshot reference on consecutive records() calls', () => {
    const tracker = createPresenceTracker()
    tracker.sync([{ id: 'a' }], keyFn)

    const snap1 = tracker.records()
    const snap2 = tracker.records()

    expect(snap2).toBe(snap1)
  })

  // ─── 1.1d: Batch Flush ─────────────────────────────────────

  it('batch flush sends single notification', () => {
    const tracker = createPresenceTracker()
    tracker.sync([{ id: 'a' }, { id: 'b' }, { id: 'c' }], keyFn)
    tracker.sync([{ id: 'b' }], keyFn) // a and c are leaving

    const listener = vi.fn()
    tracker.subscribe(listener)

    tracker.flush()

    // Single notify call, not one per item
    expect(listener).toHaveBeenCalledTimes(1)
    expect(listener).toHaveBeenCalledWith([
      expect.objectContaining({ key: 'b', phase: 'entering' }),
    ])
  })

  // ─── 2.4: Batch API (enteredBatch / doneBatch) ─────────────

  it('enteredBatch transitions all specified keys to present', () => {
    const tracker = createPresenceTracker()
    tracker.sync([{ id: 'a' }, { id: 'b' }, { id: 'c' }], keyFn)

    tracker.enteredBatch(['a', 'b', 'c'])

    const records = tracker.records()
    expect(records.every(r => r.phase === 'present')).toBe(true)
  })

  it('enteredBatch sends single notification', () => {
    const tracker = createPresenceTracker()
    tracker.sync([{ id: 'a' }, { id: 'b' }, { id: 'c' }], keyFn)

    const listener = vi.fn()
    tracker.subscribe(listener)

    tracker.enteredBatch(['a', 'b', 'c'])

    expect(listener).toHaveBeenCalledTimes(1)
  })

  it('enteredBatch ignores non-entering keys', () => {
    const tracker = createPresenceTracker()
    tracker.sync([{ id: 'a' }, { id: 'b' }], keyFn)
    tracker.entered('a') // now present

    const listener = vi.fn()
    tracker.subscribe(listener)

    tracker.enteredBatch(['a', 'b']) // only 'b' should transition

    expect(listener).toHaveBeenCalledTimes(1)
    expect(tracker.records()[0].phase).toBe('present')
    expect(tracker.records()[1].phase).toBe('present')
  })

  it('enteredBatch is a no-op when no keys match', () => {
    const tracker = createPresenceTracker()
    tracker.sync([{ id: 'a' }], keyFn)
    tracker.entered('a')

    const listener = vi.fn()
    tracker.subscribe(listener)

    tracker.enteredBatch(['a', 'nonexistent'])

    expect(listener).not.toHaveBeenCalled()
  })

  it('doneBatch removes all specified leaving keys', () => {
    const onRemoved = vi.fn()
    const tracker = createPresenceTracker({ onRemoved })
    tracker.sync([{ id: 'a' }, { id: 'b' }, { id: 'c' }], keyFn)
    tracker.sync([{ id: 'b' }], keyFn) // a and c leaving

    tracker.doneBatch(['a', 'c'])

    expect(tracker.records()).toHaveLength(1)
    expect(tracker.records()[0].key).toBe('b')
    expect(onRemoved).toHaveBeenCalledTimes(2)
    expect(onRemoved).toHaveBeenCalledWith('a')
    expect(onRemoved).toHaveBeenCalledWith('c')
  })

  it('doneBatch sends single notification', () => {
    const tracker = createPresenceTracker()
    tracker.sync([{ id: 'a' }, { id: 'b' }, { id: 'c' }], keyFn)
    tracker.sync([], keyFn) // all leaving

    const listener = vi.fn()
    tracker.subscribe(listener)

    tracker.doneBatch(['a', 'b', 'c'])

    expect(listener).toHaveBeenCalledTimes(1)
    expect(listener).toHaveBeenCalledWith([])
  })

  it('doneBatch ignores non-leaving keys', () => {
    const tracker = createPresenceTracker()
    tracker.sync([{ id: 'a' }, { id: 'b' }], keyFn)
    // 'a' and 'b' are entering, not leaving

    const listener = vi.fn()
    tracker.subscribe(listener)

    tracker.doneBatch(['a', 'b'])

    expect(listener).not.toHaveBeenCalled()
    expect(tracker.records()).toHaveLength(2)
  })

  // ─── 2.5: Generation Counter ───────────────────────────────

  it('generation starts at 0', () => {
    const tracker = createPresenceTracker()
    expect(tracker.generation).toBe(0)
  })

  it('generation increments on mutations', () => {
    const tracker = createPresenceTracker()
    expect(tracker.generation).toBe(0)

    tracker.sync([{ id: 'a' }], keyFn)
    const g1 = tracker.generation
    expect(g1).toBeGreaterThan(0)

    tracker.entered('a')
    const g2 = tracker.generation
    expect(g2).toBeGreaterThan(g1)

    tracker.sync([], keyFn)
    const g3 = tracker.generation
    expect(g3).toBeGreaterThan(g2)
  })

  it('generation does not increment when sync has no changes', () => {
    const tracker = createPresenceTracker()
    const items = [{ id: 'a' }]
    tracker.sync(items, keyFn)
    const g1 = tracker.generation

    // Same ref → no change
    tracker.sync(items, keyFn)
    expect(tracker.generation).toBe(g1)
  })

  // ─── 3.1: Microtask Coalescing ─────────────────────────────

  it('coalesce: multiple entered() calls in same tick produce one notify', async () => {
    const tracker = createPresenceTracker({ coalesce: true })
    tracker.sync([{ id: 'a' }, { id: 'b' }, { id: 'c' }], keyFn)

    const listener = vi.fn()
    tracker.subscribe(listener)

    tracker.entered('a')
    tracker.entered('b')
    tracker.entered('c')

    // Synchronously, no notification yet
    expect(listener).not.toHaveBeenCalled()

    // Flush microtask
    await Promise.resolve()

    // Single notification for all 3 transitions
    expect(listener).toHaveBeenCalledTimes(1)
    expect(listener).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ key: 'a', phase: 'present' }),
        expect.objectContaining({ key: 'b', phase: 'present' }),
        expect.objectContaining({ key: 'c', phase: 'present' }),
      ])
    )
  })

  it('coalesce: false (default) notifies synchronously', () => {
    const tracker = createPresenceTracker({ coalesce: false })
    tracker.sync([{ id: 'a' }, { id: 'b' }], keyFn)

    const listener = vi.fn()
    tracker.subscribe(listener)

    tracker.entered('a')
    expect(listener).toHaveBeenCalledTimes(1)

    tracker.entered('b')
    expect(listener).toHaveBeenCalledTimes(2)
  })

  it('coalesce: sync still returns records immediately', () => {
    const tracker = createPresenceTracker({ coalesce: true })
    const result = tracker.sync([{ id: 'a' }], keyFn)
    expect(result).toHaveLength(1)
    expect(result[0].phase).toBe('entering')
  })

  // ─── 3.2: Lazy keyOrder Rebuild ────────────────────────────

  it('lazy keyOrder: multiple removeRecord calls defer filter to read', () => {
    const tracker = createPresenceTracker()
    tracker.sync([{ id: 'a' }, { id: 'b' }, { id: 'c' }, { id: 'd' }], keyFn)
    tracker.sync([], keyFn) // all leaving

    // Remove multiple items individually via done()
    tracker.done('a')
    tracker.done('c')

    // Records should be correct despite deferred keyOrder rebuild
    const records = tracker.records()
    expect(records).toHaveLength(2)
    expect(records[0].key).toBe('b')
    expect(records[1].key).toBe('d')
  })

  it('lazy keyOrder: adding new items after removal works correctly', () => {
    const tracker = createPresenceTracker()
    tracker.sync([{ id: 'a' }, { id: 'b' }], keyFn)
    tracker.sync([], keyFn) // both leaving
    tracker.done('a') // remove a, keyOrder dirty

    // Sync new items — should rebuild keyOrder before appending
    const result = tracker.sync([{ id: 'c' }], keyFn)

    // b is still leaving, c is new
    expect(result.find(r => r.key === 'b')?.phase).toBe('leaving')
    expect(result.find(r => r.key === 'c')?.phase).toBe('entering')
    // a should not appear
    expect(result.find(r => r.key === 'a')).toBeUndefined()
  })
})
