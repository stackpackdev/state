import { describe, it, expect, beforeEach } from 'vitest'
import { z } from 'zod'
import { createStore, storeRegistry } from '../store.js'
import { createHumanActor } from '../actor.js'

const user = createHumanActor('testUser')

beforeEach(() => {
  storeRegistry.clear()
})

describe('Zod stateSchema', () => {
  const TodoSchema = z.object({
    items: z.array(z.object({
      id: z.string(),
      text: z.string().min(1),
      done: z.boolean(),
    })),
    filter: z.enum(['all', 'active', 'done']),
  })

  type TodoState = z.infer<typeof TodoSchema>

  it('accepts valid initial state', () => {
    const store = createStore<TodoState>({
      name: 'zod-valid',
      initial: { items: [], filter: 'all' },
      stateSchema: TodoSchema,
    })
    expect(store.getState()).toEqual({ items: [], filter: 'all' })
  })

  it('rejects invalid initial state', () => {
    expect(() =>
      createStore({
        name: 'zod-invalid-init',
        initial: { items: 'not-an-array', filter: 'all' },
        stateSchema: TodoSchema,
      })
    ).toThrow(/initial state fails schema validation/)
  })

  it('allows valid mutations', () => {
    const store = createStore<TodoState>({
      name: 'zod-mutation-ok',
      initial: { items: [], filter: 'all' },
      stateSchema: TodoSchema,
    })
    store.update(draft => {
      draft.items.push({ id: '1', text: 'hello', done: false })
    }, user)
    expect(store.get<TodoState['items']>('items')).toHaveLength(1)
  })

  it('rejects mutations that violate the schema', () => {
    const store = createStore<TodoState>({
      name: 'zod-mutation-bad',
      initial: { items: [], filter: 'all' },
      stateSchema: TodoSchema,
    })
    // Try to set filter to an invalid value
    store.set('filter', 'invalid-value', user)
    // Should be rolled back
    expect(store.get('filter')).toBe('all')
  })

  it('rolls back to previous state on schema violation', () => {
    const store = createStore<TodoState>({
      name: 'zod-rollback',
      initial: { items: [{ id: '1', text: 'task', done: false }], filter: 'all' },
      stateSchema: TodoSchema,
    })
    // Try to push an invalid item (empty text violates min(1))
    store.update(draft => {
      draft.items.push({ id: '2', text: '', done: false })
    }, user)
    // Should still have only the original item
    expect(store.get<TodoState['items']>('items')).toHaveLength(1)
  })

  it('getSchema() returns the Zod schema', () => {
    const store = createStore<TodoState>({
      name: 'zod-get-schema',
      initial: { items: [], filter: 'all' },
      stateSchema: TodoSchema,
    })
    expect(store.getSchema()).toBe(TodoSchema)
  })

  it('getSchema() returns undefined when no schema', () => {
    const store = createStore({
      name: 'no-schema',
      initial: { x: 1 },
    })
    expect(store.getSchema()).toBeUndefined()
  })

  it('works with when/gates alongside schema', () => {
    const store = createStore<TodoState>({
      name: 'zod-when-gates',
      initial: { items: [], filter: 'all' },
      stateSchema: TodoSchema,
      when: {
        isEmpty: s => s.items.length === 0,
        isFiltered: s => s.filter !== 'all',
      },
      gates: {
        hasItems: s => s.items.length > 0,
      },
    })
    expect(store.getWhen().isEmpty).toBe(true)
    expect(store.getGates().hasItems).toBe(false)

    store.update(draft => {
      draft.items.push({ id: '1', text: 'task', done: false })
    }, user)
    expect(store.getWhen().isEmpty).toBe(false)
    expect(store.getGates().hasItems).toBe(true)
  })

  it('does not notify listeners on rejected mutations', () => {
    const store = createStore<TodoState>({
      name: 'zod-no-notify',
      initial: { items: [], filter: 'all' },
      stateSchema: TodoSchema,
    })
    const calls: any[] = []
    store.subscribe((next) => calls.push(next))

    // Invalid mutation — should be rejected, no listener call
    store.set('filter', 'invalid', user)
    expect(calls).toHaveLength(0)

    // Valid mutation — should trigger listener
    store.set('filter', 'active', user)
    expect(calls).toHaveLength(1)
  })
})
