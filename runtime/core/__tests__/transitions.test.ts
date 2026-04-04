import { describe, it, expect, beforeEach, vi } from 'vitest'
import { z } from 'zod'
import { createTransitionGraph } from '../transitions.js'
import { createStore, storeRegistry } from '../store.js'
import { defineStore } from '../define.js'
import { createHumanActor } from '../actor.js'

const user = createHumanActor('testUser')

beforeEach(() => {
  storeRegistry.clear()
})

// ─── Checkout schema used across tests ──────────────────────────

const checkoutSchema = z.discriminatedUnion('step', [
  z.object({ step: z.literal('cart'), items: z.number() }),
  z.object({ step: z.literal('shipping'), address: z.string() }),
  z.object({ step: z.literal('payment'), method: z.string() }),
  z.object({ step: z.literal('confirmed'), orderId: z.string() }),
])

// ─── createTransitionGraph ──────────────────────────────────────

describe('createTransitionGraph', () => {
  it('parses "from -> to" keys correctly', () => {
    const graph = createTransitionGraph({
      'cart -> shipping': 'proceedToShipping',
      'shipping -> payment': 'proceedToPayment',
    })

    expect(graph.canTransition('cart', 'shipping')).toBe(true)
    expect(graph.canTransition('shipping', 'payment')).toBe(true)
  })

  it('canTransition returns true for declared transitions', () => {
    const graph = createTransitionGraph({
      'idle -> loading': 'load',
      'loading -> done': 'finish',
    })

    expect(graph.canTransition('idle', 'loading')).toBe(true)
    expect(graph.canTransition('loading', 'done')).toBe(true)
  })

  it('canTransition returns false for undeclared transitions', () => {
    const graph = createTransitionGraph({
      'idle -> loading': 'load',
      'loading -> done': 'finish',
    })

    expect(graph.canTransition('idle', 'done')).toBe(false)
    expect(graph.canTransition('done', 'idle')).toBe(false)
    expect(graph.canTransition('loading', 'idle')).toBe(false)
  })

  it('wildcard "*" source matches any mode', () => {
    const graph = createTransitionGraph({
      'cart -> shipping': 'proceedToShipping',
      '* -> cart': 'reset',
    })

    expect(graph.canTransition('shipping', 'cart')).toBe(true)
    expect(graph.canTransition('payment', 'cart')).toBe(true)
    expect(graph.canTransition('confirmed', 'cart')).toBe(true)
    // Non-wildcard still works
    expect(graph.canTransition('cart', 'shipping')).toBe(true)
    // Not declared
    expect(graph.canTransition('cart', 'payment')).toBe(false)
  })

  it('validTargets returns correct list including wildcards', () => {
    const graph = createTransitionGraph({
      'cart -> shipping': 'proceedToShipping',
      'shipping -> payment': 'proceedToPayment',
      '* -> cart': 'reset',
    })

    const cartTargets = graph.validTargets('cart')
    expect(cartTargets).toContain('shipping')
    expect(cartTargets).toContain('cart') // wildcard

    const shippingTargets = graph.validTargets('shipping')
    expect(shippingTargets).toContain('payment')
    expect(shippingTargets).toContain('cart') // wildcard
  })

  it('transitionName returns the declared name', () => {
    const graph = createTransitionGraph({
      'cart -> shipping': 'proceedToShipping',
      '* -> cart': 'reset',
    })

    expect(graph.transitionName('cart', 'shipping')).toBe('proceedToShipping')
    expect(graph.transitionName('shipping', 'cart')).toBe('reset')
    expect(graph.transitionName('cart', 'payment')).toBeUndefined()
  })

  it('validate warns on unreachable states', () => {
    const graph = createTransitionGraph({
      'a -> b': 'goB',
      'b -> c': 'goC',
    })

    const result = graph.validate(['a', 'b', 'c'])
    // 'a' is unreachable — no transition leads to it
    expect(result.warnings.some(w => w.includes('Unreachable') && w.includes('"a"'))).toBe(true)
  })

  it('validate warns on dead ends (no outgoing)', () => {
    const graph = createTransitionGraph({
      'a -> b': 'goB',
      'b -> c': 'goC',
    })

    const result = graph.validate(['a', 'b', 'c'])
    // 'c' is a dead end — no outgoing transitions
    expect(result.warnings.some(w => w.includes('Dead end') && w.includes('"c"'))).toBe(true)
  })

  it('validate errors on self-loops', () => {
    const graph = createTransitionGraph({
      'a -> a': 'selfLoop',
      'a -> b': 'goB',
    })

    const result = graph.validate(['a', 'b'])
    expect(result.errors.some(e => e.includes('Self-loop') && e.includes('"a"'))).toBe(true)
  })

  it('throws on invalid key format', () => {
    expect(() => createTransitionGraph({ 'invalid': 'bad' }))
      .toThrow('Invalid transition key')
  })
})

// ─── Store integration ──────────────────────────────────────────

describe('store with transitions', () => {
  it('rejects invalid mode transitions', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

    const store = createStore({
      name: 'checkout-reject',
      stateSchema: checkoutSchema,
      initial: { step: 'cart' as const, items: 3 },
      transitions: {
        'cart -> shipping': 'proceedToShipping',
        'shipping -> payment': 'proceedToPayment',
        'payment -> confirmed': 'confirm',
      },
    })

    // Try invalid transition: cart -> confirmed (skipping steps)
    store.update(
      () => ({ step: 'confirmed' as const, orderId: 'ord-123' }),
      user
    )

    // Should be rolled back — still in cart
    expect(store.getState().step).toBe('cart')
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('transition "cart -> confirmed" is not declared')
    )

    warnSpy.mockRestore()
  })

  it('allows valid mode transitions', () => {
    const store = createStore({
      name: 'checkout-allow',
      stateSchema: checkoutSchema,
      initial: { step: 'cart' as const, items: 3 },
      transitions: {
        'cart -> shipping': 'proceedToShipping',
        'shipping -> payment': 'proceedToPayment',
        'payment -> confirmed': 'confirm',
      },
    })

    // Valid transition: cart -> shipping
    store.update(
      () => ({ step: 'shipping' as const, address: '123 Main St' }),
      user
    )
    expect(store.getState().step).toBe('shipping')

    // Valid transition: shipping -> payment
    store.update(
      () => ({ step: 'payment' as const, method: 'credit' }),
      user
    )
    expect(store.getState().step).toBe('payment')
  })

  it('store without transitions allows any transition (backward compat)', () => {
    const store = createStore({
      name: 'checkout-noguard',
      stateSchema: checkoutSchema,
      initial: { step: 'cart' as const, items: 3 },
    })

    // Jump directly from cart to confirmed — no transitions declared, so it should work
    store.update(
      () => ({ step: 'confirmed' as const, orderId: 'ord-456' }),
      user
    )
    expect(store.getState().step).toBe('confirmed')
  })

  it('canTransition and validTargets on store object work', () => {
    const store = createStore({
      name: 'checkout-methods',
      stateSchema: checkoutSchema,
      initial: { step: 'cart' as const, items: 3 },
      transitions: {
        'cart -> shipping': 'proceedToShipping',
        'shipping -> payment': 'proceedToPayment',
        'payment -> confirmed': 'confirm',
        '* -> cart': 'reset',
      },
    })

    // canTransition
    expect(store.canTransition!('cart', 'shipping')).toBe(true)
    expect(store.canTransition!('cart', 'confirmed')).toBe(false)
    expect(store.canTransition!('confirmed', 'cart')).toBe(true) // wildcard

    // validTargets with explicit from
    const cartTargets = store.validTargets!('cart')
    expect(cartTargets).toContain('shipping')
    expect(cartTargets).toContain('cart') // wildcard

    // validTargets without argument uses current mode
    const currentTargets = store.validTargets!()
    expect(currentTargets).toContain('shipping')
    expect(currentTargets).toContain('cart')
  })

  it('store without transitions does not have canTransition/validTargets', () => {
    const store = createStore({
      name: 'checkout-nograph',
      stateSchema: checkoutSchema,
      initial: { step: 'cart' as const, items: 3 },
    })

    expect(store.canTransition).toBeUndefined()
    expect(store.validTargets).toBeUndefined()
  })

  it('defineStore passes transitions through', () => {
    const { store } = defineStore({
      name: 'checkout-define',
      schema: checkoutSchema,
      initial: { step: 'cart' as const, items: 3 },
      transitions: {
        'cart -> shipping': 'proceedToShipping',
        'shipping -> payment': 'proceedToPayment',
      },
    })

    expect(store.canTransition!('cart', 'shipping')).toBe(true)
    expect(store.canTransition!('cart', 'payment')).toBe(false)
  })
})
