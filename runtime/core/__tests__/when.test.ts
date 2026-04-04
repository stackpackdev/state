import { describe, it, expect } from 'vitest'
import { createWhenEvaluator } from '../when.js'

describe('createWhenEvaluator', () => {
  it('evaluates all conditions', () => {
    const when = createWhenEvaluator({
      isEmpty: (s: { items: any[] }) => s.items.length === 0,
      hasItems: (s: { items: any[] }) => s.items.length > 0,
    })
    const result = when.evaluate({ items: [] })
    expect(result.isEmpty).toBe(true)
    expect(result.hasItems).toBe(false)
  })

  it('checks individual conditions', () => {
    const when = createWhenEvaluator({
      isZero: (n: number) => n === 0,
    })
    expect(when.check('isZero', 0)).toBe(true)
    expect(when.check('isZero', 5)).toBe(false)
  })

  it('returns false for non-existent conditions', () => {
    const when = createWhenEvaluator({})
    expect(when.check('nonexistent', {})).toBe(false)
  })

  it('handles errors in conditions gracefully', () => {
    const when = createWhenEvaluator({
      willThrow: () => { throw new Error('boom') },
    })
    expect(when.check('willThrow', {})).toBe(false)
    expect(when.evaluate({}).willThrow).toBe(false)
  })

  it('add/remove conditions dynamically', () => {
    const when = createWhenEvaluator<number>({})
    when.add('isPositive', n => n > 0)
    expect(when.check('isPositive', 5)).toBe(true)
    expect(when.names()).toEqual(['isPositive'])
    when.remove('isPositive')
    expect(when.check('isPositive', 5)).toBe(false)
    expect(when.names()).toEqual([])
  })
})
