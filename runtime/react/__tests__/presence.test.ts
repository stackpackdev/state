// Integration tests for presence hooks
// Tests the contract between stores, presence tracker, and React bindings
// without requiring a DOM renderer (no @testing-library/react needed).

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createStore, storeRegistry, createHumanActor } from '../../core/index.js'
import { createPresenceTracker } from '../../core/presence.js'
import { z } from 'zod'

const actor = createHumanActor('test')

beforeEach(() => {
  storeRegistry.clear()
})

afterEach(() => {
  storeRegistry.clear()
  vi.useRealTimers()
})

describe('Presence + Store integration', () => {
  // ─── Single-item (boolean gate) ──────────────────────────

  describe('boolean gate presence', () => {
    it('tracks a gate opening and closing', () => {
      const store = createStore({
        name: 'modal',
        initial: { isOpen: false },
        stateSchema: z.object({ isOpen: z.boolean() }),
        gates: { isOpen: (s: any) => s.isOpen },
      })

      const tracker = createPresenceTracker<boolean>({ timeout: 300 })

      // Gate is closed
      tracker.syncBoolean(store.isGated('isOpen') as boolean)
      expect(tracker.records()).toHaveLength(0)

      // Open gate
      store.set('isOpen', true, actor)
      tracker.syncBoolean(store.isGated('isOpen') as boolean)

      expect(tracker.records()).toHaveLength(1)
      expect(tracker.records()[0].phase).toBe('entering')

      // Close gate → leaving (not removed)
      store.set('isOpen', false, actor)
      tracker.syncBoolean(store.isGated('isOpen') as boolean)

      expect(tracker.records()).toHaveLength(1)
      expect(tracker.records()[0].phase).toBe('leaving')

      // Signal done → removed
      tracker.done('__presence__')
      expect(tracker.records()).toHaveLength(0)

      tracker.destroy()
      store.destroy()
    })

    it('handles rapid open/close/open without orphaned state', () => {
      vi.useFakeTimers()

      const store = createStore({
        name: 'modal',
        initial: { isOpen: false },
        stateSchema: z.object({ isOpen: z.boolean() }),
        gates: { isOpen: (s: any) => s.isOpen },
      })

      const tracker = createPresenceTracker<boolean>({ timeout: 500 })

      // Open
      store.set('isOpen', true, actor)
      tracker.syncBoolean(store.isGated('isOpen') as boolean)
      expect(tracker.records()[0].phase).toBe('entering')

      // Close → leaving
      store.set('isOpen', false, actor)
      tracker.syncBoolean(store.isGated('isOpen') as boolean)
      expect(tracker.records()[0].phase).toBe('leaving')

      // Re-open before timeout → back to entering
      store.set('isOpen', true, actor)
      tracker.syncBoolean(store.isGated('isOpen') as boolean)
      expect(tracker.records()[0].phase).toBe('entering')

      // Advance past original timeout — should NOT remove since leave was cancelled
      vi.advanceTimersByTime(600)
      expect(tracker.records()).toHaveLength(1)
      expect(tracker.records()[0].phase).toBe('entering')

      tracker.destroy()
      store.destroy()
    })
  })

  // ─── List presence ──────────────────────────────────────────

  describe('list item presence', () => {
    const todoSchema = z.object({
      items: z.array(z.object({
        id: z.string(),
        text: z.string(),
      })),
    })

    const keyFn = (item: { id: string }) => item.id

    it('tracks items entering and leaving', () => {
      const store = createStore({
        name: 'todos',
        initial: { items: [] },
        stateSchema: todoSchema,
      })

      const tracker = createPresenceTracker({ timeout: 250 })

      // Add items
      store.set('items', [
        { id: '1', text: 'Buy milk' },
        { id: '2', text: 'Walk dog' },
      ], actor)

      const items = store.get<any[]>('items')!
      tracker.sync(items, keyFn)

      expect(tracker.records()).toHaveLength(2)
      expect(tracker.records()[0].phase).toBe('entering')
      expect(tracker.records()[1].phase).toBe('entering')

      // Remove item 1
      store.set('items', [{ id: '2', text: 'Walk dog' }], actor)
      tracker.sync(store.get<any[]>('items')!, keyFn)

      const records = tracker.records()
      expect(records).toHaveLength(2)

      const item1 = records.find(r => r.key === '1')!
      const item2 = records.find(r => r.key === '2')!
      expect(item1.phase).toBe('leaving')
      expect(item1.value).toEqual({ id: '1', text: 'Buy milk' }) // frozen
      expect(item2.phase).toBe('entering')

      tracker.destroy()
      store.destroy()
    })

    it('preserves order with leaving items in original position', () => {
      const store = createStore({
        name: 'todos',
        initial: {
          items: [
            { id: '1', text: 'A' },
            { id: '2', text: 'B' },
            { id: '3', text: 'C' },
          ],
        },
        stateSchema: todoSchema,
      })

      const tracker = createPresenceTracker()

      // Initial sync
      tracker.sync(store.get<any[]>('items')!, keyFn)

      // Remove middle item
      store.set('items', [
        { id: '1', text: 'A' },
        { id: '3', text: 'C' },
      ], actor)
      tracker.sync(store.get<any[]>('items')!, keyFn)

      const keys = tracker.records().map(r => r.key)
      expect(keys).toEqual(['1', '2', '3']) // '2' stays in position
      expect(tracker.records()[1].phase).toBe('leaving')

      tracker.destroy()
      store.destroy()
    })

    it('handles re-adding a removed item', () => {
      vi.useFakeTimers()

      const store = createStore({
        name: 'todos',
        initial: { items: [{ id: '1', text: 'A' }] },
        stateSchema: todoSchema,
      })

      const tracker = createPresenceTracker({ timeout: 500 })

      // Initial sync
      tracker.sync(store.get<any[]>('items')!, keyFn)

      // Remove
      store.set('items', [], actor)
      tracker.sync(store.get<any[]>('items')!, keyFn)
      expect(tracker.records()[0].phase).toBe('leaving')

      // Re-add with updated text
      store.set('items', [{ id: '1', text: 'Updated' }], actor)
      tracker.sync(store.get<any[]>('items')!, keyFn)

      expect(tracker.records()[0].phase).toBe('entering')
      expect(tracker.records()[0].value).toEqual({ id: '1', text: 'Updated' })

      // Timeout should not fire (was cancelled)
      vi.advanceTimersByTime(600)
      expect(tracker.records()).toHaveLength(1)

      tracker.destroy()
      store.destroy()
    })
  })

  // ─── Store subscription integration ────────────────────────

  describe('store subscription', () => {
    it('tracker notifies on state changes via store listener', () => {
      const store = createStore({
        name: 'test',
        initial: { items: [{ id: '1' }] },
        stateSchema: z.object({ items: z.array(z.object({ id: z.string() })) }),
      })

      const tracker = createPresenceTracker({ timeout: 100 })
      const keyFn = (item: { id: string }) => item.id
      const trackerListener = vi.fn()

      // Wire store changes to tracker sync
      store.subscribe((state) => {
        tracker.sync(state.items, keyFn)
      })
      tracker.subscribe(trackerListener)

      // Initial sync
      tracker.sync(store.get<any[]>('items')!, keyFn)
      trackerListener.mockClear()

      // Mutate via store
      store.set('items', [], actor)

      // Tracker was notified via store subscription → sync ran → tracker notified listeners
      expect(trackerListener).toHaveBeenCalled()
      expect(tracker.records()[0].phase).toBe('leaving')

      tracker.destroy()
      store.destroy()
    })
  })

  // ─── Skeleton crossfade pattern ────────────────────────────

  describe('skeleton crossfade', () => {
    it('both loading and loaded can be present during transition', () => {
      vi.useFakeTimers()

      const store = createStore({
        name: 'posts',
        initial: { isLoading: true, data: null as string[] | null },
        stateSchema: z.object({
          isLoading: z.boolean(),
          data: z.array(z.string()).nullable(),
        }),
        gates: {
          isLoading: (s: any) => s.isLoading,
          isLoaded: (s: any) => !s.isLoading && s.data !== null,
        },
      })

      const loadingTracker = createPresenceTracker<boolean>({ timeout: 300 })
      const loadedTracker = createPresenceTracker<boolean>({ timeout: 300 })

      // Initially loading
      loadingTracker.syncBoolean(store.isGated('isLoading') as boolean)
      loadedTracker.syncBoolean(store.isGated('isLoaded') as boolean)

      expect(loadingTracker.records()).toHaveLength(1) // loading skeleton present
      expect(loadedTracker.records()).toHaveLength(0) // content not yet loaded

      // Data arrives
      store.set('isLoading', false, actor)
      store.set('data', ['post1', 'post2'], actor)

      loadingTracker.syncBoolean(store.isGated('isLoading') as boolean)
      loadedTracker.syncBoolean(store.isGated('isLoaded') as boolean)

      // BOTH are present during the crossfade window
      expect(loadingTracker.records()).toHaveLength(1)
      expect(loadingTracker.records()[0].phase).toBe('leaving') // fading out
      expect(loadedTracker.records()).toHaveLength(1)
      expect(loadedTracker.records()[0].phase).toBe('entering') // fading in

      // After timeout, loading skeleton is removed
      vi.advanceTimersByTime(300)
      expect(loadingTracker.records()).toHaveLength(0) // gone
      expect(loadedTracker.records()).toHaveLength(1)  // content stays

      loadingTracker.destroy()
      loadedTracker.destroy()
      store.destroy()
    })
  })
})
