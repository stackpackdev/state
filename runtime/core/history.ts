// Bounded action history buffer — ring buffer implementation
// O(1) push, O(n) only on getAll/filter operations

import type { Action } from './types.js'

const DEFAULT_LIMIT = 10_000

export interface ActionHistory {
  push(action: Action): void
  getAll(): Action[]
  getByActor(actorId: string): Action[]
  getByPath(path: string): Action[]
  getLast(n?: number): Action[]
  clear(): void
  readonly length: number
}

export function createHistory(limit: number = DEFAULT_LIMIT): ActionHistory {
  let buffer: Array<Action | undefined> = new Array(limit)
  let head = 0
  let size = 0

  function toArray(): Action[] {
    if (size === 0) return []
    const result: Action[] = new Array(size)
    // Return newest-first: head-1 is newest, walk backwards wrapping around
    for (let i = 0; i < size; i++) {
      const idx = (head - 1 - i + limit) % limit
      result[i] = buffer[idx]!
    }
    return result
  }

  return {
    push(action: Action) {
      buffer[head] = action
      head = (head + 1) % limit
      if (size < limit) size++
    },

    getAll() {
      return toArray()
    },

    getByActor(actorId: string) {
      return toArray().filter(a => a.actor.id === actorId)
    },

    getByPath(path: string) {
      return toArray().filter(a => a.path?.startsWith(path))
    },

    getLast(n: number = 1) {
      return toArray().slice(0, n)
    },

    clear() {
      buffer = new Array(limit)
      head = 0
      size = 0
    },

    get length() {
      return size
    },
  }
}
