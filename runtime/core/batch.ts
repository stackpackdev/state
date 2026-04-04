// Buffered dispatch for batching rapid state changes
// Extracted from Flow.js: useSetFlowToBuffer + setTimeout(fn, 25) pattern (lines 117-141)
// Critical for AI agents that fire many state changes in rapid succession.

import type { Action } from './types.js'

export interface Batcher {
  /** Queue an action for batched execution. Key deduplicates (latest wins). */
  queue(key: string, action: Action): void
  /** Immediately flush all queued actions */
  flush(): void
  /** Cancel all queued actions */
  cancel(): void
  /** Number of currently queued actions */
  readonly pending: number
}

export function createBatcher(
  applyFn: (actions: Action[]) => void,
  ms: number = 25
): Batcher {
  // From Flow.js: useSetFlowToBuffer = {} and useSetFlowToTimeout = null
  let buffer: Map<string, Action> = new Map()
  let timeout: ReturnType<typeof setTimeout> | null = null

  return {
    queue(key: string, action: Action) {
      buffer.set(key, action)

      if (timeout) clearTimeout(timeout)
      timeout = setTimeout(() => {
        timeout = null
        const actions = Array.from(buffer.values())
        buffer.clear()
        applyFn(actions)
      }, ms)
    },

    flush() {
      if (timeout) clearTimeout(timeout)
      timeout = null
      const actions = Array.from(buffer.values())
      buffer.clear()
      if (actions.length > 0) applyFn(actions)
    },

    cancel() {
      if (timeout) clearTimeout(timeout)
      timeout = null
      buffer.clear()
    },

    get pending() {
      return buffer.size
    },
  }
}
