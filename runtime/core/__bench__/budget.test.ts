import { test, expect, beforeEach } from 'vitest'
import { z } from 'zod'
import { defineStore, storeRegistry, createHumanActor } from '../index.js'

const actor = createHumanActor('budget')

beforeEach(() => {
  storeRegistry.clear()
})

test('store creation < 5ms for 30-field store', () => {
  const fields: Record<string, any> = {}
  const initial: Record<string, string> = {}
  for (let i = 0; i < 30; i++) { fields[`f${i}`] = z.string(); initial[`f${i}`] = '' }

  const start = performance.now()
  defineStore({ name: 'budget-create', schema: z.object(fields), initial })
  const elapsed = performance.now() - start

  expect(elapsed).toBeLessThan(10) // 2x budget margin
})

test('mutation latency < 1ms for path write', () => {
  const { store } = defineStore({
    name: 'budget-mut',
    schema: z.object({ value: z.string() }),
    initial: { value: '' },
  })

  const start = performance.now()
  store.set('value', 'test', actor)
  const elapsed = performance.now() - start

  expect(elapsed).toBeLessThan(2) // 2x budget margin
})

test('introspection < 10ms for 20 stores', () => {
  for (let i = 0; i < 20; i++) {
    defineStore({
      name: `budget-intro-${i}`,
      schema: z.object({ v: z.string() }),
      initial: { v: '' },
      when: { e: (s) => s.v === '' },
      gates: { h: (s) => s.v !== '' },
    })
  }

  const start = performance.now()
  storeRegistry.introspect()
  const elapsed = performance.now() - start

  expect(elapsed).toBeLessThan(20) // 2x budget margin
})
