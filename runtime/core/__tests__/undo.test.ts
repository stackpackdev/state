import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createStore, storeRegistry } from '../store.js'
import { createHumanActor } from '../actor.js'

const user = createHumanActor('testUser')

beforeEach(() => {
  storeRegistry.clear()
})

describe('undo/redo', () => {
  it('undo reverts to previous state', () => {
    const store = createStore({ name: 'undo-basic', initial: { count: 0 }, undo: { limit: 10 } })
    store.set('count', 1, user)
    expect(store.getState()).toEqual({ count: 1 })
    store.undo()
    expect(store.getState()).toEqual({ count: 0 })
  })

  it('redo restores undone state', () => {
    const store = createStore({ name: 'redo-basic', initial: { count: 0 }, undo: { limit: 10 } })
    store.set('count', 1, user)
    store.undo()
    expect(store.getState()).toEqual({ count: 0 })
    store.redo()
    expect(store.getState()).toEqual({ count: 1 })
  })

  it('multiple undos work (undo 3 times)', () => {
    const store = createStore({ name: 'undo-multi', initial: { count: 0 }, undo: { limit: 10 } })
    store.set('count', 1, user)
    store.set('count', 2, user)
    store.set('count', 3, user)
    expect(store.getState()).toEqual({ count: 3 })

    store.undo()
    expect(store.getState()).toEqual({ count: 2 })
    store.undo()
    expect(store.getState()).toEqual({ count: 1 })
    store.undo()
    expect(store.getState()).toEqual({ count: 0 })
  })

  it('redo cleared on new action', () => {
    const store = createStore({ name: 'redo-clear', initial: { count: 0 }, undo: { limit: 10 } })
    store.set('count', 1, user)
    store.set('count', 2, user)
    store.undo()
    expect(store.canRedo()).toBe(true)

    // New action should clear redo stack
    store.set('count', 99, user)
    expect(store.canRedo()).toBe(false)
    store.redo()
    // Should still be 99, redo did nothing
    expect(store.getState()).toEqual({ count: 99 })
  })

  it('canUndo/canRedo report correctly', () => {
    const store = createStore({ name: 'can-checks', initial: { count: 0 }, undo: { limit: 10 } })
    expect(store.canUndo()).toBe(false)
    expect(store.canRedo()).toBe(false)

    store.set('count', 1, user)
    expect(store.canUndo()).toBe(true)
    expect(store.canRedo()).toBe(false)

    store.undo()
    expect(store.canUndo()).toBe(false)
    expect(store.canRedo()).toBe(true)

    store.redo()
    expect(store.canUndo()).toBe(true)
    expect(store.canRedo()).toBe(false)
  })

  it('undo(n) undoes N actions at once', () => {
    const store = createStore({ name: 'undo-n', initial: { count: 0 }, undo: { limit: 10 } })
    store.set('count', 1, user)
    store.set('count', 2, user)
    store.set('count', 3, user)

    const undone = store.undo(3)
    expect(undone).toBe(3)
    expect(store.getState()).toEqual({ count: 0 })
  })

  it('undo without undo config returns 0', () => {
    const store = createStore({ name: 'no-undo', initial: { count: 0 } })
    store.set('count', 1, user)
    const undone = store.undo()
    expect(undone).toBe(0)
    // State unchanged (undo is no-op)
    expect(store.getState()).toEqual({ count: 1 })
  })

  it('canUndo returns false without undo config', () => {
    const store = createStore({ name: 'no-undo-can', initial: { count: 0 } })
    store.set('count', 1, user)
    expect(store.canUndo()).toBe(false)
    expect(store.canRedo()).toBe(false)
  })

  it('undo limit respected (oldest snapshots dropped)', () => {
    const store = createStore({ name: 'undo-limit', initial: { count: 0 }, undo: { limit: 3 } })
    store.set('count', 1, user) // snapshot: [0]
    store.set('count', 2, user) // snapshot: [0, 1]
    store.set('count', 3, user) // snapshot: [0, 1, 2]
    store.set('count', 4, user) // snapshot: [1, 2, 3] (0 dropped)

    // Can only undo 3 times, not 4
    const undone = store.undo(10)
    expect(undone).toBe(3)
    // Oldest available snapshot is count=1 (count=0 was dropped)
    expect(store.getState()).toEqual({ count: 1 })
  })

  it('listeners notified on undo', () => {
    const store = createStore({ name: 'undo-listen', initial: { count: 0 }, undo: { limit: 10 } })
    store.set('count', 1, user)

    const listener = vi.fn()
    store.subscribe(listener)

    store.undo()
    expect(listener).toHaveBeenCalledTimes(1)
    const [nextState, prevState] = listener.mock.calls[0]
    expect(nextState).toEqual({ count: 0 })
    expect(prevState).toEqual({ count: 1 })
  })

  it('listeners notified on redo', () => {
    const store = createStore({ name: 'redo-listen', initial: { count: 0 }, undo: { limit: 10 } })
    store.set('count', 1, user)
    store.undo()

    const listener = vi.fn()
    store.subscribe(listener)

    store.redo()
    expect(listener).toHaveBeenCalledTimes(1)
    const [nextState, prevState] = listener.mock.calls[0]
    expect(nextState).toEqual({ count: 1 })
    expect(prevState).toEqual({ count: 0 })
  })

  it('undo returns count of actions actually undone (may be less than requested)', () => {
    const store = createStore({ name: 'undo-partial', initial: { count: 0 }, undo: { limit: 10 } })
    store.set('count', 1, user)
    store.set('count', 2, user)

    // Request 5 undos but only 2 available
    const undone = store.undo(5)
    expect(undone).toBe(2)
    expect(store.getState()).toEqual({ count: 0 })
  })

  it('redo returns count of actions actually redone (may be less than requested)', () => {
    const store = createStore({ name: 'redo-partial', initial: { count: 0 }, undo: { limit: 10 } })
    store.set('count', 1, user)
    store.set('count', 2, user)
    store.undo(2)

    // Request 5 redos but only 2 available
    const redone = store.redo(5)
    expect(redone).toBe(2)
    expect(store.getState()).toEqual({ count: 2 })
  })

  it('works with update (Immer mutations)', () => {
    const store = createStore({
      name: 'undo-update',
      initial: { items: ['a', 'b'] },
      undo: { limit: 10 },
    })
    store.update((draft: any) => { draft.items.push('c') }, user)
    expect(store.getState()).toEqual({ items: ['a', 'b', 'c'] })

    store.undo()
    expect(store.getState()).toEqual({ items: ['a', 'b'] })

    store.redo()
    expect(store.getState()).toEqual({ items: ['a', 'b', 'c'] })
  })

  it('skipUndo on set() excludes mutation from undo stack', () => {
    const store = createStore({ name: 'skip-set', initial: { count: 0, loaded: false }, undo: { limit: 10 } })
    // System mutation — should not be undoable
    store.set('loaded', true, user, { skipUndo: true })
    expect(store.getState()).toEqual({ count: 0, loaded: true })
    expect(store.canUndo()).toBe(false)

    // User mutation — should be undoable
    store.set('count', 1, user)
    expect(store.canUndo()).toBe(true)

    // Undo only reverts count, not loaded
    store.undo()
    expect(store.getState()).toEqual({ count: 0, loaded: true })
  })

  it('skipUndo on update() excludes mutation from undo stack', () => {
    const store = createStore({ name: 'skip-update', initial: { items: ['a'], ready: false }, undo: { limit: 10 } })
    store.update((d: any) => { d.ready = true }, user, { skipUndo: true })
    expect(store.getState().ready).toBe(true)
    expect(store.canUndo()).toBe(false)

    store.update((d: any) => { d.items.push('b') }, user)
    expect(store.canUndo()).toBe(true)

    store.undo()
    expect(store.getState()).toEqual({ items: ['a'], ready: true })
  })

  it('clearUndoStack() clears both stacks', () => {
    const store = createStore({ name: 'clear-stack', initial: { count: 0 }, undo: { limit: 10 } })
    store.set('count', 1, user)
    store.set('count', 2, user)
    expect(store.canUndo()).toBe(true)

    store.undo()
    expect(store.canRedo()).toBe(true)

    store.clearUndoStack()
    expect(store.canUndo()).toBe(false)
    expect(store.canRedo()).toBe(false)
    // State is preserved
    expect(store.getState()).toEqual({ count: 1 })
  })

  it('clearUndoStack() after init prevents undo past startup', () => {
    const store = createStore({ name: 'clear-init', initial: { count: 0, loaded: false }, undo: { limit: 10 } })
    // Simulate initialization
    store.set('loaded', true, user)
    store.clearUndoStack()

    // Now user makes changes
    store.set('count', 1, user)
    store.set('count', 2, user)

    // Can undo user changes but not past clearUndoStack point
    store.undo()
    expect(store.getState()).toEqual({ count: 1, loaded: true })
    store.undo()
    expect(store.getState()).toEqual({ count: 0, loaded: true })
    // No more undos — loaded stays true
    expect(store.canUndo()).toBe(false)
  })
})
