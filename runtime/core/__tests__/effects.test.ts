import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { z } from 'zod'
import { createStore, storeRegistry } from '../store.js'
import { createEffectRunner } from '../effects.js'
import { createHumanActor } from '../actor.js'
import type { EffectDeclaration, EffectContext } from '../effects.js'

const user = createHumanActor('testUser')

beforeEach(() => {
  storeRegistry.clear()
})

afterEach(() => {
  vi.useRealTimers()
})

describe('createEffectRunner', () => {
  it('triggers effect on watched path change', async () => {
    const handler = vi.fn()
    const store = createStore({
      name: 'fx-path',
      initial: { count: 0, label: 'hi' },
    })

    const runner = createEffectRunner({
      onCount: { watch: 'count', handler },
    })
    runner.start(store)

    store.set('count', 1, user)
    await vi.waitFor(() => expect(handler).toHaveBeenCalledTimes(1))

    const ctx: EffectContext = handler.mock.calls[0][0]
    expect(ctx.state).toEqual({ count: 1, label: 'hi' })
    expect(ctx.prevState).toEqual({ count: 0, label: 'hi' })
    expect(ctx.store).toBe(store)
    expect(ctx.signal).toBeInstanceOf(AbortSignal)

    runner.stop()
    store.destroy()
  })

  it('does NOT trigger when unwatched path changes', async () => {
    const handler = vi.fn()
    const store = createStore({
      name: 'fx-unwatched',
      initial: { count: 0, label: 'hi' },
    })

    const runner = createEffectRunner({
      onCount: { watch: 'count', handler },
    })
    runner.start(store)

    store.set('label', 'bye', user)

    // Give it a tick to ensure nothing fires
    await new Promise((r) => setTimeout(r, 10))
    expect(handler).not.toHaveBeenCalled()

    runner.stop()
    store.destroy()
  })

  it('debounces effect execution', async () => {
    vi.useFakeTimers()
    const handler = vi.fn()
    const store = createStore({
      name: 'fx-debounce',
      initial: { count: 0 },
    })

    const runner = createEffectRunner({
      onCount: { watch: 'count', handler, debounce: 200 },
    })
    runner.start(store)

    store.set('count', 1, user)
    store.set('count', 2, user)
    store.set('count', 3, user)

    expect(handler).not.toHaveBeenCalled()
    expect(runner.status().onCount).toBe('debouncing')

    vi.advanceTimersByTime(200)
    await vi.waitFor(() => expect(handler).toHaveBeenCalledTimes(1))

    // Should have received the latest state
    const ctx: EffectContext = handler.mock.calls[0][0]
    expect(ctx.state).toEqual({ count: 3 })

    runner.stop()
    store.destroy()
  })

  it('aborts previous invocation when new one starts', async () => {
    const abortSignals: AbortSignal[] = []
    const handler = vi.fn(async (ctx: EffectContext) => {
      abortSignals.push(ctx.signal)
      // Simulate async work
      await new Promise((r) => setTimeout(r, 50))
    })

    const store = createStore({
      name: 'fx-abort',
      initial: { count: 0 },
    })

    const runner = createEffectRunner({
      onCount: { watch: 'count', handler },
    })
    runner.start(store)

    store.set('count', 1, user)
    // Wait a tick for the handler to start
    await new Promise((r) => setTimeout(r, 5))

    store.set('count', 2, user)
    await new Promise((r) => setTimeout(r, 5))

    // First invocation should be aborted
    expect(abortSignals[0].aborted).toBe(true)

    runner.stop()
    store.destroy()
  })

  it('retries with linear backoff', async () => {
    vi.useFakeTimers()
    let callCount = 0
    const handler = vi.fn(async () => {
      callCount++
      if (callCount <= 2) throw new Error('fail')
    })

    const store = createStore({
      name: 'fx-retry-linear',
      initial: { count: 0 },
    })

    const runner = createEffectRunner({
      onCount: {
        watch: 'count',
        handler,
        retry: { max: 3, backoff: 'linear' },
      },
    })
    runner.start(store)

    store.set('count', 1, user)

    // First call fails immediately
    await vi.advanceTimersByTimeAsync(0)
    expect(handler).toHaveBeenCalledTimes(1)
    expect(runner.status().onCount).toBe('retrying')

    // Linear: 100ms * 1 = 100ms for first retry
    await vi.advanceTimersByTimeAsync(100)
    expect(handler).toHaveBeenCalledTimes(2)

    // Linear: 100ms * 2 = 200ms for second retry
    await vi.advanceTimersByTimeAsync(200)
    expect(handler).toHaveBeenCalledTimes(3)

    // Third call succeeds
    await vi.advanceTimersByTimeAsync(0)
    expect(runner.status().onCount).toBe('idle')

    runner.stop()
    store.destroy()
  })

  it('retries with exponential backoff', async () => {
    vi.useFakeTimers()
    let callCount = 0
    const handler = vi.fn(async () => {
      callCount++
      if (callCount <= 2) throw new Error('fail')
    })

    const store = createStore({
      name: 'fx-retry-exp',
      initial: { count: 0 },
    })

    const runner = createEffectRunner({
      onCount: {
        watch: 'count',
        handler,
        retry: { max: 3, backoff: 'exponential' },
      },
    })
    runner.start(store)

    store.set('count', 1, user)

    // First call fails
    await vi.advanceTimersByTimeAsync(0)
    expect(handler).toHaveBeenCalledTimes(1)

    // Exponential: 100 * 2^0 = 100ms
    await vi.advanceTimersByTimeAsync(100)
    expect(handler).toHaveBeenCalledTimes(2)

    // Exponential: 100 * 2^1 = 200ms
    await vi.advanceTimersByTimeAsync(200)
    expect(handler).toHaveBeenCalledTimes(3)

    await vi.advanceTimersByTimeAsync(0)
    expect(runner.status().onCount).toBe('idle')

    runner.stop()
    store.destroy()
  })

  it('tracks effect status transitions', async () => {
    const store = createStore({
      name: 'fx-status',
      initial: { count: 0 },
    })

    let resolveHandler: () => void
    const handlerPromise = new Promise<void>((r) => { resolveHandler = r })
    const handler = vi.fn(async () => { await handlerPromise })

    const runner = createEffectRunner({
      onCount: { watch: 'count', handler },
    })
    runner.start(store)

    expect(runner.status().onCount).toBe('idle')

    store.set('count', 1, user)
    await new Promise((r) => setTimeout(r, 5))
    expect(runner.status().onCount).toBe('running')

    resolveHandler!()
    await vi.waitFor(() => expect(runner.status().onCount).toBe('idle'))

    runner.stop()
    store.destroy()
  })

  it('stop() cancels running effects', async () => {
    const store = createStore({
      name: 'fx-stop',
      initial: { count: 0 },
    })

    let capturedSignal: AbortSignal | null = null
    const handler = vi.fn(async (ctx: EffectContext) => {
      capturedSignal = ctx.signal
      await new Promise((r) => setTimeout(r, 1000))
    })

    const runner = createEffectRunner({
      onCount: { watch: 'count', handler },
    })
    runner.start(store)

    store.set('count', 1, user)
    await new Promise((r) => setTimeout(r, 5))

    runner.stop()
    expect(capturedSignal!.aborted).toBe(true)
    expect(runner.status().onCount).toBe('idle')

    store.destroy()
  })

  it('triggers on mode transition', async () => {
    const schema = z.discriminatedUnion('status', [
      z.object({ status: z.literal('idle') }),
      z.object({ status: z.literal('loading'), url: z.string() }),
      z.object({ status: z.literal('done'), data: z.string() }),
    ])

    const handler = vi.fn()
    const store = createStore({
      name: 'fx-transition',
      stateSchema: schema,
      initial: { status: 'idle' as const },
    })

    const runner = createEffectRunner({
      onStart: { watch: 'idle -> loading', handler },
    })
    runner.start(store)

    // Transition idle -> loading should trigger
    store.update((d: any) => { d.status = 'loading'; d.url = 'http://x' }, user)
    await vi.waitFor(() => expect(handler).toHaveBeenCalledTimes(1))

    // Transition loading -> done should NOT trigger (wrong transition)
    store.update((d: any) => { d.status = 'done'; d.data = 'ok'; delete d.url }, user)
    await new Promise((r) => setTimeout(r, 10))
    expect(handler).toHaveBeenCalledTimes(1)

    runner.stop()
    store.destroy()
  })

  it('store without effects works (backward compat)', () => {
    const store = createStore({
      name: 'fx-none',
      initial: { count: 0 },
    })

    store.set('count', 1, user)
    expect(store.getState()).toEqual({ count: 1 })

    store.destroy()
  })

  it('effect error does not crash the store', async () => {
    const handler = vi.fn(() => { throw new Error('boom') })
    const store = createStore({
      name: 'fx-error',
      initial: { count: 0 },
    })

    const runner = createEffectRunner({
      onCount: { watch: 'count', handler },
    })
    runner.start(store)

    // Should not throw
    store.set('count', 1, user)
    await new Promise((r) => setTimeout(r, 10))

    expect(runner.status().onCount).toBe('error')

    // Store should still work
    store.set('count', 2, user)
    expect(store.getState()).toEqual({ count: 2 })

    runner.stop()
    store.destroy()
  })

  it('effects integrate with createStore options', async () => {
    const handler = vi.fn()
    const store = createStore({
      name: 'fx-integrated',
      initial: { count: 0 },
      effects: {
        onCount: { watch: 'count', handler },
      },
    })

    store.set('count', 5, user)
    await vi.waitFor(() => expect(handler).toHaveBeenCalledTimes(1))

    store.destroy()
  })
})
