import { describe, it, expect, beforeEach } from 'vitest'
import { together } from '../together.js'
import { createStore, storeRegistry } from '../store.js'
import { createFlow } from '../flow.js'
import { createHumanActor } from '../actor.js'

const user = createHumanActor('user')

beforeEach(() => {
  storeRegistry.clear()
})

describe('together', () => {
  it('groups stores under a name', () => {
    const cart = createStore({ name: 'cart', initial: { items: [] } })
    const shipping = createStore({ name: 'shipping', initial: { address: '' } })
    const group = together({ name: 'checkout', stores: { cart, shipping } })

    expect(group.name).toBe('checkout')
    expect(Object.keys(group.stores)).toEqual(['cart', 'shipping'])
  })

  it('retrieves stores by key', () => {
    const cart = createStore({ name: 'cart2', initial: { items: [] } })
    const group = together({ name: 'checkout2', stores: { cart } })

    const retrieved = group.store('cart')
    expect(retrieved).toBe(cart)
  })

  it('throws on unknown store key', () => {
    const group = together({ name: 'empty', stores: {} })
    expect(() => group.store('missing')).toThrow('store "missing" not found')
  })

  it('can include a flow', () => {
    const flow = createFlow({
      name: 'checkout-flow',
      states: ['Cart', 'Shipping', 'Done'],
      initial: 'Cart',
    })
    const group = together({
      name: 'checkout3',
      stores: { cart: createStore({ name: 'c3', initial: {} }) },
      flow,
    })
    expect(group.flow).toBe(flow)
    expect(group.flow!.current()).toBe('Cart')
  })

  it('destroy cleans up all stores', () => {
    const s1 = createStore({ name: 'tg-s1', initial: {} })
    const s2 = createStore({ name: 'tg-s2', initial: {} })
    const group = together({ name: 'tg', stores: { s1, s2 } })

    expect(storeRegistry.has('tg-s1')).toBe(true)
    group.destroy()
    expect(storeRegistry.has('tg-s1')).toBe(false)
    expect(storeRegistry.has('tg-s2')).toBe(false)
  })
})
