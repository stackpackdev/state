// Runtime performance benchmark for state-agent
// Tests: store creation, mutations, subscriptions, when/gate evaluation,
// computed values, history, middleware, batch updates

import {
  createStore,
  createHumanActor,
  storeRegistry,
  z,
  defineStore,
  createHistory,
  createComputedEvaluator,
  createWhenEvaluator,
  createGateEvaluator,
  createPresenceTracker,
} from '../../runtime/core/index.js'

const actor = createHumanActor('bench-user')

interface BenchResult {
  name: string
  ops: number
  totalMs: number
  opsPerSec: number
  avgNs: number
}

function bench(name: string, fn: () => void, iterations = 10_000): BenchResult {
  // Warmup
  for (let i = 0; i < 100; i++) fn()

  const start = performance.now()
  for (let i = 0; i < iterations; i++) fn()
  const totalMs = performance.now() - start

  return {
    name,
    ops: iterations,
    totalMs: Math.round(totalMs * 100) / 100,
    opsPerSec: Math.round(iterations / (totalMs / 1000)),
    avgNs: Math.round((totalMs / iterations) * 1_000_000),
  }
}

function separator(title: string) {
  console.log(`\n${'='.repeat(70)}`)
  console.log(`  ${title}`)
  console.log('='.repeat(70))
}

function printResult(r: BenchResult) {
  const opsStr = r.opsPerSec.toLocaleString()
  console.log(
    `  ${r.name.padEnd(45)} ${opsStr.padStart(12)} ops/s  ${String(r.avgNs).padStart(8)} ns/op`
  )
}

// ─── Benchmarks ──────────────────────────────────────────────

const results: BenchResult[] = []

// 1. Store creation
separator('Store Creation')

storeRegistry.clear()
let storeIdx = 0
results.push(bench('createStore (minimal)', () => {
  const s = createStore({ name: `bench-${storeIdx++}`, initial: { x: 0 } })
  s.destroy()
}, 5_000))
printResult(results[results.length - 1])

storeIdx = 0
results.push(bench('createStore (with schema)', () => {
  const s = createStore({
    name: `bench-schema-${storeIdx++}`,
    initial: { items: [], filter: 'all' as const },
    stateSchema: z.object({ items: z.array(z.string()), filter: z.enum(['all', 'active', 'done']) }),
  })
  s.destroy()
}, 1_000))
printResult(results[results.length - 1])

storeIdx = 0
results.push(bench('defineStore (full options)', () => {
  const d = defineStore({
    name: `bench-define-${storeIdx++}`,
    schema: z.object({ count: z.number(), items: z.array(z.string()) }),
    initial: { count: 0, items: [] },
    when: { isEmpty: (s) => s.items.length === 0 },
    gates: { hasItems: (s) => s.items.length > 0 },
    computed: { total: (s) => s.count + s.items.length },
  })
  d.store.destroy()
}, 1_000))
printResult(results[results.length - 1])

// 2. Mutations
separator('Mutations')

const mutStore = createStore({ name: 'mut-bench', initial: { count: 0, items: [] as string[] } })

results.push(bench('store.set (scalar)', () => {
  mutStore.set('count', Math.random(), actor)
}, 50_000))
printResult(results[results.length - 1])

results.push(bench('store.update (immer)', () => {
  mutStore.update(d => { d.count++ }, actor)
}, 50_000))
printResult(results[results.length - 1])

results.push(bench('store.update (array push)', () => {
  mutStore.update(d => { d.items.push('x'); if (d.items.length > 100) d.items.length = 0 }, actor)
}, 50_000))
printResult(results[results.length - 1])

results.push(bench('store.reset', () => {
  mutStore.reset({ count: 0, items: [] }, actor)
}, 50_000))
printResult(results[results.length - 1])

results.push(bench('store.delete', () => {
  mutStore.set('temp', 1, actor)
  mutStore.delete('temp', actor)
}, 10_000))
printResult(results[results.length - 1])

mutStore.destroy()

// 3. Subscriptions
separator('Subscriptions')

const subStore = createStore({ name: 'sub-bench', initial: { v: 0, other: 'x' } })
const listeners: Array<() => void> = []

// Add 10 listeners
for (let i = 0; i < 10; i++) {
  listeners.push(subStore.subscribe(() => {}))
}

results.push(bench('notify 10 listeners', () => {
  subStore.set('v', Math.random(), actor)
}, 10_000))
printResult(results[results.length - 1])

// Add 90 more (100 total)
for (let i = 0; i < 90; i++) {
  listeners.push(subStore.subscribe(() => {}))
}

results.push(bench('notify 100 listeners', () => {
  subStore.set('v', Math.random(), actor)
}, 10_000))
printResult(results[results.length - 1])

// Path-scoped (only matching listeners fire)
const pathStore = createStore({ name: 'path-sub-bench', initial: { a: 0, b: 0, c: 0 } })
for (let i = 0; i < 50; i++) pathStore.subscribe(() => {}, 'a')
for (let i = 0; i < 50; i++) pathStore.subscribe(() => {}, 'b')

results.push(bench('path-scoped subscription (50 match)', () => {
  pathStore.set('a', Math.random(), actor)
}, 10_000))
printResult(results[results.length - 1])

listeners.forEach(u => u())
subStore.destroy()
pathStore.destroy()

// 4. When / Gate evaluation
separator('When / Gate Evaluation')

const condStore = createStore({
  name: 'cond-bench',
  initial: { items: [1, 2, 3], loading: false, user: null as string | null },
  when: {
    isEmpty: (s) => s.items.length === 0,
    isLoading: (s) => s.loading,
    hasItems: (s) => s.items.length > 0,
    isBig: (s) => s.items.length > 100,
    isSmall: (s) => s.items.length < 5,
  },
  gates: {
    isAuthenticated: (s) => s.user !== null,
    hasData: (s) => s.items.length > 0,
    isReady: (s) => !s.loading && s.items.length > 0,
  },
})

results.push(bench('getWhen() (5 conditions)', () => {
  condStore.getWhen()
}, 100_000))
printResult(results[results.length - 1])

results.push(bench('getWhen() memoized (same state)', () => {
  condStore.getWhen()
  condStore.getWhen()
  condStore.getWhen()
}, 100_000))
printResult(results[results.length - 1])

results.push(bench('getGates() (3 conditions)', () => {
  condStore.getGates()
}, 100_000))
printResult(results[results.length - 1])

results.push(bench('isWhen() single check', () => {
  condStore.isWhen('isEmpty')
}, 100_000))
printResult(results[results.length - 1])

condStore.destroy()

// 5. Computed values
separator('Computed Values')

const compStore = createStore({
  name: 'comp-bench',
  initial: {
    items: Array.from({ length: 100 }, (_, i) => ({
      id: String(i),
      done: i % 3 === 0,
      priority: i % 5 === 0 ? 'high' : 'low',
    })),
  },
  computed: {
    doneCount: (s) => s.items.filter((i: any) => i.done).length,
    activeCount: (s) => s.items.filter((i: any) => !i.done).length,
    highPriority: (s) => s.items.filter((i: any) => i.priority === 'high').length,
    completionPct: (s) => {
      const done = s.items.filter((i: any) => i.done).length
      return Math.round((done / s.items.length) * 100)
    },
  },
})

results.push(bench('computed() single value (100 items)', () => {
  compStore.computed('doneCount')
}, 100_000))
printResult(results[results.length - 1])

results.push(bench('getComputed() all 4 values', () => {
  compStore.getComputed()
}, 100_000))
printResult(results[results.length - 1])

// Force recompute by mutating
results.push(bench('computed after mutation (recompute)', () => {
  compStore.update((d: any) => { d.items[0].done = !d.items[0].done }, actor)
  compStore.computed('doneCount')
}, 10_000))
printResult(results[results.length - 1])

compStore.destroy()

// 6. History (ring buffer)
separator('History (Ring Buffer)')

const histBench = createHistory(10_000)
const fakeAction = { id: 'a', type: 'SET' as const, path: 'x', value: 1, actor, timestamp: 0 }

results.push(bench('history.push()', () => {
  histBench.push(fakeAction)
}, 100_000))
printResult(results[results.length - 1])

// Fill to capacity
for (let i = 0; i < 10_000; i++) histBench.push(fakeAction)

results.push(bench('history.getAll() (10k items)', () => {
  histBench.getAll()
}, 1_000))
printResult(results[results.length - 1])

results.push(bench('history.getLast(10)', () => {
  histBench.getLast(10)
}, 10_000))
printResult(results[results.length - 1])

// 7. Middleware pipeline
separator('Middleware')

const mwStore = createStore({
  name: 'mw-bench',
  initial: { count: 0 },
  middleware: [
    { name: 'logger', enter: (a) => a, leave: () => {} },
    { name: 'validator', enter: (a) => a },
    { name: 'tracker', leave: () => {} },
  ],
})

results.push(bench('mutation with 3 middleware', () => {
  mwStore.set('count', Math.random(), actor)
}, 50_000))
printResult(results[results.length - 1])

mwStore.destroy()

// 8. Schema validation on mutation
separator('Schema Validation')

const schemaStore = createStore({
  name: 'schema-bench',
  initial: { count: 0, name: 'test' },
  stateSchema: z.object({ count: z.number(), name: z.string() }),
})

results.push(bench('mutation with Zod validation', () => {
  schemaStore.set('count', Math.random(), actor)
}, 10_000))
printResult(results[results.length - 1])

schemaStore.destroy()

// 9. Standalone evaluator benchmarks (raw, no store overhead)
separator('Raw Evaluator Performance')

const rawWhen = createWhenEvaluator({
  a: (s: any) => s.x > 0,
  b: (s: any) => s.x < 100,
  c: (s: any) => s.y === 'hello',
  d: (s: any) => s.items.length > 0,
  e: (s: any) => s.items.length < 50,
})

const rawState = { x: 42, y: 'hello', items: [1, 2, 3] }

results.push(bench('whenEvaluator.evaluate() raw', () => {
  rawWhen.evaluate(rawState)
}, 500_000))
printResult(results[results.length - 1])

const rawComputed = createComputedEvaluator({
  sum: (s: any) => s.items.reduce((a: number, b: number) => a + b, 0),
  avg: (s: any) => s.items.reduce((a: number, b: number) => a + b, 0) / s.items.length,
  max: (s: any) => Math.max(...s.items),
})

results.push(bench('computedEvaluator.get() memoized', () => {
  rawComputed.get('sum', rawState)
}, 500_000))
printResult(results[results.length - 1])

const newState = { ...rawState }
results.push(bench('computedEvaluator.get() recompute', () => {
  rawComputed.get('sum', { ...rawState })
}, 100_000))
printResult(results[results.length - 1])

// 10. Presence Tracker
separator('Presence Tracker')

const keyFn = (item: { id: string }) => item.id
function makeItems(n: number) {
  return Array.from({ length: n }, (_, i) => ({ id: String(i), label: `item-${i}` }))
}

results.push(bench('presence sync 10 items (add)', () => {
  const t = createPresenceTracker({ timeout: 300 })
  t.sync(makeItems(10), keyFn)
  t.destroy()
}, 10_000))
printResult(results[results.length - 1])

results.push(bench('presence sync 100 items (add)', () => {
  const t = createPresenceTracker({ timeout: 300 })
  t.sync(makeItems(100), keyFn)
  t.destroy()
}, 5_000))
printResult(results[results.length - 1])

results.push(bench('presence sync 1000 items (add)', () => {
  const t = createPresenceTracker({ timeout: 300 })
  t.sync(makeItems(1000), keyFn)
  t.destroy()
}, 1_000))
printResult(results[results.length - 1])

// Remove half → leaving phase
const presTracker1 = createPresenceTracker({ timeout: 0 })
const all100 = makeItems(100)
presTracker1.sync(all100, keyFn)
const half100 = all100.filter((_, i) => i % 2 === 0)
results.push(bench('presence remove 50 of 100 → leaving', () => {
  presTracker1.sync(half100, keyFn)
}, 10_000))
printResult(results[results.length - 1])
presTracker1.destroy()

// Boolean toggle (modal open/close)
results.push(bench('presence boolean toggle (10 cycles)', () => {
  const t = createPresenceTracker({ timeout: 0 })
  for (let i = 0; i < 10; i++) {
    t.syncBoolean(true)
    t.syncBoolean(false)
  }
  t.destroy()
}, 10_000))
printResult(results[results.length - 1])

// Rapid re-add during leave (race condition path)
results.push(bench('presence re-add 10 during leave', () => {
  const t = createPresenceTracker({ timeout: 0 })
  const items = makeItems(10)
  t.sync(items, keyFn)
  t.sync([], keyFn)       // all leaving
  t.sync(items, keyFn)    // re-add → cancel leave
  t.destroy()
}, 10_000))
printResult(results[results.length - 1])

// entered() signal
results.push(bench('presence entered() 100 items', () => {
  const t = createPresenceTracker()
  const items = makeItems(100)
  t.sync(items, keyFn)
  for (const item of items) t.entered(item.id)
  t.destroy()
}, 5_000))
printResult(results[results.length - 1])

// done() signal
results.push(bench('presence done() 100 leaving items', () => {
  const t = createPresenceTracker({ timeout: 0 })
  const items = makeItems(100)
  t.sync(items, keyFn)
  t.sync([], keyFn) // all leaving
  for (const item of items) t.done(item.id)
  t.destroy()
}, 5_000))
printResult(results[results.length - 1])

// flush()
results.push(bench('presence flush() 100 leaving', () => {
  const t = createPresenceTracker({ timeout: 0 })
  t.sync(makeItems(100), keyFn)
  t.sync([], keyFn) // all leaving
  t.flush()
  t.destroy()
}, 5_000))
printResult(results[results.length - 1])

// With subscribers
results.push(bench('presence sync + 10 subscribers', () => {
  const t = createPresenceTracker()
  for (let s = 0; s < 10; s++) t.subscribe(() => {})
  t.sync(makeItems(10), keyFn)
  t.destroy()
}, 10_000))
printResult(results[results.length - 1])

// Churn: simulates animated list (add/remove cycle)
results.push(bench('presence churn (add 5, remove 5, flush)', () => {
  const t = createPresenceTracker({ timeout: 0 })
  let items = makeItems(20)
  t.sync(items, keyFn)
  items = [...items.slice(5), ...Array.from({ length: 5 }, (_, i) => ({ id: `n${i}`, label: `n${i}` }))]
  t.sync(items, keyFn)
  t.flush()
  t.destroy()
}, 5_000))
printResult(results[results.length - 1])

// ─── Summary ─────────────────────────────────────────────────

separator('SUMMARY')
console.log()
for (const r of results) {
  printResult(r)
}

// Cleanup
storeRegistry.clear()
