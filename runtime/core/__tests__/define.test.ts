import { describe, it, expect, beforeEach } from 'vitest'
import { z } from 'zod'
import { defineStore } from '../define.js'
import { storeRegistry } from '../store.js'
import { createHumanActor } from '../actor.js'

const user = createHumanActor('testUser')

beforeEach(() => {
  storeRegistry.clear()
})

describe('defineStore', () => {
  it('creates a store with schema and returns both', () => {
    const result = defineStore({
      name: 'ds-test',
      schema: z.object({ count: z.number() }),
      initial: { count: 0 },
    })

    expect(result.store).toBeDefined()
    expect(result.schema).toBeDefined()
    expect(result.store.name).toBe('ds-test')
    expect(result.store.getState().count).toBe(0)
  })

  it('validates initial state against schema', () => {
    expect(() =>
      defineStore({
        name: 'ds-invalid',
        schema: z.object({ count: z.number() }),
        initial: { count: 'not a number' } as any,
      })
    ).toThrow()
  })

  it('supports when conditions', () => {
    const { store } = defineStore({
      name: 'ds-when',
      schema: z.object({ items: z.array(z.string()) }),
      initial: { items: [] },
      when: {
        isEmpty: (s) => s.items.length === 0,
      },
    })

    expect(store.getWhen().isEmpty).toBe(true)
  })

  it('supports gates', () => {
    const { store } = defineStore({
      name: 'ds-gates',
      schema: z.object({ user: z.string().nullable() }),
      initial: { user: null },
      gates: {
        isAuthenticated: (s) => s.user !== null,
      },
    })

    expect(store.getGates().isAuthenticated).toBe(false)
  })

  it('supports computed values', () => {
    const { store } = defineStore({
      name: 'ds-computed',
      schema: z.object({ items: z.array(z.number()) }),
      initial: { items: [1, 2, 3] },
      computed: {
        sum: (s) => s.items.reduce((a, b) => a + b, 0),
      },
    })

    expect(store.computed<number>('sum')).toBe(6)
  })

  it('registers store in global registry', () => {
    defineStore({
      name: 'ds-registry',
      schema: z.object({ x: z.number() }),
      initial: { x: 0 },
    })

    expect(storeRegistry.has('ds-registry')).toBe(true)
  })
})
