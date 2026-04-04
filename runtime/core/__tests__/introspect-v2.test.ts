import { describe, it, expect, beforeEach } from 'vitest'
import { z } from 'zod'
import { createStore, storeRegistry } from '../store.js'
import { defineStore } from '../define.js'
import { createHumanActor } from '../actor.js'
import { introspectStore } from '../introspect.js'

const user = createHumanActor('testUser')

beforeEach(() => {
  storeRegistry.clear()
})

describe('introspectStore — modes', () => {
  it('returns currentMode and modes for discriminated union stores', () => {
    const { store } = defineStore({
      name: 'mode-test',
      schema: z.discriminatedUnion('status', [
        z.object({ status: z.literal('idle') }),
        z.object({ status: z.literal('loading'), progress: z.number() }),
        z.object({ status: z.literal('done'), result: z.string() }),
      ]),
      initial: { status: 'idle' as const },
    })

    const result = introspectStore(store)
    expect(result.currentMode).toBe('idle')
    expect(result.modes).toEqual(expect.arrayContaining(['idle', 'loading', 'done']))
    expect(result.modes).toHaveLength(3)
  })

  it('omits mode fields for plain object stores', () => {
    const store = createStore({
      name: 'plain',
      initial: { count: 0 },
    })

    const result = introspectStore(store)
    expect(result.currentMode).toBeUndefined()
    expect(result.modes).toBeUndefined()
  })
})

describe('introspectStore — transitions', () => {
  it('returns validTransitions from current mode', () => {
    const { store } = defineStore({
      name: 'trans-test',
      schema: z.discriminatedUnion('status', [
        z.object({ status: z.literal('idle') }),
        z.object({ status: z.literal('loading'), progress: z.number() }),
        z.object({ status: z.literal('done'), result: z.string() }),
        z.object({ status: z.literal('error'), error: z.string() }),
      ]),
      initial: { status: 'idle' as const },
      transitions: {
        'idle -> loading': 'start',
        'loading -> done': 'complete',
        'loading -> error': 'fail',
        'error -> idle': 'retry',
      },
    })

    const result = introspectStore(store)
    expect(result.validTransitions).toEqual(['loading'])
  })

  it('omits validTransitions for stores without transition graph', () => {
    const { store } = defineStore({
      name: 'no-trans',
      schema: z.discriminatedUnion('status', [
        z.object({ status: z.literal('idle') }),
        z.object({ status: z.literal('active') }),
      ]),
      initial: { status: 'idle' as const },
    })

    const result = introspectStore(store)
    expect(result.validTransitions).toBeUndefined()
  })
})

describe('introspectStore — effects', () => {
  it('returns effect names and status', () => {
    const { store } = defineStore({
      name: 'effect-test',
      schema: z.object({ query: z.string() }),
      initial: { query: '' },
      effects: {
        search: {
          watch: 'query',
          handler: async () => {},
        },
        log: {
          watch: 'query',
          handler: () => {},
        },
      },
    })

    const result = introspectStore(store)
    expect(result.effects).toBeDefined()
    expect(result.effects).toHaveProperty('search')
    expect(result.effects).toHaveProperty('log')
    // Effects start idle
    expect(result.effects!.search).toBe('idle')
    expect(result.effects!.log).toBe('idle')

    store.destroy()
  })

  it('omits effects for stores without effects', () => {
    const store = createStore({
      name: 'no-effects',
      initial: { v: 0 },
    })

    const result = introspectStore(store)
    expect(result.effects).toBeUndefined()
  })
})

describe('introspectStore — selectors', () => {
  it('returns selectorPaths for schema-based stores', () => {
    const { store } = defineStore({
      name: 'sel-test',
      schema: z.object({
        name: z.string(),
        age: z.number(),
        address: z.object({
          city: z.string(),
          zip: z.string(),
        }),
      }),
      initial: { name: '', age: 0, address: { city: '', zip: '' } },
    })

    const result = introspectStore(store)
    expect(result.selectorPaths).toBeDefined()
    expect(result.selectorPaths).toContain('name')
    expect(result.selectorPaths).toContain('age')
    expect(result.selectorPaths).toContain('address')
    expect(result.selectorPaths).toContain('address.city')
    expect(result.selectorPaths).toContain('address.zip')
  })

  it('omits selectorPaths for stores without schema', () => {
    const store = createStore({
      name: 'no-schema',
      initial: { x: 1 },
    })

    const result = introspectStore(store)
    expect(result.selectorPaths).toBeUndefined()
  })
})

describe('introspectStore — properties', () => {
  it('returns property check results', () => {
    const { store } = defineStore({
      name: 'prop-test',
      schema: z.object({ count: z.number() }),
      initial: { count: 5 },
      properties: {
        positive: (s) => s.count >= 0,
        nonZero: (s) => s.count !== 0,
      },
    })

    const result = introspectStore(store)
    expect(result.properties).toEqual({ positive: true, nonZero: true })
  })

  it('omits properties for stores without property checks', () => {
    const store = createStore({
      name: 'no-props',
      initial: { v: 0 },
    })

    const result = introspectStore(store)
    expect(result.properties).toBeUndefined()
  })
})

describe('introspectStore — undo', () => {
  it('returns undoEnabled and canRedo', () => {
    const { store } = defineStore({
      name: 'undo-test',
      schema: z.object({ value: z.string() }),
      initial: { value: '' },
      undo: { limit: 10 },
    })

    let result = introspectStore(store)
    expect(result.undoEnabled).toBe(true)
    expect(result.canRedo).toBe(false)

    // Make a change and undo it
    store.set('value', 'hello', user)
    store.undo()

    result = introspectStore(store)
    expect(result.canRedo).toBe(true)
  })

  it('returns undoEnabled false for stores without undo', () => {
    const store = createStore({
      name: 'no-undo',
      initial: { v: 0 },
    })

    const result = introspectStore(store)
    expect(result.undoEnabled).toBe(false)
    expect(result.canRedo).toBeUndefined()
  })
})

describe('introspectStore — pub/sub', () => {
  it('returns publishes and subscribes event names', () => {
    const { store } = defineStore({
      name: 'pubsub-test',
      schema: z.object({ count: z.number() }),
      initial: { count: 0 },
      publishes: {
        countChanged: (prev, next) =>
          (prev as any).count !== (next as any).count,
      },
      subscribes: {
        'other.reset': (store) => {
          // no-op
        },
      },
    })

    const result = introspectStore(store)
    expect(result.publishes).toEqual(['countChanged'])
    expect(result.subscribes).toEqual(['other.reset'])

    store.destroy()
  })

  it('omits pub/sub for stores without events', () => {
    const store = createStore({
      name: 'no-pubsub',
      initial: { v: 0 },
    })

    const result = introspectStore(store)
    expect(result.publishes).toBeUndefined()
    expect(result.subscribes).toBeUndefined()
  })
})

describe('introspectStore — plain store omits extended fields', () => {
  it('returns only base fields for a minimal store', () => {
    const store = createStore({
      name: 'minimal',
      initial: { x: 1 },
    })

    const result = introspectStore(store)

    // Base fields present
    expect(result.name).toBe('minimal')
    expect(result.state).toEqual({ x: 1 })
    expect(result.when).toEqual({})
    expect(result.gates).toEqual({})
    expect(result.computed).toEqual({})
    expect(result.historyLength).toBe(0)

    // Extended fields absent
    expect(result.currentMode).toBeUndefined()
    expect(result.modes).toBeUndefined()
    expect(result.validTransitions).toBeUndefined()
    expect(result.effects).toBeUndefined()
    expect(result.selectorPaths).toBeUndefined()
    expect(result.properties).toBeUndefined()
    expect(result.undoEnabled).toBe(false)
    expect(result.canRedo).toBeUndefined()
    expect(result.publishes).toBeUndefined()
    expect(result.subscribes).toBeUndefined()
  })
})
