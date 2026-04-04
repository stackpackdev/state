import { describe, it, expect, vi } from 'vitest'
import { createStore } from '../store.js'
import { createOptimisticQueue } from '../optimistic.js'
import { createSystemActor } from '../actor.js'
import type { Actor } from '../types.js'

const actor: Actor = createSystemActor('test-system')

function makeStore(initial: { count: number; items: string[] }) {
  return createStore({
    name: `optimistic-test-${Date.now()}-${Math.random()}`,
    initial,
  })
}

describe('optimistic updates', () => {
  it('applies mutation immediately before commit resolves', async () => {
    const store = makeStore({ count: 0, items: [] })
    let commitResolved = false

    const promise = store.optimistic({
      apply: (draft) => { draft.count = 42 },
      commit: () => new Promise(resolve => {
        setTimeout(() => { commitResolved = true; resolve(undefined) }, 50)
      }),
      actor,
    })

    // State should be updated immediately, before commit resolves
    expect(store.getState().count).toBe(42)
    expect(commitResolved).toBe(false)

    await promise
    expect(commitResolved).toBe(true)
    expect(store.getState().count).toBe(42)

    store.destroy()
  })

  it('keeps optimistic state on successful commit', async () => {
    const store = makeStore({ count: 0, items: ['a'] })

    const result = await store.optimistic({
      apply: (draft) => { draft.items.push('b') },
      commit: () => Promise.resolve('ok'),
      actor,
    })

    expect(result.success).toBe(true)
    expect(result.error).toBeUndefined()
    expect(store.getState().items).toEqual(['a', 'b'])

    store.destroy()
  })

  it('rolls back to snapshot on failed commit', async () => {
    const store = makeStore({ count: 10, items: [] })

    const result = await store.optimistic({
      apply: (draft) => { draft.count = 999 },
      commit: () => Promise.reject(new Error('server error')),
      actor,
    })

    expect(result.success).toBe(false)
    expect(result.error).toBeInstanceOf(Error)
    expect(result.error!.message).toBe('server error')
    // Should be rolled back
    expect(store.getState().count).toBe(10)

    store.destroy()
  })

  it('runs reconcile function on successful commit', async () => {
    const store = makeStore({ count: 0, items: [] })

    await store.optimistic({
      apply: (draft) => { draft.count = 5 },
      commit: () => Promise.resolve({ serverCount: 7 }),
      reconcile: (draft, response: any) => { draft.count = response.serverCount },
      actor,
    })

    expect(store.getState().count).toBe(7)

    store.destroy()
  })

  it('rebases pending ops when an earlier op fails', async () => {
    const store = makeStore({ count: 0, items: [] })

    // Control when commits resolve
    let rejectA!: (err: Error) => void
    let resolveB!: () => void

    const promiseA = store.optimistic({
      apply: (draft) => { draft.count = 100 },
      commit: () => new Promise((_, reject) => { rejectA = reject }),
      actor,
    })

    // After A applies: count should be 100
    expect(store.getState().count).toBe(100)

    const promiseB = store.optimistic({
      apply: (draft) => { draft.items.push('from-B') },
      commit: () => new Promise((resolve) => { resolveB = resolve }),
      actor,
    })

    // After B applies: count=100, items=['from-B']
    expect(store.getState().count).toBe(100)
    expect(store.getState().items).toEqual(['from-B'])

    // Fail A -> should rollback to A's snapshot (count=0, items=[])
    // then rebase B (items=['from-B'])
    rejectA(new Error('A failed'))
    await promiseA

    // A rolled back, B rebased: count=0 (from snapshot), items=['from-B'] (rebased)
    expect(store.getState().count).toBe(0)
    expect(store.getState().items).toEqual(['from-B'])

    // Now resolve B
    resolveB()
    await promiseB

    expect(store.getState().count).toBe(0)
    expect(store.getState().items).toEqual(['from-B'])

    store.destroy()
  })

  it('preserves actor attribution', async () => {
    const customActor: Actor = { id: 'user-1', type: 'human', name: 'Alice', permissions: [{ paths: ['*'], actions: ['read', 'write', 'delete'] }] }
    const store = makeStore({ count: 0, items: [] })
    const actions: string[] = []

    store.subscribe((_next, _prev, meta) => {
      actions.push(meta.action.actor.name)
    })

    await store.optimistic({
      apply: (draft) => { draft.count = 1 },
      commit: () => Promise.resolve(),
      actor: customActor,
    })

    expect(actions).toContain('Alice')

    store.destroy()
  })

  it('handles multiple sequential optimistic ops', async () => {
    const store = makeStore({ count: 0, items: [] })

    await store.optimistic({
      apply: (draft) => { draft.count = 1 },
      commit: () => Promise.resolve(),
      actor,
    })

    await store.optimistic({
      apply: (draft) => { draft.count = 2 },
      commit: () => Promise.resolve(),
      actor,
    })

    await store.optimistic({
      apply: (draft) => { draft.count = 3 },
      commit: () => Promise.resolve(),
      actor,
    })

    expect(store.getState().count).toBe(3)

    store.destroy()
  })

  it('store works normally without optimistic calls (backward compat)', () => {
    const store = makeStore({ count: 0, items: [] })

    store.update((draft) => { draft.count = 5 }, actor)
    expect(store.getState().count).toBe(5)

    store.set('count', 10, actor)
    expect(store.getState().count).toBe(10)

    store.destroy()
  })

  describe('createOptimisticQueue', () => {
    it('tracks pending count', async () => {
      const queue = createOptimisticQueue<{ count: number; items: string[] }>()
      const store = makeStore({ count: 0, items: [] })

      let resolveCommit!: () => void
      const commitPromise = new Promise<void>(r => { resolveCommit = r })

      expect(queue.pending()).toBe(0)
      expect(queue.hasPending()).toBe(false)

      const enqueuePromise = queue.enqueue(store, {
        apply: (draft) => { draft.count = 1 },
        commit: () => commitPromise,
        actor,
      })

      expect(queue.pending()).toBe(1)
      expect(queue.hasPending()).toBe(true)

      resolveCommit()
      await enqueuePromise

      expect(queue.pending()).toBe(0)
      expect(queue.hasPending()).toBe(false)

      store.destroy()
    })
  })
})
