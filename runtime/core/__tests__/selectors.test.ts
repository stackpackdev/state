import { describe, it, expect, beforeEach } from 'vitest'
import { z } from 'zod'
import { buildSelectorTree } from '../selectors.js'
import { createStore, storeRegistry } from '../store.js'
import { defineStore } from '../define.js'

beforeEach(() => {
  storeRegistry.clear()
})

describe('buildSelectorTree', () => {
  it('creates correct $path for flat schema', () => {
    const schema = z.object({
      name: z.string(),
      age: z.number(),
      active: z.boolean(),
    })

    const tree = buildSelectorTree(schema)

    expect(tree.name.$path).toBe('name')
    expect(tree.age.$path).toBe('age')
    expect(tree.active.$path).toBe('active')
  })

  it('creates correct $path for nested schema', () => {
    const schema = z.object({
      user: z.object({
        profile: z.object({
          email: z.string(),
        }),
        settings: z.object({
          theme: z.string(),
        }),
      }),
    })

    const tree = buildSelectorTree(schema)

    expect(tree.user.$path).toBe('user')
    expect(tree.user.profile.$path).toBe('user.profile')
    expect(tree.user.profile.email.$path).toBe('user.profile.email')
    expect(tree.user.settings.$path).toBe('user.settings')
    expect(tree.user.settings.theme.$path).toBe('user.settings.theme')
  })

  it('$select functions return correct values from state', () => {
    const schema = z.object({
      count: z.number(),
      user: z.object({
        name: z.string(),
      }),
    })

    const tree = buildSelectorTree(schema)
    const state = { count: 42, user: { name: 'Alice' } }

    expect(tree.count.$select(state)).toBe(42)
    expect(tree.user.$select(state)).toEqual({ name: 'Alice' })
    expect(tree.user.name.$select(state)).toBe('Alice')
  })

  it('array fields get a single selector (whole array, not per-item)', () => {
    const schema = z.object({
      items: z.array(z.object({ id: z.number(), text: z.string() })),
      tags: z.array(z.string()),
    })

    const tree = buildSelectorTree(schema)
    const state = {
      items: [{ id: 1, text: 'hello' }],
      tags: ['a', 'b'],
    }

    // Array fields have $path and $select but no child selectors
    expect(tree.items.$path).toBe('items')
    expect(tree.items.$select(state)).toEqual([{ id: 1, text: 'hello' }])
    expect(tree.tags.$path).toBe('tags')
    expect(tree.tags.$select(state)).toEqual(['a', 'b'])

    // No per-item access (no .0, .1, etc.)
    expect((tree.items as any).id).toBeUndefined()
    expect((tree.items as any)[0]).toBeUndefined()
  })

  it('selector tree is frozen/immutable', () => {
    const schema = z.object({
      name: z.string(),
      nested: z.object({ x: z.number() }),
    })

    const tree = buildSelectorTree(schema)

    expect(Object.isFrozen(tree)).toBe(true)
    expect(() => {
      ;(tree as any).extra = 'fail'
    }).toThrow()
  })

  it('handles discriminated union with discriminant-only selectors', () => {
    const schema = z.discriminatedUnion('type', [
      z.object({ type: z.literal('text'), content: z.string() }),
      z.object({ type: z.literal('image'), url: z.string() }),
    ])

    const tree = buildSelectorTree(schema)
    const state = { type: 'text', content: 'hello' }

    expect(tree.type.$path).toBe('type')
    expect(tree.type.$select(state)).toBe('text')
    // Only discriminant field, not variant-specific fields
    expect((tree as any).content).toBeUndefined()
    expect((tree as any).url).toBeUndefined()
  })
})

describe('store.select', () => {
  it('is populated when stateSchema is provided', () => {
    const store = createStore({
      name: 'select-test',
      stateSchema: z.object({
        count: z.number(),
        label: z.string(),
      }),
      initial: { count: 0, label: 'hi' },
    })

    expect(store.select).toBeDefined()
    expect(store.select.count.$path).toBe('count')
    expect(store.select.label.$path).toBe('label')
    expect(store.select.count.$select(store.getState())).toBe(0)
  })

  it('is undefined when no stateSchema is provided', () => {
    const store = createStore({
      name: 'no-schema',
      initial: { x: 1 },
    })

    expect(store.select).toBeUndefined()
  })
})

describe('defineStore select', () => {
  it('result includes select tree', () => {
    const { store, select } = defineStore({
      name: 'define-select-test',
      schema: z.object({
        title: z.string(),
        meta: z.object({
          version: z.number(),
        }),
      }),
      initial: { title: 'test', meta: { version: 1 } },
    })

    expect(select).toBeDefined()
    expect(select.title.$path).toBe('title')
    expect(select.meta.$path).toBe('meta')
    expect(select.meta.version.$path).toBe('meta.version')
    expect(select.meta.version.$select(store.getState())).toBe(1)
  })
})
