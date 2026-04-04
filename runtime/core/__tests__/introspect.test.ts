import { describe, it, expect, beforeEach } from 'vitest'
import { createStore, storeRegistry } from '../store.js'
import { createHumanActor } from '../actor.js'
import { introspectStore, introspectSystem } from '../introspect.js'

const user = createHumanActor('testUser')

beforeEach(() => {
  storeRegistry.clear()
})

describe('introspectStore', () => {
  it('returns correct name and state', () => {
    const store = createStore({ name: 'basic', initial: { count: 0 } })
    const result = introspectStore(store)

    expect(result.name).toBe('basic')
    expect(result.state).toEqual({ count: 0 })
  })

  it('returns when conditions and their current values', () => {
    const store = createStore({
      name: 'when-test',
      initial: { count: 5 },
      when: {
        isPositive: (s) => s.count > 0,
        isZero: (s) => s.count === 0,
      },
    })
    const result = introspectStore(store)

    expect(result.when).toEqual({ isPositive: true, isZero: false })
  })

  it('returns gate conditions and their current values', () => {
    const store = createStore({
      name: 'gate-test',
      initial: { loggedIn: true, isAdmin: false },
      gates: {
        showDashboard: (s) => s.loggedIn,
        showAdmin: (s) => s.isAdmin,
      },
    })
    const result = introspectStore(store)

    expect(result.gates).toEqual({ showDashboard: true, showAdmin: false })
  })

  it('returns computed values', () => {
    const store = createStore({
      name: 'computed-test',
      initial: { items: [1, 2, 3] },
      computed: {
        itemCount: (s) => s.items.length,
        total: (s) => s.items.reduce((a: number, b: number) => a + b, 0),
      },
    })
    const result = introspectStore(store)

    expect(result.computed).toEqual({ itemCount: 3, total: 6 })
  })

  it('returns dependency metadata', () => {
    const store = createStore({
      name: 'dep-test',
      initial: {},
      dependencies: {
        reads: ['auth'],
        gatedBy: ['auth'],
        triggers: ['notifications'],
      },
    })
    const result = introspectStore(store)

    expect(result.dependencies).toEqual({
      reads: ['auth'],
      gatedBy: ['auth'],
      triggers: ['notifications'],
    })
  })

  it('returns history length', () => {
    const store = createStore({ name: 'history-test', initial: { value: 0 } })
    store.set('value', 1, user)
    store.set('value', 2, user)
    store.set('value', 3, user)

    const result = introspectStore(store)
    expect(result.historyLength).toBe(3)
  })

  it('reflects current state after mutations', () => {
    const store = createStore({
      name: 'mutate-test',
      initial: { count: 0 },
      when: {
        isPositive: (s) => s.count > 0,
      },
      computed: {
        doubled: (s) => s.count * 2,
      },
    })

    let result = introspectStore(store)
    expect(result.state).toEqual({ count: 0 })
    expect(result.when.isPositive).toBe(false)
    expect(result.computed.doubled).toBe(0)
    expect(result.historyLength).toBe(0)

    store.set('count', 10, user)

    result = introspectStore(store)
    expect(result.state).toEqual({ count: 10 })
    expect(result.when.isPositive).toBe(true)
    expect(result.computed.doubled).toBe(20)
    expect(result.historyLength).toBe(1)
  })
})

describe('introspectSystem', () => {
  it('returns all registered stores', () => {
    createStore({ name: 'alpha', initial: { a: 1 } })
    createStore({ name: 'beta', initial: { b: 2 } })

    const result = introspectSystem(storeRegistry)

    expect(result.storeCount).toBe(2)
    expect(result.storeNames).toContain('alpha')
    expect(result.storeNames).toContain('beta')
    expect(result.stores.alpha.state).toEqual({ a: 1 })
    expect(result.stores.beta.state).toEqual({ b: 2 })
  })

  it('returns empty introspection for empty registry', () => {
    const result = introspectSystem(storeRegistry)

    expect(result.storeCount).toBe(0)
    expect(result.storeNames).toEqual([])
    expect(result.stores).toEqual({})
  })
})

describe('storeRegistry.introspect()', () => {
  it('works as a convenience method on the registry', () => {
    createStore({ name: 'one', initial: { x: 1 } })
    createStore({ name: 'two', initial: { y: 2 } })

    const result = storeRegistry.introspect()

    expect(result.storeCount).toBe(2)
    expect(result.storeNames).toContain('one')
    expect(result.storeNames).toContain('two')
    expect(result.stores.one.name).toBe('one')
    expect(result.stores.two.name).toBe('two')
  })

  it('returns same result as introspectSystem', () => {
    createStore({ name: 'same', initial: { val: 42 } })

    const direct = introspectSystem(storeRegistry)
    const method = storeRegistry.introspect()

    expect(direct).toEqual(method)
  })
})
