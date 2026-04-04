import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { z } from 'zod'
import { createStore, storeRegistry } from '../store.js'
import { createHumanActor } from '../actor.js'
import { createMemoryStorage, createPersistMiddleware } from '../persist.js'
import type { StorageAdapter } from '../persist.js'

const user = createHumanActor('testUser')

beforeEach(() => {
  storeRegistry.clear()
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
})

// ─── createMemoryStorage ────────────────────────────────────

describe('createMemoryStorage', () => {
  it('stores and retrieves values', () => {
    const storage = createMemoryStorage()
    expect(storage.getItem('key')).toBeNull()
    storage.setItem('key', 'value')
    expect(storage.getItem('key')).toBe('value')
  })

  it('removes values', () => {
    const storage = createMemoryStorage()
    storage.setItem('key', 'value')
    storage.removeItem('key')
    expect(storage.getItem('key')).toBeNull()
  })

  it('overwrites existing values', () => {
    const storage = createMemoryStorage()
    storage.setItem('key', 'first')
    storage.setItem('key', 'second')
    expect(storage.getItem('key')).toBe('second')
  })
})

// ─── createPersistMiddleware ────────────────────────────────

describe('createPersistMiddleware', () => {
  it('hydrate returns undefined when nothing persisted', () => {
    const storage = createMemoryStorage()
    const { hydrate } = createPersistMiddleware({ key: 'test', storage })
    expect(hydrate()).toBeUndefined()
  })

  it('hydrate returns persisted data', () => {
    const storage = createMemoryStorage()
    storage.setItem('test', JSON.stringify({ __version: 1, data: { count: 42 } }))
    const { hydrate } = createPersistMiddleware({ key: 'test', storage })
    expect(hydrate()).toEqual({ count: 42 })
  })

  it('hydrate returns undefined for invalid JSON', () => {
    const storage = createMemoryStorage()
    storage.setItem('test', 'not-json')
    const { hydrate } = createPersistMiddleware({ key: 'test', storage })
    expect(hydrate()).toBeUndefined()
  })

  it('hydrate validates against Zod schema', () => {
    const schema = z.object({ count: z.number() })
    const storage = createMemoryStorage()
    // Valid data
    storage.setItem('test', JSON.stringify({ __version: 1, data: { count: 5 } }))
    const { hydrate } = createPersistMiddleware({ key: 'test', storage }, schema)
    expect(hydrate()).toEqual({ count: 5 })
  })

  it('hydrate returns undefined when schema validation fails', () => {
    const schema = z.object({ count: z.number() })
    const storage = createMemoryStorage()
    // Invalid: count is a string
    storage.setItem('test', JSON.stringify({ __version: 1, data: { count: 'bad' } }))
    const { hydrate } = createPersistMiddleware({ key: 'test', storage }, schema)
    expect(hydrate()).toBeUndefined()
  })

  it('hydrate runs migrate when version differs', () => {
    const storage = createMemoryStorage()
    storage.setItem('test', JSON.stringify({ __version: 1, data: { name: 'old' } }))

    const migrate = vi.fn((data: any, version: number) => {
      return { name: data.name, migratedFrom: version }
    })

    const { hydrate } = createPersistMiddleware({
      key: 'test',
      storage,
      version: 2,
      migrate,
    })

    const result = hydrate()
    expect(migrate).toHaveBeenCalledWith({ name: 'old' }, 1)
    expect(result).toEqual({ name: 'old', migratedFrom: 1 })
  })

  it('hydrate does not run migrate when version matches', () => {
    const storage = createMemoryStorage()
    storage.setItem('test', JSON.stringify({ __version: 2, data: { count: 10 } }))

    const migrate = vi.fn()
    const { hydrate } = createPersistMiddleware({
      key: 'test',
      storage,
      version: 2,
      migrate,
    })

    hydrate()
    expect(migrate).not.toHaveBeenCalled()
  })
})

// ─── Store integration ──────────────────────────────────────

describe('store with persist', () => {
  it('persists state after mutation (with debounce flush)', () => {
    const storage = createMemoryStorage()
    const store = createStore({
      name: 'persist-basic',
      initial: { count: 0 },
      persist: { key: 'basic', storage, debounceMs: 100 },
    })

    store.set('count', 5, user)
    // Not yet written (debounced)
    expect(storage.getItem('basic')).toBeNull()

    // Flush debounce
    vi.advanceTimersByTime(100)
    const stored = JSON.parse(storage.getItem('basic')!)
    expect(stored.data).toEqual({ count: 5 })
  })

  it('hydrates state from storage on creation', () => {
    const storage = createMemoryStorage()
    storage.setItem('hydrate-test', JSON.stringify({ __version: 1, data: { count: 42 } }))

    const store = createStore({
      name: 'persist-hydrate',
      initial: { count: 0 },
      persist: { key: 'hydrate-test', storage },
    })

    expect(store.getState()).toEqual({ count: 42 })
  })

  it('falls back to initial when persisted data fails schema validation', () => {
    const schema = z.object({ count: z.number() })
    const storage = createMemoryStorage()
    storage.setItem('corrupt', JSON.stringify({ __version: 1, data: { count: 'not-a-number' } }))

    const store = createStore({
      name: 'persist-corrupt',
      initial: { count: 0 },
      stateSchema: schema,
      persist: { key: 'corrupt', storage },
    })

    // Should fall back to initial since "not-a-number" fails validation
    expect(store.getState()).toEqual({ count: 0 })
  })

  it('persists only specified paths', () => {
    const storage = createMemoryStorage()
    const store = createStore({
      name: 'persist-paths',
      initial: { count: 0, name: 'test', secret: 'hidden' },
      persist: { key: 'paths', storage, paths: ['count', 'name'], debounceMs: 50 },
    })

    store.set('count', 10, user)
    store.set('secret', 'exposed', user)
    vi.advanceTimersByTime(50)

    const stored = JSON.parse(storage.getItem('paths')!)
    expect(stored.__paths).toBe(true)
    expect(stored.data).toEqual({ count: 10, name: 'test' })
    // secret should not be persisted
    expect(stored.data.secret).toBeUndefined()
  })

  it('debounces rapid mutations into single write', () => {
    const storage = createMemoryStorage()
    const setItemSpy = vi.spyOn(storage, 'setItem')

    const store = createStore({
      name: 'persist-debounce',
      initial: { count: 0 },
      persist: { key: 'debounce', storage, debounceMs: 100 },
    })

    // Rapid mutations
    store.set('count', 1, user)
    store.set('count', 2, user)
    store.set('count', 3, user)
    store.set('count', 4, user)
    store.set('count', 5, user)

    // No writes yet
    expect(setItemSpy).not.toHaveBeenCalled()

    // Flush debounce
    vi.advanceTimersByTime(100)

    // Only one write with final state
    expect(setItemSpy).toHaveBeenCalledTimes(1)
    const stored = JSON.parse(storage.getItem('debounce')!)
    expect(stored.data).toEqual({ count: 5 })
  })

  it('version and migrate work through store integration', () => {
    const storage = createMemoryStorage()
    // Simulate old data from version 1
    storage.setItem('migrate-test', JSON.stringify({ __version: 1, data: { items: ['a', 'b'] } }))

    const store = createStore({
      name: 'persist-migrate',
      initial: { items: [], count: 0 },
      persist: {
        key: 'migrate-test',
        storage,
        version: 2,
        migrate: (data: any, version: number) => {
          if (version === 1) {
            return { items: data.items, count: data.items.length }
          }
          return data
        },
      },
    })

    expect(store.getState()).toEqual({ items: ['a', 'b'], count: 2 })
  })

  it('store without persist option works normally (backward compat)', () => {
    const store = createStore({
      name: 'no-persist',
      initial: { count: 0 },
    })

    store.set('count', 10, user)
    expect(store.getState()).toEqual({ count: 10 })
  })

  it('uses default in-memory storage when no storage adapter provided', () => {
    // This should not throw — defaults to createMemoryStorage internally
    const store = createStore({
      name: 'persist-default-storage',
      initial: { value: 'hello' },
      persist: { key: 'default-storage' },
    })

    store.set('value', 'world', user)
    vi.advanceTimersByTime(100)

    // Store functions normally — the in-memory storage receives writes
    expect(store.getState()).toEqual({ value: 'world' })
  })
})
