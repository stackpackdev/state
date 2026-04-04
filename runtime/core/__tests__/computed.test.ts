import { describe, it, expect, beforeEach } from 'vitest'
import { createStore, storeRegistry } from '../store.js'
import { createHumanActor } from '../actor.js'
import { createComputedEvaluator } from '../computed.js'

const user = createHumanActor('testUser')

beforeEach(() => {
  storeRegistry.clear()
})

describe('createComputedEvaluator', () => {
  it('computes values from state', () => {
    const computed = createComputedEvaluator({
      total: (s: { items: number[] }) => s.items.reduce((a, b) => a + b, 0),
    })
    expect(computed.get('total', { items: [1, 2, 3] })).toBe(6)
  })

  it('returns undefined for unknown computed name', () => {
    const computed = createComputedEvaluator({})
    expect(computed.get('unknown', {})).toBeUndefined()
  })

  it('memoizes per state reference', () => {
    let callCount = 0
    const computed = createComputedEvaluator({
      expensive: (s: { x: number }) => { callCount++; return s.x * 2 },
    })
    const state = { x: 5 }
    computed.get('expensive', state)
    computed.get('expensive', state)
    expect(callCount).toBe(1) // only computed once
  })

  it('recomputes when state reference changes', () => {
    let callCount = 0
    const computed = createComputedEvaluator({
      doubled: (s: { x: number }) => { callCount++; return s.x * 2 },
    })
    computed.get('doubled', { x: 5 })
    computed.get('doubled', { x: 10 })
    expect(callCount).toBe(2)
  })

  it('getAll returns all computed values', () => {
    const computed = createComputedEvaluator({
      sum: (s: { a: number; b: number }) => s.a + s.b,
      product: (s: { a: number; b: number }) => s.a * s.b,
    })
    const result = computed.getAll({ a: 3, b: 4 })
    expect(result.sum).toBe(7)
    expect(result.product).toBe(12)
  })

  it('lists names', () => {
    const computed = createComputedEvaluator({
      a: () => 1,
      b: () => 2,
    })
    expect(computed.names()).toEqual(['a', 'b'])
  })
})

describe('store computed values', () => {
  it('accesses computed values on store', () => {
    const store = createStore({
      name: 'computed-store',
      initial: { items: [{ done: true }, { done: false }, { done: true }] },
      computed: {
        doneCount: (s) => s.items.filter(i => i.done).length,
        activeCount: (s) => s.items.filter(i => !i.done).length,
      },
    })

    expect(store.computed<number>('doneCount')).toBe(2)
    expect(store.computed<number>('activeCount')).toBe(1)
  })

  it('getComputed returns all values', () => {
    const store = createStore({
      name: 'computed-all',
      initial: { x: 3 },
      computed: {
        doubled: (s) => s.x * 2,
        tripled: (s) => s.x * 3,
      },
    })

    const all = store.getComputed()
    expect(all.doubled).toBe(6)
    expect(all.tripled).toBe(9)
  })

  it('recomputes after mutation', () => {
    const store = createStore({
      name: 'computed-mutation',
      initial: { count: 1 },
      computed: {
        doubled: (s) => s.count * 2,
      },
    })

    expect(store.computed('doubled')).toBe(2)
    store.set('count', 5, user)
    expect(store.computed('doubled')).toBe(10)
  })

  it('returns empty object when no computed defined', () => {
    const store = createStore({ name: 'no-computed', initial: { x: 1 } })
    expect(store.getComputed()).toEqual({})
  })
})
