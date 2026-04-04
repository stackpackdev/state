import { describe, it, expect, beforeEach } from 'vitest'
import { getDefaultActor } from '../actor.js'
import { createStore, storeRegistry } from '../store.js'

beforeEach(() => {
  storeRegistry.clear()
})

describe('getDefaultActor', () => {
  it('returns a human actor named "user"', () => {
    const actor = getDefaultActor()
    expect(actor.type).toBe('human')
    expect(actor.name).toBe('user')
  })

  it('returns the same instance on repeated calls', () => {
    const a1 = getDefaultActor()
    const a2 = getDefaultActor()
    expect(a1).toBe(a2)
  })

  it('has full permissions', () => {
    const actor = getDefaultActor()
    expect(actor.permissions).toBeDefined()
    expect(actor.permissions![0].paths).toContain('*')
    expect(actor.permissions![0].actions).toContain('read')
    expect(actor.permissions![0].actions).toContain('write')
    expect(actor.permissions![0].actions).toContain('delete')
  })
})

describe('store methods without explicit actor (2.2)', () => {
  it('store.set works without actor', () => {
    const store = createStore({
      name: 'set-no-actor',
      initial: { name: 'Alice' },
    })
    store.set('name', 'Bob')
    expect(store.get('name')).toBe('Bob')
  })

  it('store.update works without actor', () => {
    const store = createStore({
      name: 'update-no-actor',
      initial: { count: 0 },
    })
    store.update((d: any) => { d.count = 5 })
    expect(store.get('count')).toBe(5)
  })

  it('store.reset works without actor', () => {
    const store = createStore({
      name: 'reset-no-actor',
      initial: { x: 1 },
    })
    store.set('x', 99)
    store.reset({ x: 1 })
    expect(store.get('x')).toBe(1)
  })

  it('store.delete works without actor', () => {
    const store = createStore({
      name: 'delete-no-actor',
      initial: { a: 1, b: 2 } as Record<string, number>,
    })
    store.delete('b')
    expect(store.get('b')).toBeUndefined()
    expect(store.get('a')).toBe(1)
  })

  it('explicit actor still takes precedence', () => {
    const store = createStore({
      name: 'explicit-actor',
      initial: { x: 1 },
    })
    const customActor = { id: 'custom', type: 'agent' as const, name: 'bot', permissions: [{ paths: ['*'], actions: ['read' as const, 'write' as const, 'delete' as const] }] }
    store.set('x', 42, customActor)
    expect(store.get('x')).toBe(42)
    const history = store.getHistory()
    expect(history[0].actor.id).toBe('custom')
  })
})

describe('store.delete', () => {
  it('deletes a path from state', () => {
    const store = createStore({
      name: 'delete-test',
      initial: { a: 1, b: 2 } as Record<string, number>,
    })
    const actor = getDefaultActor()
    store.delete('b', actor)
    expect(store.get('b')).toBeUndefined()
    expect(store.get('a')).toBe(1)
  })

  it('deletes a nested path', () => {
    const store = createStore({
      name: 'delete-nested',
      initial: { user: { name: 'Alice', age: 30 } as Record<string, unknown> },
    })
    const actor = getDefaultActor()
    store.delete('user.age', actor)
    expect(store.get('user.name')).toBe('Alice')
    expect(store.get('user.age')).toBeUndefined()
  })

  it('records delete in history', () => {
    const store = createStore({
      name: 'delete-history',
      initial: { x: 1 } as Record<string, unknown>,
    })
    const actor = getDefaultActor()
    store.delete('x', actor)
    const history = store.getHistory()
    expect(history[0].type).toBe('DELETE')
    expect(history[0].path).toBe('x')
  })
})
