// Integration test for selector tree + store subscription (the mechanism behind useSelect)
// Since we don't have @testing-library/react, we test the subscription + selector logic directly.

import { describe, it, expect, beforeEach } from 'vitest'
import { z } from 'zod'
import { defineStore, storeRegistry, createHumanActor } from '../index.js'
import type { SelectorNode } from '../selectors.js'

const user = createHumanActor('test')

beforeEach(() => {
  storeRegistry.clear()
})

describe('selector tree + store subscription (useSelect foundation)', () => {
  it('selector node $select returns correct value', () => {
    const { store, select } = defineStore({
      name: 'sel-val',
      schema: z.object({ filter: z.string(), count: z.number() }),
      initial: { filter: 'all', count: 0 },
    })

    const filterNode: SelectorNode<string> = select.filter
    expect(filterNode.$path).toBe('filter')
    expect(filterNode.$select(store.getState())).toBe('all')
  })

  it('path-scoped subscription fires only for selected path changes', () => {
    const { store, select } = defineStore({
      name: 'sel-sub',
      schema: z.object({ filter: z.string(), count: z.number() }),
      initial: { filter: 'all', count: 0 },
    })

    const filterNode: SelectorNode<string> = select.filter
    let filterCallCount = 0

    // Subscribe only to the filter path
    store.subscribe(() => {
      filterCallCount++
    }, filterNode.$path)

    // Change count — should NOT trigger filter listener
    store.set('count', 5, user)
    expect(filterCallCount).toBe(0)

    // Change filter — SHOULD trigger
    store.set('filter', 'active', user)
    expect(filterCallCount).toBe(1)
    expect(filterNode.$select(store.getState())).toBe('active')
  })

  it('works with nested selectors', () => {
    const { store, select } = defineStore({
      name: 'sel-nested',
      schema: z.object({
        ui: z.object({
          searchOpen: z.boolean(),
          theme: z.string(),
        }),
        data: z.string(),
      }),
      initial: { ui: { searchOpen: false, theme: 'light' }, data: '' },
    })

    const searchNode: SelectorNode<boolean> = select.ui.searchOpen
    expect(searchNode.$path).toBe('ui.searchOpen')
    expect(searchNode.$select(store.getState())).toBe(false)

    let searchCallCount = 0
    store.subscribe(() => {
      searchCallCount++
    }, searchNode.$path)

    // Change data — should NOT trigger
    store.set('data', 'test', user)
    expect(searchCallCount).toBe(0)

    // Change searchOpen — SHOULD trigger
    store.set('ui.searchOpen', true, user)
    expect(searchCallCount).toBe(1)
    expect(searchNode.$select(store.getState())).toBe(true)
  })

  it('selector tree has correct paths for all fields', () => {
    const { select } = defineStore({
      name: 'sel-paths',
      schema: z.object({
        a: z.string(),
        b: z.number(),
        c: z.object({ d: z.boolean(), e: z.string() }),
      }),
      initial: { a: '', b: 0, c: { d: false, e: '' } },
    })

    expect(select.a.$path).toBe('a')
    expect(select.b.$path).toBe('b')
    expect(select.c.$path).toBe('c')
    expect(select.c.d.$path).toBe('c.d')
    expect(select.c.e.$path).toBe('c.e')
  })
})
