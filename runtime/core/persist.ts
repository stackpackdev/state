// Persistence layer for state-agent stores
// Provides middleware-based state persistence with debounced writes,
// schema validation on hydration, and versioned migrations.

import type { ZodType } from 'zod'
import type { Middleware } from './types.js'
import { getPath } from './path.js'

// ─── Types ──────────────────────────────────────────────────

export interface PersistOptions<T = any> {
  /** Storage key */
  key: string
  /** Storage adapter. Default: in-memory (for Node.js/testing) */
  storage?: StorageAdapter
  /** Only persist these paths (default: entire state) */
  paths?: string[]
  /** Schema version for migrations */
  version?: number
  /** Migration function: receives persisted data and stored version, returns migrated state */
  migrate?: (persisted: unknown, version: number) => T
  /** Debounce writes in ms. Default: 100 */
  debounceMs?: number
}

export interface StorageAdapter {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
}

// ─── Persisted data envelope ────────────────────────────────

interface PersistedEnvelope {
  __version?: number
  __paths?: boolean
  data: unknown
}

// ─── In-memory storage adapter ──────────────────────────────

/** In-memory storage adapter for testing and Node.js environments */
export function createMemoryStorage(): StorageAdapter {
  const map = new Map<string, string>()
  return {
    getItem(key: string): string | null {
      return map.get(key) ?? null
    },
    setItem(key: string, value: string): void {
      map.set(key, value)
    },
    removeItem(key: string): void {
      map.delete(key)
    },
  }
}

// ─── Persist middleware + hydration ─────────────────────────

/** Create persist middleware + hydration function */
export function createPersistMiddleware<T>(
  options: PersistOptions<T>,
  schema?: ZodType<T>
): { middleware: Middleware; hydrate: () => T | undefined } {
  const {
    key,
    storage = createMemoryStorage(),
    paths,
    version = 1,
    migrate,
    debounceMs = 100,
  } = options

  let debounceTimer: ReturnType<typeof setTimeout> | null = null

  function writeTo(state: any): void {
    let envelope: PersistedEnvelope

    if (paths && paths.length > 0) {
      const data: Record<string, unknown> = {}
      for (const p of paths) {
        data[p] = getPath(state, p)
      }
      envelope = { __version: version, __paths: true, data }
    } else {
      envelope = { __version: version, data: state }
    }

    storage.setItem(key, JSON.stringify(envelope))
  }

  function scheduleWrite(state: any): void {
    if (debounceTimer !== null) {
      clearTimeout(debounceTimer)
    }
    debounceTimer = setTimeout(() => {
      debounceTimer = null
      writeTo(state)
    }, debounceMs)
  }

  function hydrate(): T | undefined {
    const raw = storage.getItem(key)
    if (raw === null) return undefined

    let parsed: PersistedEnvelope
    try {
      parsed = JSON.parse(raw)
    } catch {
      return undefined
    }

    // Handle version migration
    const storedVersion = parsed.__version ?? 0
    let data = parsed.data

    if (storedVersion !== version && migrate) {
      data = migrate(data, storedVersion)
    }

    // Validate against schema if provided
    if (schema) {
      const result = schema.safeParse(data)
      if (!result.success) {
        return undefined
      }
      return result.data as T
    }

    return data as T
  }

  const middleware: Middleware = {
    name: `persist:${key}`,
    leave(_action, _prevState, nextState) {
      scheduleWrite(nextState)
    },
  }

  return { middleware, hydrate }
}
