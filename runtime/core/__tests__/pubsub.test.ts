import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createStore, storeRegistry } from '../store.js'
import { createEventBus, eventBus } from '../pubsub.js'
import { createHumanActor } from '../actor.js'
import type { StoreEventHandler } from '../pubsub.js'

const user = createHumanActor('testUser')

beforeEach(() => {
  storeRegistry.clear()
  eventBus.clear()
})

describe('createEventBus', () => {
  it('publisher emits event when condition matches', async () => {
    const handler = vi.fn()

    const authStore = createStore({
      name: 'auth',
      initial: { authenticated: false, token: null as string | null },
      publishes: {
        authenticated: (prev: any, next: any) =>
          !prev.authenticated && next.authenticated,
      },
    })

    createStore({
      name: 'dashboard',
      initial: { loaded: false },
      subscribes: {
        'auth.authenticated': handler,
      },
    })

    authStore.set('authenticated', true, user)

    // Subscribers are async (Promise.resolve().then)
    await new Promise(r => setTimeout(r, 0))

    expect(handler).toHaveBeenCalledTimes(1)
    expect(handler).toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'authenticated',
        source: 'auth',
      })
    )
  })

  it('subscriber receives event with correct context', async () => {
    let receivedContext: any = null

    const authStore = createStore({
      name: 'auth',
      initial: { loggedIn: false },
      publishes: {
        login: (prev: any, next: any) => !prev.loggedIn && next.loggedIn,
      },
    })

    createStore({
      name: 'profile',
      initial: {},
      subscribes: {
        'auth.login': (ctx) => {
          receivedContext = ctx
        },
      },
    })

    authStore.set('loggedIn', true, user)
    await new Promise(r => setTimeout(r, 0))

    expect(receivedContext).not.toBeNull()
    expect(receivedContext.event).toBe('login')
    expect(receivedContext.source).toBe('auth')
    expect(receivedContext.store).toBeDefined()
    expect(receivedContext.store.name).toBe('auth')
    expect(receivedContext.actor).toEqual({
      id: 'pubsub-system',
      type: 'system',
      name: 'event-bus',
    })
  })

  it('event not emitted when condition returns false', async () => {
    const handler = vi.fn()

    const store = createStore({
      name: 'counter',
      initial: { count: 0 },
      publishes: {
        exceeded: (prev: any, next: any) => next.count > 10,
      },
    })

    createStore({
      name: 'alerter',
      initial: {},
      subscribes: {
        'counter.exceeded': handler,
      },
    })

    store.set('count', 5, user)
    await new Promise(r => setTimeout(r, 0))

    expect(handler).not.toHaveBeenCalled()
  })

  it('"storeName.eventName" format works for subscribers', async () => {
    const handler = vi.fn()

    const cartStore = createStore({
      name: 'cart',
      initial: { items: [] as string[] },
      publishes: {
        itemAdded: (prev: any, next: any) => next.items.length > prev.items.length,
      },
    })

    createStore({
      name: 'analytics',
      initial: {},
      subscribes: {
        'cart.itemAdded': handler,
      },
    })

    cartStore.set('items', ['widget'], user)
    await new Promise(r => setTimeout(r, 0))

    expect(handler).toHaveBeenCalledTimes(1)
    expect(handler).toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'itemAdded',
        source: 'cart',
      })
    )
  })

  it('getGraph returns correct topology', () => {
    createStore({
      name: 'auth',
      initial: { loggedIn: false },
      publishes: {
        login: () => true,
        logout: () => true,
      },
    })

    createStore({
      name: 'dashboard',
      initial: {},
      subscribes: {
        'auth.login': () => {},
      },
    })

    createStore({
      name: 'notifications',
      initial: {},
      subscribes: {
        'auth.login': () => {},
        'auth.logout': () => {},
      },
    })

    const graph = eventBus.getGraph()

    expect(graph['auth.login']).toBeDefined()
    expect(graph['auth.login'].publishers).toContain('auth')
    expect(graph['auth.login'].subscribers).toContain('dashboard')
    expect(graph['auth.login'].subscribers).toContain('notifications')

    expect(graph['auth.logout']).toBeDefined()
    expect(graph['auth.logout'].publishers).toContain('auth')
    expect(graph['auth.logout'].subscribers).toContain('notifications')
  })

  it('subscriber error does not crash publisher', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const goodHandler = vi.fn()

    const store = createStore({
      name: 'source',
      initial: { value: 0 },
      publishes: {
        changed: () => true,
      },
    })

    createStore({
      name: 'broken',
      initial: {},
      subscribes: {
        'source.changed': () => {
          throw new Error('subscriber broke')
        },
      },
    })

    createStore({
      name: 'working',
      initial: {},
      subscribes: {
        'source.changed': goodHandler,
      },
    })

    // This should not throw
    store.set('value', 1, user)
    await new Promise(r => setTimeout(r, 0))

    expect(goodHandler).toHaveBeenCalledTimes(1)
    expect(warnSpy).toHaveBeenCalled()

    warnSpy.mockRestore()
  })

  it('event depth limit prevents infinite loops', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

    // Use a standalone event bus to test depth limiting
    const bus = createEventBus()
    bus._setStoreResolver((name) => storeRegistry.get(name))

    let emitCount = 0

    // Create a store that publishes on every change
    const pingStore = createStore({
      name: 'ping',
      initial: { count: 0 },
    })

    // Manually register a publisher and subscriber that create a cycle
    bus.registerPublisher('ping', {
      tick: () => true,
    })

    bus.registerSubscriber('ping', {
      'ping.tick': () => {
        emitCount++
        // Trigger another emission — should be depth-limited
        bus.checkAndEmit('ping', {}, {})
      },
    })

    bus.checkAndEmit('ping', { count: 0 }, { count: 1 })
    await new Promise(r => setTimeout(r, 50))

    // Should have been limited (max depth 5)
    expect(emitCount).toBeLessThanOrEqual(5)
    expect(warnSpy).toHaveBeenCalled()

    warnSpy.mockRestore()
    bus.clear()
  })

  it('unregister removes publisher and subscriber', async () => {
    const handler = vi.fn()

    const authStore = createStore({
      name: 'auth',
      initial: { loggedIn: false },
      publishes: {
        login: (prev: any, next: any) => !prev.loggedIn && next.loggedIn,
      },
    })

    createStore({
      name: 'dashboard',
      initial: {},
      subscribes: {
        'auth.login': handler,
      },
    })

    // Unregister auth store from event bus
    eventBus.unregister('auth')

    authStore.set('loggedIn', true, user)
    await new Promise(r => setTimeout(r, 0))

    // Should NOT be called since publisher was unregistered
    expect(handler).not.toHaveBeenCalled()

    // Graph should not contain auth as a publisher
    const graph = eventBus.getGraph()
    expect(graph['auth.login']?.publishers ?? []).not.toContain('auth')
  })

  it('store without pub/sub works normally (backward compat)', () => {
    const store = createStore({
      name: 'simple',
      initial: { value: 'hello' },
    })

    store.set('value', 'world', user)
    expect(store.getState()).toEqual({ value: 'world' })

    // No errors, no events
    const graph = eventBus.getGraph()
    expect(Object.keys(graph).length).toBe(0)
  })

  it('multiple subscribers receive same event', async () => {
    const handler1 = vi.fn()
    const handler2 = vi.fn()
    const handler3 = vi.fn()

    const store = createStore({
      name: 'emitter',
      initial: { active: false },
      publishes: {
        activated: (prev: any, next: any) => !prev.active && next.active,
      },
    })

    createStore({
      name: 'sub1',
      initial: {},
      subscribes: { 'emitter.activated': handler1 },
    })

    createStore({
      name: 'sub2',
      initial: {},
      subscribes: { 'emitter.activated': handler2 },
    })

    createStore({
      name: 'sub3',
      initial: {},
      subscribes: { 'emitter.activated': handler3 },
    })

    store.set('active', true, user)
    await new Promise(r => setTimeout(r, 0))

    expect(handler1).toHaveBeenCalledTimes(1)
    expect(handler2).toHaveBeenCalledTimes(1)
    expect(handler3).toHaveBeenCalledTimes(1)
  })
})
