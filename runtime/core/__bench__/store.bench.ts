import { bench, describe } from 'vitest'
import { z } from 'zod'
import { defineStore, storeRegistry, createHumanActor } from '../index.js'

const actor = createHumanActor('bench')

function createLargeSchema() {
  const fields: Record<string, any> = {}
  for (let i = 0; i < 30; i++) {
    fields[`field${i}`] = z.string()
  }
  return z.object(fields)
}

function createLargeInitial(): Record<string, string> {
  const initial: Record<string, string> = {}
  for (let i = 0; i < 30; i++) initial[`field${i}`] = ''
  return initial
}

let counter = 0

describe('Store Creation', () => {
  bench('defineStore with 30-field schema', () => {
    storeRegistry.clear()
    const schema = createLargeSchema()
    defineStore({ name: `bench-${counter++}`, schema, initial: createLargeInitial() })
  })

  bench('defineStore with discriminated union + transitions', () => {
    storeRegistry.clear()
    defineStore({
      name: `bench-du-${counter++}`,
      schema: z.discriminatedUnion('status', [
        z.object({ status: z.literal('idle') }),
        z.object({ status: z.literal('loading'), progress: z.number() }),
        z.object({ status: z.literal('success'), data: z.array(z.string()) }),
        z.object({ status: z.literal('error'), error: z.string() }),
      ]),
      initial: { status: 'idle' as const },
      transitions: {
        'idle -> loading': 'start',
        'loading -> success': 'complete',
        'loading -> error': 'fail',
        'error -> idle': 'reset',
        'success -> idle': 'reset',
      },
    })
  })

  bench('defineStore with all features', () => {
    storeRegistry.clear()
    defineStore({
      name: `bench-full-${counter++}`,
      schema: z.object({ value: z.string(), count: z.number() }),
      initial: { value: '', count: 0 },
      when: { isEmpty: (s) => s.value === '' },
      gates: { hasValue: (s) => s.value !== '' },
      computed: { doubled: (s) => s.count * 2 },
      properties: { positive: (s) => s.count >= 0 },
      undo: { limit: 50 },
    })
  })
})

describe('Mutation Latency', () => {
  bench('store.set (path write)', () => {
    storeRegistry.clear()
    const { store } = defineStore({
      name: `mut-${counter++}`,
      schema: z.object({ value: z.string(), count: z.number() }),
      initial: { value: '', count: 0 },
    })
    store.set('value', 'hello', actor)
  })

  bench('store.update (Immer mutation)', () => {
    storeRegistry.clear()
    const { store } = defineStore({
      name: `upd-${counter++}`,
      schema: z.object({ value: z.string(), count: z.number() }),
      initial: { value: '', count: 0 },
    })
    store.update((draft: any) => { draft.count++ }, actor)
  })
})

describe('Introspection', () => {
  bench('introspect 20 stores', () => {
    storeRegistry.clear()
    for (let i = 0; i < 20; i++) {
      defineStore({
        name: `intro-${i}`,
        schema: z.object({ value: z.string() }),
        initial: { value: '' },
        when: { empty: (s) => s.value === '' },
        gates: { hasValue: (s) => s.value !== '' },
        computed: { length: (s) => s.value.length },
      })
    }
    storeRegistry.introspect()
  })
})
