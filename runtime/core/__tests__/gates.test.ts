import { describe, it, expect, beforeEach } from 'vitest'
import { createGateEvaluator } from '../when.js'
import { createStore, storeRegistry } from '../store.js'
import { createHumanActor } from '../actor.js'

const user = createHumanActor('testUser')

beforeEach(() => {
  storeRegistry.clear()
})

// ─── Gate Evaluator (unit) ──────────────────────────────────

describe('createGateEvaluator', () => {
  it('evaluates all gates', () => {
    const gate = createGateEvaluator({
      isAuthenticated: (s: { user: string | null }) => s.user !== null,
      hasData: (s: { data: unknown[] }) => s.data.length > 0,
    })
    const result = gate.evaluate({ user: null, data: [] })
    expect(result.isAuthenticated).toBe(false)
    expect(result.hasData).toBe(false)
  })

  it('checks individual gates', () => {
    const gate = createGateEvaluator({
      isAuthenticated: (s: { user: string | null }) => s.user !== null,
    })
    expect(gate.check('isAuthenticated', { user: 'alice' })).toBe(true)
    expect(gate.check('isAuthenticated', { user: null })).toBe(false)
  })

  it('returns false for non-existent gates', () => {
    const gate = createGateEvaluator({})
    expect(gate.check('nonexistent', {})).toBe(false)
  })

  it('handles errors in gate conditions gracefully', () => {
    const gate = createGateEvaluator({
      willThrow: () => { throw new Error('boom') },
    })
    expect(gate.check('willThrow', {})).toBe(false)
    expect(gate.evaluate({}).willThrow).toBe(false)
  })

  it('add/remove gates dynamically', () => {
    const gate = createGateEvaluator<{ count: number }>({})
    gate.add('isPositive', s => s.count > 0)
    expect(gate.check('isPositive', { count: 5 })).toBe(true)
    expect(gate.names()).toEqual(['isPositive'])
    gate.remove('isPositive')
    expect(gate.check('isPositive', { count: 5 })).toBe(false)
    expect(gate.names()).toEqual([])
  })
})

// ─── Gates on Store ─────────────────────────────────────────

describe('store gates', () => {
  it('evaluates gates on store', () => {
    const store = createStore({
      name: 'gate-store',
      initial: { user: null as string | null, data: null as string[] | null },
      gates: {
        isAuthenticated: (s) => s.user !== null,
        hasData: (s) => s.data !== null,
      },
    })

    expect(store.getGates()).toEqual({
      isAuthenticated: false,
      hasData: false,
    })

    store.set('user', 'alice', user)
    expect(store.getGates().isAuthenticated).toBe(true)
    expect(store.isGated('isAuthenticated')).toBe(true)
    expect(store.isGated('hasData')).toBe(false)
  })

  it('gates and when are independent', () => {
    const store = createStore({
      name: 'gate-when-test',
      initial: { items: [] as string[], user: null as string | null },
      when: {
        isEmpty: (s) => s.items.length === 0,
      },
      gates: {
        isAuthenticated: (s) => s.user !== null,
      },
    })

    // When and gates are separate
    expect(store.getWhen().isEmpty).toBe(true)
    expect(store.getGates().isAuthenticated).toBe(false)

    // Changing user doesn't affect when
    store.set('user', 'bob', user)
    expect(store.getWhen().isEmpty).toBe(true)
    expect(store.getGates().isAuthenticated).toBe(true)
  })

  it('isGated returns false for non-existent gates', () => {
    const store = createStore({
      name: 'gate-missing',
      initial: {},
    })
    expect(store.isGated('nonexistent')).toBe(false)
  })

  it('getGates returns empty object when no gates defined', () => {
    const store = createStore({
      name: 'no-gates',
      initial: { x: 1 },
    })
    expect(store.getGates()).toEqual({})
  })
})
