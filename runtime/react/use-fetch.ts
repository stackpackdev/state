// useFetch — React hook for declarative data fetching with store binding
// Wraps createFetcher with automatic lifecycle management.

import { useCallback, useEffect, useRef, useSyncExternalStore } from 'react'
import type { FetchState, FetcherOptions } from '../core/fetch.js'
import { createFetcher, createInitialFetchState } from '../core/fetch.js'

export interface UseFetchOptions<T = unknown> extends Omit<FetcherOptions<T>, 'name'> {
  /** Unique key for this fetch — used for deduplication and caching */
  key: string
  /** Fetch automatically on mount. Default: true */
  auto?: boolean
}

export interface UseFetchResult<T = unknown> {
  data: T | null
  error: Error | null
  isLoading: boolean
  isStale: boolean
  status: FetchState<T>['status']
  /** Trigger a fetch (uses cache if valid) */
  fetch: () => Promise<T | undefined>
  /** Force refetch (ignores cache) */
  refetch: () => Promise<T | undefined>
  /** Invalidate cache */
  invalidate: () => void
}

// Global fetcher registry — deduplicates across components
const fetcherRegistry = new Map<string, ReturnType<typeof createFetcher>>()

export function useFetch<T = unknown>(options: UseFetchOptions<T>): UseFetchResult<T> {
  const { key, auto = true, ...fetcherOptions } = options

  // Get or create fetcher — stable across re-renders
  const fetcherRef = useRef<ReturnType<typeof createFetcher<T>> | null>(null)
  if (!fetcherRef.current) {
    const existing = fetcherRegistry.get(key)
    if (existing) {
      fetcherRef.current = existing as ReturnType<typeof createFetcher<T>>
    } else {
      const fetcher = createFetcher<T>({ name: key, ...fetcherOptions })
      fetcherRegistry.set(key, fetcher)
      fetcherRef.current = fetcher
    }
  }

  const fetcher = fetcherRef.current

  // Track state changes for re-rendering
  const stateRef = useRef<FetchState<T>>(fetcher.getState())
  const listenersRef = useRef(new Set<() => void>())

  const subscribe = useCallback((onStoreChange: () => void) => {
    listenersRef.current.add(onStoreChange)
    return () => { listenersRef.current.delete(onStoreChange) }
  }, [])

  const getSnapshot = useCallback(() => {
    const next = fetcher.getState()
    if (next !== stateRef.current) {
      stateRef.current = next
    }
    return stateRef.current
  }, [fetcher])

  const state = useSyncExternalStore(subscribe, getSnapshot, getSnapshot)

  // Notify subscribers after fetch completes
  const notifyChange = useCallback(() => {
    for (const listener of listenersRef.current) {
      listener()
    }
  }, [])

  const doFetch = useCallback(async () => {
    try {
      const data = await fetcher.fetch()
      notifyChange()
      return data
    } catch {
      notifyChange()
      return undefined
    }
  }, [fetcher, notifyChange])

  const doRefetch = useCallback(async () => {
    try {
      const data = await fetcher.refetch()
      notifyChange()
      return data
    } catch {
      notifyChange()
      return undefined
    }
  }, [fetcher, notifyChange])

  const doInvalidate = useCallback(() => {
    fetcher.invalidate()
    notifyChange()
  }, [fetcher, notifyChange])

  // Auto-fetch on mount
  useEffect(() => {
    if (auto) {
      doFetch()
    }
  }, [auto, doFetch])

  // Cleanup fetcher from registry on unmount (if no other consumers)
  useEffect(() => {
    return () => {
      // Only remove if this was the last consumer
      if (listenersRef.current.size === 0) {
        fetcherRegistry.delete(key)
      }
    }
  }, [key])

  return {
    data: state.data,
    error: state.error,
    isLoading: state.status === 'loading',
    isStale: state.isStale,
    status: state.status,
    fetch: doFetch,
    refetch: doRefetch,
    invalidate: doInvalidate,
  }
}

/** Clear all cached fetchers — useful in tests */
export function clearFetcherRegistry(): void {
  fetcherRegistry.clear()
}
