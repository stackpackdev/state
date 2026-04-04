import { describe, it, expect, beforeEach, vi } from 'vitest'
import { z } from 'zod'
import { createFetcher, createInitialFetchState } from '../fetch.js'
import { createStore, storeRegistry } from '../store.js'
import { createHumanActor } from '../actor.js'

const user = createHumanActor('testUser')

beforeEach(() => {
  storeRegistry.clear()
})

// ─── createInitialFetchState ────────────────────────────────

describe('createInitialFetchState', () => {
  it('returns idle state with null data', () => {
    const state = createInitialFetchState()
    expect(state).toEqual({
      data: null,
      error: null,
      status: 'idle',
      fetchedAt: null,
      isStale: false,
    })
  })
})

// ─── createFetcher ──────────────────────────────────────────

describe('createFetcher', () => {
  it('starts in idle state', () => {
    const fetcher = createFetcher({
      name: 'test',
      fn: async () => ({ items: [] }),
    })
    expect(fetcher.getState().status).toBe('idle')
    expect(fetcher.getState().data).toBeNull()
  })

  it('fetches data and moves to success', async () => {
    const fetcher = createFetcher({
      name: 'test-success',
      fn: async () => [1, 2, 3],
    })
    const data = await fetcher.fetch()
    expect(data).toEqual([1, 2, 3])
    expect(fetcher.getState().status).toBe('success')
    expect(fetcher.getState().data).toEqual([1, 2, 3])
    expect(fetcher.getState().fetchedAt).toBeTypeOf('number')
  })

  it('moves to error on failure', async () => {
    const fetcher = createFetcher({
      name: 'test-error',
      fn: async () => { throw new Error('network down') },
    })
    await expect(fetcher.fetch()).rejects.toThrow('network down')
    expect(fetcher.getState().status).toBe('error')
    expect(fetcher.getState().error?.message).toBe('network down')
  })

  it('validates response with Zod schema', async () => {
    const schema = z.object({ id: z.number(), name: z.string() })
    const fetcher = createFetcher({
      name: 'test-zod-valid',
      fn: async () => ({ id: 1, name: 'Alice' }),
      schema,
    })
    const data = await fetcher.fetch()
    expect(data).toEqual({ id: 1, name: 'Alice' })
  })

  it('rejects invalid response with Zod', async () => {
    const schema = z.object({ id: z.number(), name: z.string() })
    const fetcher = createFetcher({
      name: 'test-zod-invalid',
      fn: async () => ({ id: 'not-a-number', name: 123 }),
      schema,
    })
    await expect(fetcher.fetch()).rejects.toThrow(/response validation failed/)
    expect(fetcher.getState().status).toBe('error')
  })

  it('deduplicates in-flight requests', async () => {
    let callCount = 0
    const fetcher = createFetcher({
      name: 'test-dedup',
      fn: async () => { callCount++; return 'result' },
    })
    const [a, b] = await Promise.all([fetcher.fetch(), fetcher.fetch()])
    expect(a).toBe('result')
    expect(b).toBe('result')
    expect(callCount).toBe(1)
  })

  // ─── Cache ──────────────────────────────────────────────

  it('returns cached data within TTL', async () => {
    let callCount = 0
    const fetcher = createFetcher({
      name: 'test-cache',
      fn: async () => { callCount++; return 'data' },
      cacheTtl: 60_000,
    })
    await fetcher.fetch()
    await fetcher.fetch()
    expect(callCount).toBe(1)
  })

  it('refetch ignores cache', async () => {
    let callCount = 0
    const fetcher = createFetcher({
      name: 'test-refetch',
      fn: async () => { callCount++; return `data-${callCount}` },
      cacheTtl: 60_000,
    })
    await fetcher.fetch()
    const data = await fetcher.refetch()
    expect(callCount).toBe(2)
    expect(data).toBe('data-2')
  })

  it('invalidate marks data as stale', async () => {
    const fetcher = createFetcher({
      name: 'test-invalidate',
      fn: async () => 'data',
      cacheTtl: 60_000,
    })
    await fetcher.fetch()
    expect(fetcher.getState().isStale).toBe(false)
    fetcher.invalidate()
    expect(fetcher.getState().isStale).toBe(true)
  })

  it('isStale becomes true after TTL expires', async () => {
    vi.useFakeTimers()
    const fetcher = createFetcher({
      name: 'test-stale-ttl',
      fn: async () => 'data',
      cacheTtl: 100,
    })
    await fetcher.fetch()
    expect(fetcher.getState().isStale).toBe(false)
    vi.advanceTimersByTime(150)
    expect(fetcher.getState().isStale).toBe(true)
    vi.useRealTimers()
  })

  // ─── Bind to Store ────────────────────────────────────────

  it('bind syncs fetch state to a store', async () => {
    const store = createStore({
      name: 'bound-store',
      initial: {
        posts: { data: null, isLoading: false, error: null, isStale: false },
      },
    })
    const fetcher = createFetcher({
      name: 'posts',
      fn: async () => [{ id: 1, title: 'hello' }],
    })
    const bound = fetcher.bind(store, 'posts')
    await bound.fetch()

    const state = store.getState() as any
    expect(state.posts.data).toEqual([{ id: 1, title: 'hello' }])
    expect(state.posts.isLoading).toBe(false)
    expect(state.posts.error).toBeNull()
  })

  it('bind syncs loading state to store', async () => {
    const store = createStore({
      name: 'bound-loading',
      initial: {
        api: { data: null, isLoading: false, error: null, isStale: false },
      },
    })

    let resolveFetch!: (value: string) => void
    const fetcher = createFetcher({
      name: 'api',
      fn: () => new Promise<string>(r => { resolveFetch = r }),
    })
    const bound = fetcher.bind(store, 'api')
    const promise = bound.fetch()

    // Should be loading now
    expect((store.getState() as any).api.isLoading).toBe(true)

    resolveFetch('done')
    await promise

    expect((store.getState() as any).api.isLoading).toBe(false)
    expect((store.getState() as any).api.data).toBe('done')
  })

  it('bind syncs error state to store', async () => {
    const store = createStore({
      name: 'bound-error',
      initial: {
        api: { data: null, isLoading: false, error: null, isStale: false },
      },
    })
    const fetcher = createFetcher({
      name: 'api',
      fn: async () => { throw new Error('oops') },
    })
    const bound = fetcher.bind(store, 'api')
    await bound.fetch().catch(() => {})

    const state = store.getState() as any
    expect(state.api.error).toBeInstanceOf(Error)
    expect(state.api.error.message).toBe('oops')
    expect(state.api.isLoading).toBe(false)
  })

  it('converts non-Error throws to Error', async () => {
    const fetcher = createFetcher({
      name: 'test-string-throw',
      fn: async () => { throw 'string error' },
    })
    await expect(fetcher.fetch()).rejects.toThrow('string error')
    expect(fetcher.getState().error).toBeInstanceOf(Error)
  })
})
