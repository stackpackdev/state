import { describe, it, expect, vi } from 'vitest'
import { createStore } from '../store.js'
import { defineStore } from '../define.js'
import { z } from 'zod'

const actor = {
  id: 'test',
  type: 'human' as const,
  name: 'Tester',
  permissions: [{ paths: ['*'], actions: ['read' as const, 'write' as const, 'delete' as const] }],
}

describe('properties (lightweight property checking)', () => {
  it('warns on property violation', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})

    const store = createStore({
      name: 'prop-violation',
      initial: { count: 0 },
      properties: {
        nonNegative: (s: { count: number }) => s.count >= 0,
      },
    })

    store.set('count', -1, actor)
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining('property "nonNegative" violated after SET')
    )

    store.destroy()
    warn.mockRestore()
  })

  it('does not warn when property passes', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})

    const store = createStore({
      name: 'prop-pass',
      initial: { count: 0 },
      properties: {
        nonNegative: (s: { count: number }) => s.count >= 0,
      },
    })

    store.set('count', 5, actor)
    expect(warn).not.toHaveBeenCalled()

    store.destroy()
    warn.mockRestore()
  })

  it('checks multiple properties on each mutation', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})

    const store = createStore({
      name: 'multi-prop',
      initial: { count: 10 },
      properties: {
        nonNegative: (s: { count: number }) => s.count >= 0,
        underLimit: (s: { count: number }) => s.count < 100,
      },
    })

    // Violates underLimit
    store.set('count', 200, actor)
    expect(warn).toHaveBeenCalledTimes(1)
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining('"underLimit" violated')
    )

    warn.mockClear()

    // Violates both
    store.set('count', -5, actor)
    // nonNegative fails, underLimit passes
    expect(warn).toHaveBeenCalledTimes(1)
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining('"nonNegative" violated')
    )

    store.destroy()
    warn.mockRestore()
  })

  it('property check receives current state', () => {
    const receivedStates: any[] = []

    const store = createStore({
      name: 'prop-state',
      initial: { value: 'initial' },
      properties: {
        track: (s: { value: string }) => {
          receivedStates.push(s.value)
          return true
        },
      },
    })

    store.set('value', 'updated', actor)
    expect(receivedStates).toEqual(['updated'])

    store.destroy()
  })

  it('getProperties() returns all check results', () => {
    const store = createStore({
      name: 'get-props',
      initial: { count: 5 },
      properties: {
        positive: (s: { count: number }) => s.count > 0,
        isEven: (s: { count: number }) => s.count % 2 === 0,
      },
    })

    const results = store.getProperties()
    expect(results).toEqual({ positive: true, isEven: false })

    store.destroy()
  })

  it('store without properties works (backward compat)', () => {
    const store = createStore({
      name: 'no-props',
      initial: { x: 1 },
    })

    store.set('x', 2, actor)
    expect(store.getState()).toEqual({ x: 2 })
    expect(store.getProperties()).toEqual({})

    store.destroy()
  })

  it('catches and warns on property check errors', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})

    const store = createStore({
      name: 'prop-error',
      initial: { data: null as any },
      properties: {
        willThrow: (s: { data: any }) => {
          throw new Error('check failed')
        },
      },
    })

    store.set('data', 'something', actor)
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining('"willThrow" threw during check')
    )

    // getProperties also catches errors
    const results = store.getProperties()
    expect(results).toEqual({ willThrow: false })

    store.destroy()
    warn.mockRestore()
  })

  it('defineStore passes properties through', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})

    const { store } = defineStore({
      name: 'define-props',
      schema: z.object({ count: z.number() }),
      initial: { count: 0 },
      properties: {
        nonNegative: (s) => s.count >= 0,
      },
    })

    store.set('count', -1, actor)
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining('property "nonNegative" violated')
    )

    expect(store.getProperties()).toEqual({ nonNegative: false })

    store.destroy()
    warn.mockRestore()
  })

  it('includes path in violation message when available', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})

    const store = createStore({
      name: 'prop-path',
      initial: { count: 0 },
      properties: {
        nonNegative: (s: { count: number }) => s.count >= 0,
      },
    })

    store.set('count', -1, actor)
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining('at "count"')
    )

    store.destroy()
    warn.mockRestore()
  })
})
