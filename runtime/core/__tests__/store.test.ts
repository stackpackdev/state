import { describe, it, expect, beforeEach } from 'vitest'
import { createStore, getStore, getAllStores, storeRegistry } from '../store.js'
import { createHumanActor, createAgentActor } from '../actor.js'

const user = createHumanActor('testUser')

beforeEach(() => {
  storeRegistry.clear()
})

describe('createStore', () => {
  it('creates a store with initial state', () => {
    const store = createStore({ name: 'test', initial: { count: 0 } })
    expect(store.name).toBe('test')
    expect(store.getState()).toEqual({ count: 0 })
  })

  it('registers in the global registry', () => {
    createStore({ name: 'registered', initial: {} })
    expect(storeRegistry.has('registered')).toBe(true)
    expect(getStore('registered')).toBeDefined()
  })

  it('initial state is used directly (no clone)', () => {
    const initial = { items: [1, 2, 3] }
    const store = createStore({ name: 'clone', initial })
    // Initial state is used directly — Immer produces new refs on mutation
    expect(store.getState()).toBe(initial)
  })
})

describe('store.set', () => {
  it('sets a value at a path', () => {
    const store = createStore({ name: 'set-test', initial: { count: 0, label: '' } })
    store.set('count', 5, user)
    expect(store.get('count')).toBe(5)
  })

  it('sets a nested value', () => {
    const store = createStore({ name: 'nested-set', initial: { user: { name: '', age: 0 } } })
    store.set('user.name', 'Alice', user)
    expect(store.get('user.name')).toBe('Alice')
    expect(store.get('user.age')).toBe(0) // untouched
  })

  it('produces immutable state', () => {
    const store = createStore({ name: 'immutable', initial: { a: 1 } })
    const before = store.getState()
    store.set('a', 2, user)
    const after = store.getState()
    expect(before).not.toBe(after)
    expect(before.a).toBe(1)
    expect(after.a).toBe(2)
  })
})

describe('store.update', () => {
  it('applies an Immer mutation', () => {
    const store = createStore({
      name: 'update-test',
      initial: { items: ['a', 'b'] },
    })
    store.update(draft => { draft.items.push('c') }, user)
    expect(store.get<string[]>('items')).toEqual(['a', 'b', 'c'])
  })
})

describe('store.reset', () => {
  it('resets state to a new value', () => {
    const store = createStore({ name: 'reset-test', initial: { x: 1 } })
    store.set('x', 99, user)
    store.reset({ x: 0 }, user)
    expect(store.getState()).toEqual({ x: 0 })
  })
})

describe('store.subscribe', () => {
  it('notifies listeners on change', () => {
    const store = createStore({ name: 'sub-test', initial: { v: 0 } })
    const calls: any[] = []
    store.subscribe((next, prev) => calls.push({ next, prev }))
    store.set('v', 1, user)
    expect(calls).toHaveLength(1)
    expect(calls[0].next.v).toBe(1)
    expect(calls[0].prev.v).toBe(0)
  })

  it('path-scoped listener only fires when that path changes', () => {
    const store = createStore({ name: 'scoped-sub', initial: { a: 1, b: 2 } })
    const calls: any[] = []
    store.subscribe((next) => calls.push(next), 'a')
    store.set('b', 99, user) // should NOT fire
    expect(calls).toHaveLength(0)
    store.set('a', 10, user) // should fire
    expect(calls).toHaveLength(1)
  })

  it('unsubscribe stops notifications', () => {
    const store = createStore({ name: 'unsub-test', initial: { v: 0 } })
    const calls: any[] = []
    const unsub = store.subscribe(() => calls.push(1))
    store.set('v', 1, user)
    expect(calls).toHaveLength(1)
    unsub()
    store.set('v', 2, user)
    expect(calls).toHaveLength(1) // no more
  })
})

describe('store.getHistory', () => {
  it('records actions with actor attribution', () => {
    const store = createStore({ name: 'history-test', initial: { x: 0 } })
    const ai = createAgentActor({ name: 'bot' })
    store.set('x', 1, user)
    store.set('x', 2, ai)
    const history = store.getHistory()
    expect(history).toHaveLength(2)
    expect(history[0].actor.name).toBe('bot')  // newest first
    expect(history[1].actor.name).toBe('testUser')
  })
})

describe('store.when', () => {
  it('evaluates when conditions', () => {
    const store = createStore({
      name: 'when-test',
      initial: { items: [] as string[], loading: false },
      when: {
        isEmpty: (s) => s.items.length === 0,
        isLoading: (s) => s.loading,
      },
    })
    const when = store.getWhen()
    expect(when.isEmpty).toBe(true)
    expect(when.isLoading).toBe(false)
  })

  it('isWhen checks a single condition', () => {
    const store = createStore({
      name: 'iswhen-test',
      initial: { count: 0 },
      when: { isZero: (s) => s.count === 0 },
    })
    expect(store.isWhen('isZero')).toBe(true)
    store.set('count', 5, user)
    expect(store.isWhen('isZero')).toBe(false)
  })
})

describe('store.destroy', () => {
  it('removes from registry and clears listeners', () => {
    const store = createStore({ name: 'destroy-test', initial: {} })
    expect(storeRegistry.has('destroy-test')).toBe(true)
    store.destroy()
    expect(storeRegistry.has('destroy-test')).toBe(false)
  })
})

describe('actor permission enforcement', () => {
  it('blocks writes from restricted agents', () => {
    const store = createStore({ name: 'perm-test', initial: { secret: 'original' } })
    const restricted = createAgentActor({
      name: 'restricted',
      permissions: [{ paths: ['public.*'], actions: ['read', 'write'] }],
    })
    store.set('secret', 'hacked', restricted)
    expect(store.get('secret')).toBe('original') // blocked
  })
})

describe('middleware', () => {
  it('enter can transform actions', () => {
    const store = createStore({
      name: 'mw-transform',
      initial: { count: 0 },
      middleware: [
        {
          name: 'doubler',
          enter: (action) => {
            if (action.type === 'SET' && action.path === 'count') {
              return { ...action, value: (action.value as number) * 2 }
            }
            return action
          },
        },
      ],
    })
    store.set('count', 5, user)
    expect(store.get('count')).toBe(10) // doubled by middleware
  })

  it('enter returning null cancels action', () => {
    const store = createStore({
      name: 'mw-cancel',
      initial: { locked: true },
      middleware: [
        {
          name: 'lock',
          enter: (action) => {
            if (action.path === 'locked') return null
            return action
          },
        },
      ],
    })
    store.set('locked', false, user)
    expect(store.get('locked')).toBe(true) // cancelled
  })

  it('leave runs after state change', () => {
    const leaveCalls: any[] = []
    const store = createStore({
      name: 'mw-leave',
      initial: { v: 0 },
      middleware: [
        {
          name: 'tracker',
          leave: (_action, prevState, nextState) => {
            leaveCalls.push({ prev: prevState, next: nextState })
          },
        },
      ],
    })
    store.set('v', 42, user)
    expect(leaveCalls).toHaveLength(1)
  })
})

describe('getAllStores', () => {
  it('returns all registered stores', () => {
    createStore({ name: 's1', initial: {} })
    createStore({ name: 's2', initial: {} })
    const all = getAllStores()
    expect(all.size).toBe(2)
    expect(all.has('s1')).toBe(true)
    expect(all.has('s2')).toBe(true)
  })
})
