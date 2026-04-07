import { test, expect } from 'vitest'
import { createPresenceTracker } from '../presence.js'

const keyFn = (item: { id: string }) => item.id
function makeItems(n: number) {
  return Array.from({ length: n }, (_, i) => ({ id: String(i), label: `item-${i}` }))
}

test('presence sync 100 items < 0.1ms', () => {
  const tracker = createPresenceTracker({ timeout: 300 })
  const items = makeItems(100)

  // warmup
  tracker.sync(items, keyFn)
  tracker.destroy()

  const t2 = createPresenceTracker({ timeout: 300 })
  const start = performance.now()
  t2.sync(items, keyFn)
  const elapsed = performance.now() - start

  expect(elapsed).toBeLessThan(0.2) // 2x budget margin
  t2.destroy()
})

test('presence boolean toggle < 0.01ms', () => {
  const tracker = createPresenceTracker({ timeout: 0 })
  tracker.syncBoolean(true)

  const start = performance.now()
  tracker.syncBoolean(false)
  const elapsed = performance.now() - start

  expect(elapsed).toBeLessThan(0.05) // 5x budget margin
  tracker.destroy()
})

test('presence re-add during leave < 0.02ms', () => {
  const tracker = createPresenceTracker({ timeout: 0 })
  const items = makeItems(10)
  tracker.sync(items, keyFn)
  tracker.sync([], keyFn) // all leaving

  const start = performance.now()
  tracker.sync(items, keyFn) // re-add → cancel leave
  const elapsed = performance.now() - start

  expect(elapsed).toBeLessThan(0.1) // 5x budget margin
  tracker.destroy()
})

test('presence churn (20 items, add/remove 5) < 0.1ms', () => {
  // warmup JIT
  const warmup = createPresenceTracker({ timeout: 0 })
  warmup.sync(makeItems(20), keyFn)
  warmup.sync(makeItems(15), keyFn)
  warmup.flush()
  warmup.destroy()

  const tracker = createPresenceTracker({ timeout: 0 })
  let items = makeItems(20)
  tracker.sync(items, keyFn)

  items = [...items.slice(5), ...Array.from({ length: 5 }, (_, i) => ({ id: `n${i}`, label: `n${i}` }))]

  const start = performance.now()
  tracker.sync(items, keyFn)
  tracker.flush()
  const elapsed = performance.now() - start

  expect(elapsed).toBeLessThan(5) // generous margin for CI cold-start
  tracker.destroy()
})

test('presence entered() 100 items < 0.5ms', () => {
  const tracker = createPresenceTracker()
  const items = makeItems(100)
  tracker.sync(items, keyFn)

  const start = performance.now()
  for (const item of items) tracker.entered(item.id)
  const elapsed = performance.now() - start

  expect(elapsed).toBeLessThan(1) // 2x budget margin
  tracker.destroy()
})
