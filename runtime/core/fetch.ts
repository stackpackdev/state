// Declarative data fetching — define what data a store needs, not how to fetch it.
// Built-in loading, error, cache states with Zod response validation.
//
// The agent declares data sources at store level. The runtime handles:
//   - Loading/error/stale state transitions
//   - Zod validation of fetched data
//   - Cache with TTL
//   - Refetch on demand
//   - Automatic state updates via a system actor

import type { ZodType } from 'zod'
import type { Actor, Store } from './types.js'
import { createSystemActor } from './actor.js'

// ─── Types ──────────────────────────────────────────────────

export type FetchStatus = 'idle' | 'loading' | 'success' | 'error'

export interface FetchState<T = unknown> {
  data: T | null
  error: Error | null
  status: FetchStatus
  /** Timestamp of last successful fetch */
  fetchedAt: number | null
  /** True when data exists but is past its TTL */
  isStale: boolean
}

export interface FetcherOptions<T = unknown> {
  /** Unique name for this fetcher */
  name: string
  /** The async function that fetches data */
  fn: () => Promise<T>
  /** Zod schema to validate the response */
  schema?: ZodType<T>
  /** Cache TTL in milliseconds. 0 = no cache. Default: 0 */
  cacheTtl?: number
  /** Actor used for store mutations. Default: system actor named after the fetcher */
  actor?: Actor
}

export interface Fetcher<T = unknown> {
  readonly name: string
  /** Current fetch state */
  getState(): FetchState<T>
  /** Execute the fetch. Returns the data or throws. */
  fetch(): Promise<T>
  /** Refetch — ignores cache, always hits the network */
  refetch(): Promise<T>
  /** Invalidate cache without refetching */
  invalidate(): void
  /** Bind this fetcher to a store — writes fetch state into `storePath` */
  bind(store: Store, storePath?: string): BoundFetcher<T>
}

export interface BoundFetcher<T = unknown> extends Fetcher<T> {
  /** Unbind from the store */
  unbind(): void
}

// ─── Initial State ──────────────────────────────────────────

export function createInitialFetchState<T>(): FetchState<T> {
  return {
    data: null,
    error: null,
    status: 'idle',
    fetchedAt: null,
    isStale: false,
  }
}

// ─── Create Fetcher ─────────────────────────────────────────

export function createFetcher<T = unknown>(options: FetcherOptions<T>): Fetcher<T> {
  const {
    name,
    fn,
    schema,
    cacheTtl = 0,
    actor: customActor,
  } = options

  const actor = customActor ?? createSystemActor(`fetcher:${name}`)
  let state: FetchState<T> = createInitialFetchState()
  let fetchPromise: Promise<T> | null = null

  function isCacheValid(): boolean {
    if (cacheTtl <= 0 || state.fetchedAt === null) return false
    return Date.now() - state.fetchedAt < cacheTtl
  }

  function updateStale(): void {
    if (state.data !== null && state.fetchedAt !== null && cacheTtl > 0) {
      state = { ...state, isStale: !isCacheValid() }
    }
  }

  async function executeFetch(): Promise<T> {
    state = { ...state, status: 'loading', error: null, isStale: false }

    try {
      const raw = await fn()

      // Validate with Zod if schema provided
      let data: T
      if (schema) {
        const result = schema.safeParse(raw)
        if (!result.success) {
          throw new Error(
            `[state-agent] Fetcher "${name}": response validation failed:\n` +
            result.error.issues.map((i: any) => `  ${i.path.join('.')}: ${i.message}`).join('\n')
          )
        }
        data = result.data as T
      } else {
        data = raw
      }

      state = {
        data,
        error: null,
        status: 'success',
        fetchedAt: Date.now(),
        isStale: false,
      }

      return data
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err))
      state = { ...state, status: 'error', error }
      throw error
    } finally {
      fetchPromise = null
    }
  }

  const fetcher: Fetcher<T> = {
    get name() { return name },

    getState() {
      updateStale()
      return state
    },

    async fetch() {
      // Return cached data if still valid
      if (isCacheValid() && state.data !== null) {
        return state.data
      }
      // Deduplicate in-flight requests
      if (fetchPromise) return fetchPromise
      fetchPromise = executeFetch()
      return fetchPromise
    },

    async refetch() {
      fetchPromise = null
      state = { ...state, fetchedAt: null }
      fetchPromise = executeFetch()
      return fetchPromise
    },

    invalidate() {
      state = { ...state, fetchedAt: null, isStale: state.data !== null }
    },

    bind(store: Store, storePath?: string): BoundFetcher<T> {
      const path = storePath ?? name

      // Sync fetcher state → store
      function syncToStore(fetchState: FetchState<T>) {
        store.update((draft: any) => {
          const target = path.includes('.')
            ? path.split('.').reduce((obj: any, key: string) => obj[key], draft)
            : draft[path] !== undefined ? draft[path] : draft

          // If the store path points to an object, spread fetch state into it
          if (typeof target === 'object' && target !== null) {
            Object.assign(target, {
              data: fetchState.data,
              isLoading: fetchState.status === 'loading',
              error: fetchState.error,
              isStale: fetchState.isStale,
            })
          }
        }, actor)
      }

      // Wrap fetch/refetch to sync state to store
      const boundFetcher: BoundFetcher<T> = {
        ...fetcher,

        async fetch() {
          syncToStore({ ...state, status: 'loading', error: null, isStale: false })
          try {
            const data = await fetcher.fetch()
            syncToStore(fetcher.getState())
            return data
          } catch (err) {
            syncToStore(fetcher.getState())
            throw err
          }
        },

        async refetch() {
          syncToStore({ ...state, status: 'loading', error: null, isStale: false })
          try {
            const data = await fetcher.refetch()
            syncToStore(fetcher.getState())
            return data
          } catch (err) {
            syncToStore(fetcher.getState())
            throw err
          }
        },

        invalidate() {
          fetcher.invalidate()
          syncToStore(fetcher.getState())
        },

        unbind() {
          // No-op cleanup — future: could remove store listener
        },
      }

      return boundFetcher
    },
  }

  return fetcher
}
