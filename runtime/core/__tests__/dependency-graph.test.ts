import { describe, it, expect, beforeEach } from 'vitest'
import { createStore, storeRegistry } from '../store.js'
import { createHumanActor } from '../actor.js'

const user = createHumanActor('testUser')

beforeEach(() => {
  storeRegistry.clear()
})

// ─── Store Dependencies ─────────────────────────────────────

describe('store dependencies', () => {
  it('stores and retrieves dependency metadata', () => {
    const store = createStore({
      name: 'todos',
      initial: { items: [] },
      dependencies: {
        reads: ['auth'],
        gatedBy: ['auth'],
        triggers: [],
      },
    })

    const deps = store.getDependencies()
    expect(deps.reads).toEqual(['auth'])
    expect(deps.gatedBy).toEqual(['auth'])
    expect(deps.triggers).toEqual([])
  })

  it('returns empty dependencies when none specified', () => {
    const store = createStore({
      name: 'standalone',
      initial: { x: 1 },
    })

    const deps = store.getDependencies()
    expect(deps.reads).toEqual([])
    expect(deps.gatedBy).toEqual([])
    expect(deps.triggers).toEqual([])
  })

  it('getDependencies returns a copy (not mutable reference)', () => {
    const store = createStore({
      name: 'immutable-deps',
      initial: {},
      dependencies: {
        reads: ['auth'],
        gatedBy: [],
        triggers: [],
      },
    })

    const deps1 = store.getDependencies()
    const deps2 = store.getDependencies()
    expect(deps1).toEqual(deps2)
    expect(deps1).not.toBe(deps2) // different objects
  })
})

// ─── Store Path Schema ──────────────────────────────────────

describe('store path schema', () => {
  it('stores and retrieves path schema', () => {
    const store = createStore({
      name: 'todos-schema',
      initial: { items: [], filter: 'all' },
      pathSchema: {
        'items': { type: 'array', itemType: 'Todo' },
        'items.*': { type: 'object', fields: ['id', 'text', 'done'] },
        'items.*.id': { type: 'string' },
        'items.*.text': { type: 'string', validation: 'non-empty' },
        'items.*.done': { type: 'boolean' },
        'filter': { type: 'enum', values: ['all', 'active', 'done'] },
      },
    })

    const schema = store.getPathSchema()
    expect(schema).toBeDefined()
    expect(schema!['items'].type).toBe('array')
    expect(schema!['items'].itemType).toBe('Todo')
    expect(schema!['filter'].values).toEqual(['all', 'active', 'done'])
    expect(schema!['items.*.text'].validation).toBe('non-empty')
  })

  it('returns undefined when no schema defined', () => {
    const store = createStore({
      name: 'no-schema',
      initial: {},
    })
    expect(store.getPathSchema()).toBeUndefined()
  })

  it('getPathSchema returns a copy', () => {
    const store = createStore({
      name: 'schema-copy',
      initial: {},
      pathSchema: {
        'x': { type: 'number' },
      },
    })

    const s1 = store.getPathSchema()
    const s2 = store.getPathSchema()
    expect(s1).toEqual(s2)
    expect(s1).not.toBe(s2)
  })
})

// ─── Registry impactOf ──────────────────────────────────────

describe('storeRegistry.impactOf', () => {
  it('finds direct readers', () => {
    createStore({
      name: 'auth',
      initial: { user: null },
    })

    createStore({
      name: 'todos',
      initial: { items: [] },
      dependencies: {
        reads: ['auth'],
        gatedBy: [],
        triggers: [],
      },
    })

    createStore({
      name: 'settings',
      initial: { theme: 'light' },
      dependencies: {
        reads: ['auth'],
        gatedBy: [],
        triggers: [],
      },
    })

    const impact = storeRegistry.impactOf('auth')
    expect(impact.readers).toContain('todos')
    expect(impact.readers).toContain('settings')
  })

  it('finds gated stores', () => {
    createStore({
      name: 'auth',
      initial: { user: null },
    })

    createStore({
      name: 'dashboard',
      initial: { data: [] },
      dependencies: {
        reads: [],
        gatedBy: ['auth'],
        triggers: [],
      },
    })

    const impact = storeRegistry.impactOf('auth')
    expect(impact.gatedStores).toContain('dashboard')
    expect(impact.allAffected).toContain('dashboard')
  })

  it('finds triggered stores', () => {
    createStore({
      name: 'auth',
      initial: { user: null },
    })

    createStore({
      name: 'cache',
      initial: { data: {} },
      dependencies: {
        reads: [],
        gatedBy: [],
        triggers: ['auth'],
      },
    })

    const impact = storeRegistry.impactOf('auth')
    expect(impact.triggered).toContain('cache')
    expect(impact.allAffected).toContain('cache')
  })

  it('handles transitive dependencies (cascading gates)', () => {
    createStore({
      name: 'auth',
      initial: { user: null },
    })

    createStore({
      name: 'dashboard',
      initial: { data: [] },
      dependencies: {
        reads: [],
        gatedBy: ['auth'],
        triggers: [],
      },
    })

    createStore({
      name: 'dashboard-stats',
      initial: { stats: {} },
      dependencies: {
        reads: [],
        gatedBy: ['dashboard'],
        triggers: [],
      },
    })

    const impact = storeRegistry.impactOf('auth')
    // auth → gates dashboard → gates dashboard-stats
    expect(impact.gatedStores).toContain('dashboard')
    expect(impact.gatedStores).toContain('dashboard-stats')
    expect(impact.allAffected).toContain('dashboard')
    expect(impact.allAffected).toContain('dashboard-stats')
  })

  it('handles circular dependencies without infinite loop', () => {
    createStore({
      name: 'storeA',
      initial: {},
      dependencies: {
        reads: [],
        gatedBy: [],
        triggers: ['storeB'],
      },
    })

    createStore({
      name: 'storeB',
      initial: {},
      dependencies: {
        reads: [],
        gatedBy: [],
        triggers: ['storeA'],
      },
    })

    // Should not infinite loop — visited set prevents it
    const impact = storeRegistry.impactOf('storeA')
    expect(impact.triggered).toContain('storeB')
    expect(impact.allAffected).toContain('storeB')
  })

  it('returns empty impact for store with no dependents', () => {
    createStore({ name: 'isolated', initial: {} })

    const impact = storeRegistry.impactOf('isolated')
    expect(impact.readers).toEqual([])
    expect(impact.gatedStores).toEqual([])
    expect(impact.triggered).toEqual([])
    expect(impact.allAffected).toEqual([])
  })

  it('combines readers, gated, and triggered in allAffected', () => {
    createStore({ name: 'source', initial: {} })

    createStore({
      name: 'reader',
      initial: {},
      dependencies: { reads: ['source'], gatedBy: [], triggers: [] },
    })

    createStore({
      name: 'gated',
      initial: {},
      dependencies: { reads: [], gatedBy: ['source'], triggers: [] },
    })

    createStore({
      name: 'triggered',
      initial: {},
      dependencies: { reads: [], gatedBy: [], triggers: ['source'] },
    })

    const impact = storeRegistry.impactOf('source')
    expect(impact.allAffected).toContain('gated')
    expect(impact.allAffected).toContain('triggered')
    // readers are NOT traversed (they don't cascade)
    // but gated and triggered stores are in allAffected because they were traversed
  })
})
