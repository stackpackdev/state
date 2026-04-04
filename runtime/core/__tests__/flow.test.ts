import { describe, it, expect } from 'vitest'
import { createFlow } from '../flow.js'
import { createHumanActor } from '../actor.js'

const user = createHumanActor('user')

describe('createFlow', () => {
  it('creates a flow with initial state', () => {
    const flow = createFlow({
      name: 'wizard',
      states: ['Step1', 'Step2', 'Step3'],
      initial: 'Step1',
    })
    expect(flow.name).toBe('wizard')
    expect(flow.current()).toBe('Step1')
  })

  it('throws on invalid initial state', () => {
    expect(() =>
      createFlow({ name: 'bad', states: ['A', 'B'], initial: 'C' })
    ).toThrow('initial state "C" is not in valid states')
  })

  it('lists all valid states', () => {
    const flow = createFlow({
      name: 'test',
      states: ['A', 'B', 'C'],
      initial: 'A',
    })
    expect(flow.states()).toEqual(['A', 'B', 'C'])
  })
})

describe('flow.go', () => {
  it('transitions to a valid state', () => {
    const flow = createFlow({
      name: 'nav',
      states: ['Home', 'Settings', 'Profile'],
      initial: 'Home',
    })
    flow.go('Settings', user)
    expect(flow.current()).toBe('Settings')
  })

  it('ignores invalid states', () => {
    const flow = createFlow({
      name: 'nav',
      states: ['Home', 'Settings'],
      initial: 'Home',
    })
    flow.go('NotAState', user)
    expect(flow.current()).toBe('Home') // unchanged
  })

  it('ignores transition to current state', () => {
    const flow = createFlow({
      name: 'nav',
      states: ['Home', 'About'],
      initial: 'Home',
    })
    const calls: string[] = []
    flow.subscribe((current) => calls.push(current))
    flow.go('Home', user) // same state
    expect(calls).toHaveLength(0) // no notification
  })
})

describe('flow.has', () => {
  it('returns true for the current state', () => {
    const flow = createFlow({
      name: 'test',
      states: ['A', 'B'],
      initial: 'A',
    })
    expect(flow.has('A')).toBe(true)
    expect(flow.has('B')).toBe(false)
  })
})

describe('flow.subscribe', () => {
  it('notifies listeners on transition', () => {
    const flow = createFlow({
      name: 'sub',
      states: ['A', 'B', 'C'],
      initial: 'A',
    })
    const transitions: Array<{ current: string; prev: string }> = []
    flow.subscribe((current, prev) => transitions.push({ current, prev }))
    flow.go('B', user)
    flow.go('C', user)
    expect(transitions).toEqual([
      { current: 'B', prev: 'A' },
      { current: 'C', prev: 'B' },
    ])
  })

  it('unsubscribe works', () => {
    const flow = createFlow({
      name: 'unsub',
      states: ['A', 'B'],
      initial: 'A',
    })
    const calls: string[] = []
    const unsub = flow.subscribe((c) => calls.push(c))
    flow.go('B', user)
    unsub()
    flow.go('A', user)
    expect(calls).toEqual(['B']) // only one
  })
})

describe('flow.getHistory', () => {
  it('tracks transition history', () => {
    const flow = createFlow({
      name: 'hist',
      states: ['A', 'B', 'C'],
      initial: 'A',
    })
    flow.go('B', user)
    flow.go('C', user)
    const history = flow.getHistory()
    expect(history).toHaveLength(2)
    expect(history[0].from).toBe('B')
    expect(history[0].to).toBe('C')
    expect(history[1].from).toBe('A')
    expect(history[1].to).toBe('B')
  })
})
