import { describe, it, expect } from 'vitest'
import { createMiddlewarePipeline } from '../middleware.js'
import type { Action } from '../types.js'
import { createHumanActor } from '../actor.js'

const user = createHumanActor('user')

function makeAction(overrides: Partial<Action> = {}): Action {
  return {
    id: 'test',
    type: 'SET',
    path: 'x',
    value: 1,
    actor: user,
    timestamp: Date.now(),
    ...overrides,
  }
}

describe('createMiddlewarePipeline', () => {
  it('runs apply when no middleware', () => {
    const pipeline = createMiddlewarePipeline()
    let applied = false
    pipeline.run(makeAction(), {}, () => { applied = true; return {} })
    expect(applied).toBe(true)
  })

  it('enter can transform action', () => {
    const pipeline = createMiddlewarePipeline([
      {
        name: 'transform',
        enter: (action) => ({ ...action, value: 999 }),
      },
    ])
    const result = pipeline.run(makeAction({ value: 1 }), {}, (action) => {
      expect(action.value).toBe(999)
      return {}
    })
    expect(result.action.value).toBe(999)
    expect(result.cancelled).toBe(false)
  })

  it('enter returning null cancels', () => {
    const pipeline = createMiddlewarePipeline([
      { name: 'blocker', enter: () => null },
    ])
    let applied = false
    const result = pipeline.run(makeAction(), {}, () => { applied = true; return {} })
    expect(applied).toBe(false)
    expect(result.cancelled).toBe(true)
  })

  it('leave runs after apply', () => {
    const order: string[] = []
    const pipeline = createMiddlewarePipeline([
      {
        name: 'tracker',
        enter: (action) => { order.push('enter'); return action },
        leave: () => { order.push('leave') },
      },
    ])
    pipeline.run(makeAction(), {}, () => { order.push('apply'); return {} })
    expect(order).toEqual(['enter', 'apply', 'leave'])
  })

  it('add/remove middleware dynamically', () => {
    const pipeline = createMiddlewarePipeline()
    const calls: string[] = []
    pipeline.add({ name: 'logger', enter: (a) => { calls.push('log'); return a } })
    pipeline.run(makeAction(), {}, () => ({}))
    expect(calls).toEqual(['log'])
    pipeline.remove('logger')
    pipeline.run(makeAction(), {}, () => ({}))
    expect(calls).toEqual(['log']) // no additional call
  })

  it('chains multiple middlewares', () => {
    const pipeline = createMiddlewarePipeline([
      { name: 'add1', enter: (a) => ({ ...a, value: (a.value as number) + 1 }) },
      { name: 'add10', enter: (a) => ({ ...a, value: (a.value as number) + 10 }) },
    ])
    const result = pipeline.run(makeAction({ value: 0 }), {}, () => ({}))
    expect(result.action.value).toBe(11)
  })
})
