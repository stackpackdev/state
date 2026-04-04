// Optimistic updates with automatic rollback
// Applies mutations immediately, commits asynchronously, rolls back on failure
// Uses queue rebase strategy: if op A fails but op B is pending, B is re-applied after rollback

import type { Actor, Store } from './types.js'

export interface OptimisticOptions<T = any> {
  /** Immediately apply this mutation */
  apply: (draft: T) => void
  /** The async operation to confirm the optimistic update */
  commit: () => Promise<unknown>
  /** Optional: reconcile server response with optimistic state */
  reconcile?: (draft: T, response: unknown) => void
  /** Actor performing this operation */
  actor: Actor
}

export interface OptimisticResult {
  success: boolean
  error?: Error
}

interface PendingOp<T = any> {
  id: number
  snapshot: T
  apply: (draft: T) => void
}

export interface OptimisticQueue<T = any> {
  enqueue(store: Store<T>, options: OptimisticOptions<T>): Promise<OptimisticResult>
  pending(): number
  hasPending(): boolean
}

let opCounter = 0

export function createOptimisticQueue<T = any>(): OptimisticQueue<T> {
  const pendingOps: PendingOp<T>[] = []

  return {
    async enqueue(store: Store<T>, options: OptimisticOptions<T>): Promise<OptimisticResult> {
      const id = ++opCounter
      const snapshot = structuredClone(store.getState())

      // Track this pending operation
      const op: PendingOp<T> = { id, snapshot, apply: options.apply }
      pendingOps.push(op)

      // Apply mutation immediately (synchronous, bypasses batcher)
      store.update(options.apply, options.actor)

      try {
        // Attempt async commit
        const response = await options.commit()

        // Remove from pending
        const idx = pendingOps.findIndex(p => p.id === id)
        if (idx !== -1) pendingOps.splice(idx, 1)

        // Reconcile if provided
        if (options.reconcile) {
          store.update(draft => options.reconcile!(draft, response), options.actor)
        }

        return { success: true }
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err))

        // Remove failed op from pending
        const idx = pendingOps.findIndex(p => p.id === id)
        if (idx !== -1) pendingOps.splice(idx, 1)

        // Restore to snapshot (state before this op was applied)
        store.reset(snapshot, options.actor)

        // Re-apply any still-pending operations on top (queue rebase)
        for (const pending of pendingOps) {
          store.update(pending.apply, options.actor)
        }

        return { success: false, error }
      }
    },

    pending() {
      return pendingOps.length
    },

    hasPending() {
      return pendingOps.length > 0
    },
  }
}
