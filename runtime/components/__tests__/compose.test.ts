import { describe, it, expect, beforeEach } from 'vitest'
import { z } from 'zod'
import { composeStore } from '../compose.js'
import { Loadable, LoadableConditions } from '../loadable.js'
import { Paginated, PaginatedConditions } from '../paginated.js'
import { Filterable } from '../filterable.js'
import { Selectable } from '../selectable.js'
import { storeRegistry } from '../../core/store.js'
import { createHumanActor } from '../../core/actor.js'

const user = createHumanActor('testUser')

// Unique store name counter to avoid registry collisions
let storeCounter = 0
function uniqueName(base: string) {
  return `${base}-${++storeCounter}`
}

beforeEach(() => {
  storeRegistry.clear()
})

describe('composeStore', () => {
  it('merges schemas correctly', () => {
    const { store } = composeStore({
      name: uniqueName('merge-schema'),
      schema: z.object({ items: z.array(z.string()) }),
      components: [Loadable],
      initial: { items: [] },
    })

    const state = store.getState()
    expect(state.items).toEqual([])
    expect(state.isLoading).toBe(false)
    expect(state.error).toBeNull()
  })

  it('merges when/gates/computed from components', () => {
    const { store } = composeStore({
      name: uniqueName('merge-conditions'),
      schema: z.object({ data: z.string() }),
      components: [Loadable],
      initial: { data: 'hello' },
    })

    // Loadable provides when: isLoading, hasError and gates: isLoaded, hasError
    const when = store.getWhen()
    expect(when.isLoading).toBe(false)
    expect(when.hasError).toBe(false)

    const gates = store.getGates()
    expect(gates.isLoaded).toBe(true)
    expect(gates.hasError).toBe(false)
  })

  it('merges initial values', () => {
    const { store } = composeStore({
      name: uniqueName('merge-initial'),
      schema: z.object({ title: z.string() }),
      components: [Loadable, Paginated],
      initial: { title: 'Test' },
    })

    const state = store.getState()
    expect(state.title).toBe('Test')
    // Loadable initial
    expect(state.isLoading).toBe(false)
    expect(state.error).toBeNull()
    // Paginated initial
    expect(state.page).toBe(1)
    expect(state.pageSize).toBe(20)
    expect(state.total).toBe(0)
  })

  it('detects field conflicts and throws error', () => {
    const CustomComponent = {
      schema: z.object({ isLoading: z.boolean() }),
      initial: { isLoading: false },
    }

    expect(() =>
      composeStore({
        name: uniqueName('conflict'),
        schema: z.object({ data: z.string() }),
        components: [Loadable, CustomComponent],
        initial: { data: 'test' },
      })
    ).toThrow("Field 'isLoading' defined by both")
  })

  it('detects field conflicts between user schema and component', () => {
    expect(() =>
      composeStore({
        name: uniqueName('conflict-user'),
        schema: z.object({ error: z.string().nullable() }),
        components: [Loadable],
        initial: { error: null },
      })
    ).toThrow("Field 'error' defined by both Loadable and user schema")
  })

  it('Loadable component provides correct when/gates', () => {
    const { store } = composeStore({
      name: uniqueName('loadable-test'),
      schema: z.object({ value: z.number() }),
      components: [Loadable],
      initial: { value: 42 },
    })

    // Initially: not loading, no error
    expect(store.isWhen('isLoading')).toBe(false)
    expect(store.isWhen('hasError')).toBe(false)
    expect(store.isGated('isLoaded')).toBe(true)
    expect(store.isGated('hasError')).toBe(false)

    // Set loading
    store.update((draft: any) => { draft.isLoading = true }, user)
    expect(store.isWhen('isLoading')).toBe(true)
    expect(store.isGated('isLoaded')).toBe(false)

    // Set error
    store.update((draft: any) => {
      draft.isLoading = false
      draft.error = 'Something went wrong'
    }, user)
    expect(store.isWhen('hasError')).toBe(true)
    expect(store.isGated('hasError')).toBe(true)
    expect(store.isGated('isLoaded')).toBe(false)
  })

  it('Paginated component provides correct computed values', () => {
    const { store } = composeStore({
      name: uniqueName('paginated-test'),
      schema: z.object({ items: z.array(z.string()) }),
      components: [Paginated],
      initial: { items: [] },
    })

    // Initially: page 1, total 0
    expect(store.computed('totalPages')).toBe(0)
    expect(store.computed('hasNextPage')).toBe(false)
    expect(store.computed('hasPrevPage')).toBe(false)

    // Set total to 50 with pageSize 20
    store.update((draft: any) => { draft.total = 50 }, user)
    expect(store.computed('totalPages')).toBe(3)
    expect(store.computed('hasNextPage')).toBe(true)
    expect(store.computed('hasPrevPage')).toBe(false)

    // Move to page 2
    store.update((draft: any) => { draft.page = 2 }, user)
    expect(store.computed('hasNextPage')).toBe(true)
    expect(store.computed('hasPrevPage')).toBe(true)

    // Move to last page
    store.update((draft: any) => { draft.page = 3 }, user)
    expect(store.computed('hasNextPage')).toBe(false)
    expect(store.computed('hasPrevPage')).toBe(true)
  })

  it('multiple components compose together (Loadable + Paginated + Filterable)', () => {
    const { store } = composeStore({
      name: uniqueName('multi-compose'),
      schema: z.object({ items: z.array(z.string()) }),
      components: [Loadable, Paginated, Filterable],
      initial: { items: ['a', 'b'] },
    })

    const state = store.getState()
    // User fields
    expect(state.items).toEqual(['a', 'b'])
    // Loadable fields
    expect(state.isLoading).toBe(false)
    expect(state.error).toBeNull()
    // Paginated fields
    expect(state.page).toBe(1)
    expect(state.pageSize).toBe(20)
    expect(state.total).toBe(0)
    // Filterable fields
    expect(state.filter).toBe('')
    expect(state.sortBy).toBe('')
    expect(state.sortOrder).toBe('asc')

    // All when conditions available
    const when = store.getWhen()
    expect('isLoading' in when).toBe(true)
    expect('hasError' in when).toBe(true)
    expect('isFirstPage' in when).toBe(true)
    expect('isLastPage' in when).toBe(true)
    expect('hasFilter' in when).toBe(true)
    expect('isAscending' in when).toBe(true)
  })

  it('user-provided when/gates/computed override component ones', () => {
    const customIsLoading = (s: any) => s.isLoading && s.value > 0

    const { store } = composeStore({
      name: uniqueName('override'),
      schema: z.object({ value: z.number() }),
      components: [Loadable],
      initial: { value: 0 },
      when: {
        // Override Loadable's isLoading condition
        isLoading: customIsLoading,
      },
      gates: {
        // Override Loadable's isLoaded gate
        isLoaded: (s: any) => s.value > 0,
      },
    })

    // isLoading = false because value is 0 (custom condition)
    store.update((draft: any) => { draft.isLoading = true }, user)
    expect(store.isWhen('isLoading')).toBe(false) // custom: requires value > 0

    store.update((draft: any) => { draft.value = 5 }, user)
    expect(store.isWhen('isLoading')).toBe(true) // now both conditions met

    // Custom isLoaded gate depends on value, not isLoading
    expect(store.isGated('isLoaded')).toBe(true) // value > 0
  })

  it('the resulting store works like any other store (set, get, subscribe)', () => {
    const { store } = composeStore({
      name: uniqueName('store-ops'),
      schema: z.object({ count: z.number() }),
      components: [Loadable],
      initial: { count: 0 },
    })

    // get/set
    expect(store.get('count')).toBe(0)
    store.set('count', 10, user)
    expect(store.get('count')).toBe(10)

    // subscribe
    let notified = false
    const unsub = store.subscribe(() => { notified = true })
    store.set('count', 20, user)
    expect(notified).toBe(true)
    unsub()

    // update (Immer)
    store.update((draft: any) => { draft.count = 99 }, user)
    expect(store.getState().count).toBe(99)

    // history
    const history = store.getHistory()
    expect(history.length).toBeGreaterThan(0)
  })

  it('composes with Selectable component', () => {
    const { store } = composeStore({
      name: uniqueName('selectable-test'),
      schema: z.object({ items: z.array(z.string()) }),
      components: [Selectable],
      initial: { items: ['a', 'b', 'c'] },
    })

    expect(store.getState().selectedIds).toEqual([])
    expect(store.isWhen('hasSelection')).toBe(false)
    expect(store.computed('selectedCount')).toBe(0)

    store.update((draft: any) => { draft.selectedIds = ['a', 'c'] }, user)
    expect(store.isWhen('hasSelection')).toBe(true)
    expect(store.computed('selectedCount')).toBe(2)
  })

  it('works with no components (passthrough)', () => {
    const { store } = composeStore({
      name: uniqueName('no-components'),
      schema: z.object({ value: z.string() }),
      components: [],
      initial: { value: 'hello' },
    })

    expect(store.getState().value).toBe('hello')
  })
})
