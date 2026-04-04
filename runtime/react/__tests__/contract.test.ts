import { describe, it, expect, beforeEach } from 'vitest'
import {
  withContract,
  getContracts,
  clearContracts,
  findAffectedComponents,
  findComponentsByAction,
  findGatedComponents,
} from '../contract.js'
import type { ComponentContract } from '../contract.js'

beforeEach(() => {
  clearContracts()
})

describe('withContract', () => {
  it('registers the contract in the registry', () => {
    const contract: ComponentContract = {
      reads: { items: { store: 'todos', path: 'items' } },
    }
    function TodoList() { return null }
    withContract(contract, TodoList as any)

    const contracts = getContracts()
    expect(contracts.size).toBe(1)
    expect(contracts.get('TodoList')).toEqual(contract)
  })

  it('returns the original component unchanged (pass-through)', () => {
    const contract: ComponentContract = {
      reads: { count: { store: 'counter', path: 'count' } },
    }
    function Counter() { return null }
    const result = withContract(contract, Counter as any)

    expect(result).toBe(Counter)
  })

  it('uses displayName when available', () => {
    const contract: ComponentContract = {
      reads: { v: { store: 's', path: 'v' } },
    }
    function Inner() { return null }
    ;(Inner as any).displayName = 'CustomName'
    withContract(contract, Inner as any)

    const contracts = getContracts()
    expect(contracts.has('CustomName')).toBe(true)
    expect(contracts.has('Inner')).toBe(false)
  })

  it('registers multiple components', () => {
    function A() { return null }
    function B() { return null }
    function C() { return null }

    withContract({ reads: { x: { store: 's', path: 'x' } } }, A as any)
    withContract({ reads: { y: { store: 's', path: 'y' } } }, B as any)
    withContract({ reads: { z: { store: 't', path: 'z' } } }, C as any)

    expect(getContracts().size).toBe(3)
  })
})

describe('getContracts', () => {
  it('returns a copy (not a reference to the internal map)', () => {
    function Comp() { return null }
    withContract({ reads: { a: { store: 's', path: 'a' } } }, Comp as any)

    const contracts = getContracts()
    contracts.clear()

    // Internal registry should be unaffected
    expect(getContracts().size).toBe(1)
  })
})

describe('clearContracts', () => {
  it('empties the registry', () => {
    function X() { return null }
    function Y() { return null }
    withContract({ reads: { a: { store: 's', path: 'a' } } }, X as any)
    withContract({ reads: { b: { store: 's', path: 'b' } } }, Y as any)

    expect(getContracts().size).toBe(2)
    clearContracts()
    expect(getContracts().size).toBe(0)
  })
})

describe('findAffectedComponents', () => {
  beforeEach(() => {
    function TodoList() { return null }
    function TodoFilter() { return null }
    function UserProfile() { return null }

    withContract({
      reads: {
        items: { store: 'todos', path: 'items' },
        filter: { store: 'todos', path: 'filter' },
      },
    }, TodoList as any)

    withContract({
      reads: {
        filter: { store: 'todos', path: 'filter' },
      },
    }, TodoFilter as any)

    withContract({
      reads: {
        name: { store: 'user', path: 'profile.name' },
      },
    }, UserProfile as any)
  })

  it('returns components reading from a store (no path filter)', () => {
    const affected = findAffectedComponents('todos')
    expect(affected).toContain('TodoList')
    expect(affected).toContain('TodoFilter')
    expect(affected).not.toContain('UserProfile')
  })

  it('returns components reading an exact path', () => {
    const affected = findAffectedComponents('todos', 'filter')
    expect(affected).toContain('TodoList')
    expect(affected).toContain('TodoFilter')
  })

  it('returns components reading a parent path (parent change affects child readers)', () => {
    const affected = findAffectedComponents('user', 'profile')
    // UserProfile reads 'profile.name' — changing 'profile' affects it
    expect(affected).toContain('UserProfile')
  })

  it('returns components reading a child path (child change affects parent readers)', () => {
    // If we change 'items.0.text', components reading 'items' are affected
    const affected = findAffectedComponents('todos', 'items.0.text')
    expect(affected).toContain('TodoList')
    expect(affected).not.toContain('TodoFilter')
  })

  it('returns empty array for unrelated store', () => {
    const affected = findAffectedComponents('notifications')
    expect(affected).toEqual([])
  })

  it('returns empty array for unrelated path', () => {
    const affected = findAffectedComponents('todos', 'settings')
    expect(affected).toEqual([])
  })
})

describe('findComponentsByAction', () => {
  beforeEach(() => {
    function TodoList() { return null }
    function AddButton() { return null }

    withContract({
      reads: { items: { store: 'todos', path: 'items' } },
      writes: [
        { store: 'todos', actions: ['toggleTodo', 'deleteTodo'] },
      ],
    }, TodoList as any)

    withContract({
      reads: {},
      writes: [
        { store: 'todos', actions: ['addTodo'] },
      ],
    }, AddButton as any)
  })

  it('finds components that write a specific action', () => {
    expect(findComponentsByAction('todos', 'addTodo')).toEqual(['AddButton'])
    expect(findComponentsByAction('todos', 'toggleTodo')).toEqual(['TodoList'])
    expect(findComponentsByAction('todos', 'deleteTodo')).toEqual(['TodoList'])
  })

  it('returns empty for unknown action', () => {
    expect(findComponentsByAction('todos', 'editTodo')).toEqual([])
  })

  it('returns empty for unknown store', () => {
    expect(findComponentsByAction('settings', 'addTodo')).toEqual([])
  })
})

describe('findGatedComponents', () => {
  beforeEach(() => {
    function Dashboard() { return null }
    function AdminPanel() { return null }
    function PublicPage() { return null }

    withContract({
      reads: { data: { store: 'app', path: 'data' } },
      gates: [{ store: 'auth', gate: 'isAuthenticated' }],
    }, Dashboard as any)

    withContract({
      reads: { settings: { store: 'admin', path: 'settings' } },
      gates: [
        { store: 'auth', gate: 'isAuthenticated' },
        { store: 'auth', gate: 'isAdmin' },
      ],
    }, AdminPanel as any)

    withContract({
      reads: { content: { store: 'app', path: 'content' } },
    }, PublicPage as any)
  })

  it('finds components gated by a specific gate', () => {
    const gated = findGatedComponents('auth', 'isAuthenticated')
    expect(gated).toContain('Dashboard')
    expect(gated).toContain('AdminPanel')
    expect(gated).not.toContain('PublicPage')
  })

  it('finds components with a more specific gate', () => {
    const gated = findGatedComponents('auth', 'isAdmin')
    expect(gated).toEqual(['AdminPanel'])
  })

  it('returns empty for unknown gate', () => {
    expect(findGatedComponents('auth', 'isSuperAdmin')).toEqual([])
  })

  it('returns empty for unknown store', () => {
    expect(findGatedComponents('billing', 'isActive')).toEqual([])
  })
})
