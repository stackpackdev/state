import { describe, it, expect } from 'vitest'
import { createHumanActor, createAgentActor, createSystemActor, canAct, withStatus } from '../actor.js'

describe('createHumanActor', () => {
  it('creates a human actor with full permissions', () => {
    const user = createHumanActor('user')
    expect(user.type).toBe('human')
    expect(user.name).toBe('user')
    expect(user.permissions).toHaveLength(1)
    expect(user.permissions![0].paths).toEqual(['*'])
    expect(user.permissions![0].actions).toEqual(['read', 'write', 'delete'])
  })
})

describe('createAgentActor', () => {
  it('creates an agent with default read/write permissions', () => {
    const ai = createAgentActor({ name: 'assistant' })
    expect(ai.type).toBe('agent')
    expect(ai.name).toBe('assistant')
    expect(ai.status).toBe('idle')
    expect(ai.permissions![0].actions).toEqual(['read', 'write'])
  })

  it('stores model metadata', () => {
    const ai = createAgentActor({ name: 'claude', model: 'claude-3' })
    expect(ai.meta?.model).toBe('claude-3')
  })

  it('accepts custom permissions', () => {
    const ai = createAgentActor({
      name: 'restricted',
      permissions: [{ paths: ['ui.*'], actions: ['read'] }],
    })
    expect(ai.permissions![0].paths).toEqual(['ui.*'])
    expect(ai.permissions![0].actions).toEqual(['read'])
  })
})

describe('createSystemActor', () => {
  it('creates a system actor', () => {
    const sys = createSystemActor()
    expect(sys.type).toBe('system')
    expect(sys.name).toBe('system')
  })
})

describe('canAct', () => {
  it('allows human to write anywhere', () => {
    const user = createHumanActor('user')
    expect(canAct(user, 'write', 'todos.items')).toBe(true)
    expect(canAct(user, 'delete', 'anything')).toBe(true)
  })

  it('allows agent read/write but not delete by default', () => {
    const ai = createAgentActor({ name: 'bot' })
    expect(canAct(ai, 'read', 'todos.items')).toBe(true)
    expect(canAct(ai, 'write', 'todos.items')).toBe(true)
    expect(canAct(ai, 'delete', 'todos.items')).toBe(false)
  })

  it('respects path-scoped permissions', () => {
    const ai = createAgentActor({
      name: 'scoped',
      permissions: [{ paths: ['todos.*'], actions: ['read', 'write'] }],
    })
    expect(canAct(ai, 'write', 'todos.items')).toBe(true)
    expect(canAct(ai, 'write', 'auth.token')).toBe(false)
  })

  it('denies actors with no permissions', () => {
    const noPerms = { id: 'x', type: 'human' as const, name: 'x' }
    expect(canAct(noPerms, 'read', 'anything')).toBe(false)
  })
})

describe('withStatus', () => {
  it('returns a new actor with updated status', () => {
    const ai = createAgentActor({ name: 'bot' })
    const thinking = withStatus(ai, 'thinking')
    expect(thinking.status).toBe('thinking')
    expect(ai.status).toBe('idle') // original unchanged
  })
})
