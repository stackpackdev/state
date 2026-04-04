import { describe, it, expect } from 'vitest'
import { createHistory } from '../history.js'
import type { Action } from '../types.js'
import { createHumanActor, createAgentActor } from '../actor.js'

const user = createHumanActor('histUser')
const bot = createAgentActor({ name: 'histBot' })

function makeAction(path: string, actor = user): Action {
  return {
    id: `action_${Date.now()}`,
    type: 'SET',
    path,
    value: 1,
    actor,
    timestamp: Date.now(),
  }
}

describe('createHistory', () => {
  it('stores actions in reverse order (newest first)', () => {
    const h = createHistory()
    h.push(makeAction('a'))
    h.push(makeAction('b'))
    const all = h.getAll()
    expect(all[0].path).toBe('b')
    expect(all[1].path).toBe('a')
  })

  it('respects the limit', () => {
    const h = createHistory(3)
    h.push(makeAction('a'))
    h.push(makeAction('b'))
    h.push(makeAction('c'))
    h.push(makeAction('d'))
    expect(h.length).toBe(3)
    expect(h.getAll()[0].path).toBe('d')
  })

  it('filters by actor', () => {
    const h = createHistory()
    h.push(makeAction('a', user))
    h.push(makeAction('b', bot))
    h.push(makeAction('c', user))
    const userActions = h.getByActor(user.id)
    expect(userActions).toHaveLength(2)
  })

  it('filters by path prefix', () => {
    const h = createHistory()
    h.push(makeAction('todos.items'))
    h.push(makeAction('todos.filter'))
    h.push(makeAction('auth.token'))
    const todoActions = h.getByPath('todos')
    expect(todoActions).toHaveLength(2)
  })

  it('getLast returns most recent N', () => {
    const h = createHistory()
    h.push(makeAction('a'))
    h.push(makeAction('b'))
    h.push(makeAction('c'))
    const last2 = h.getLast(2)
    expect(last2).toHaveLength(2)
    expect(last2[0].path).toBe('c')
  })

  it('clear empties history', () => {
    const h = createHistory()
    h.push(makeAction('a'))
    h.clear()
    expect(h.length).toBe(0)
    expect(h.getAll()).toEqual([])
  })
})
