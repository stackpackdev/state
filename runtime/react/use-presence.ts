// React hooks for presence-based animated lifecycle
//
// usePresence  — single boolean gate → deferred unmounting
// usePresenceList — array of items → enter/leave per item
//
// These hooks bridge the core PresenceTracker (framework-agnostic)
// with React's subscription model (useSyncExternalStore).

import { useCallback, useEffect, useRef, useSyncExternalStore } from 'react'
import type { PresencePhase, PresenceRecord } from '../core/types.js'
import { createPresenceTracker } from '../core/presence.js'
import type { PresenceTracker } from '../core/presence.js'
import { getPath } from '../core/path.js'
import { getStore } from '../core/store.js'

// ─── usePresence ─────────────────────────────────────────────
// Single-item presence tracking for a boolean gate.

export interface UsePresenceOptions {
  /**
   * Leave timeout in ms. After this duration, the element is auto-removed.
   * Set 0 for manual-only removal (must call done()).
   * Default: 300
   */
  timeout?: number
}

export interface UsePresenceResult {
  /** Whether the element should be in the DOM (true during entering, present, AND leaving) */
  isPresent: boolean
  /** Current phase, or null if fully removed */
  phase: PresencePhase | null
  /** Call to signal leave animation is complete */
  done: () => void
  /** Call to signal enter animation is complete */
  entered: () => void
  /**
   * Ref callback — attach to DOM element for automatic CSS transitionend detection.
   * When a transitionend event fires during the 'leaving' phase, done() is called automatically.
   * Optional: ignore this if you prefer manual done() or timeout-based removal.
   */
  ref: React.RefCallback<HTMLElement>
}

const BOOLEAN_KEY = '__presence__'

export function usePresence(
  storeName: string,
  gateName: string,
  options: UsePresenceOptions = {}
): UsePresenceResult {
  const timeout = options.timeout ?? 300

  // Stable tracker ref — survives re-renders, destroyed on unmount
  const trackerRef = useRef<PresenceTracker<boolean> | null>(null)
  if (!trackerRef.current) {
    trackerRef.current = createPresenceTracker<boolean>({ timeout })
  }
  const tracker = trackerRef.current

  // Clean up on unmount
  useEffect(() => {
    return () => {
      trackerRef.current?.destroy()
      trackerRef.current = null
    }
  }, [])

  // Subscribe to the store's gate and sync presence
  const store = getStore(storeName)
  if (!store) {
    throw new Error(
      `[state-agent] usePresence: Store "${storeName}" not found.`
    )
  }

  // Snapshot: read gate → sync tracker → return records
  const getSnapshot = useCallback(() => {
    const gateOpen = store.isGated(gateName)
    tracker.syncBoolean(gateOpen)
    return tracker.records()
  }, [store, gateName, tracker])

  // Subscribe to both the store AND the tracker
  const subscribe = useCallback(
    (onStoreChange: () => void) => {
      const unsubStore = store.subscribe(() => onStoreChange())
      const unsubTracker = tracker.subscribe(() => onStoreChange())
      return () => {
        unsubStore()
        unsubTracker()
      }
    },
    [store, tracker]
  )

  const records = useSyncExternalStore(subscribe, getSnapshot, getSnapshot)

  const record = records.length > 0 ? records[0] : null

  // Stable callbacks
  const done = useCallback(() => {
    tracker.done(BOOLEAN_KEY)
  }, [tracker])

  const entered = useCallback(() => {
    tracker.entered(BOOLEAN_KEY)
  }, [tracker])

  // Ref callback for automatic transitionend detection
  const elementRef = useRef<HTMLElement | null>(null)
  const phaseRef = useRef<PresencePhase | null>(null)
  phaseRef.current = record?.phase ?? null

  const ref: React.RefCallback<HTMLElement> = useCallback(
    (el: HTMLElement | null) => {
      // Clean up previous listener
      if (elementRef.current) {
        elementRef.current.removeEventListener('transitionend', handleTransitionEnd)
      }
      elementRef.current = el
      if (el) {
        el.addEventListener('transitionend', handleTransitionEnd)
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  )

  function handleTransitionEnd(e: TransitionEvent) {
    // Only trigger for the element itself, not bubbled events from children
    if (e.target !== elementRef.current) return
    if (phaseRef.current === 'leaving') {
      tracker.done(BOOLEAN_KEY)
    }
  }

  return {
    isPresent: record !== null,
    phase: record?.phase ?? null,
    done,
    entered,
    ref,
  }
}

// ─── usePresenceList ─────────────────────────────────────────
// List presence tracking for array items.

export interface UsePresenceListOptions<T = any> {
  /**
   * Leave timeout in ms. Default: 300.
   */
  timeout?: number
  /**
   * Extract stable key from item.
   * Default: (item) => item.id
   */
  keyFn?: (item: T) => string
}

export interface UsePresenceListResult<T> {
  /** All items including departing ones, with lifecycle metadata */
  items: PresenceRecord<T>[]
  /** Signal that a specific item's leave animation is done */
  done: (key: string) => void
  /** Signal that a specific item's enter animation is done */
  entered: (key: string) => void
  /** Remove all leaving items immediately */
  flush: () => void
}

const defaultKeyFn = (item: any) => String(item.id)

export function usePresenceList<T = any>(
  storeName: string,
  path: string,
  options: UsePresenceListOptions<T> = {}
): UsePresenceListResult<T> {
  const timeout = options.timeout ?? 300
  const keyFn = options.keyFn ?? defaultKeyFn

  // Stable tracker ref
  const trackerRef = useRef<PresenceTracker<T> | null>(null)
  if (!trackerRef.current) {
    trackerRef.current = createPresenceTracker<T>({ timeout })
  }
  const tracker = trackerRef.current

  // Clean up on unmount
  useEffect(() => {
    return () => {
      trackerRef.current?.destroy()
      trackerRef.current = null
    }
  }, [])

  const store = getStore(storeName)
  if (!store) {
    throw new Error(
      `[state-agent] usePresenceList: Store "${storeName}" not found.`
    )
  }

  // Snapshot: read array at path → sync tracker → return records
  const getSnapshot = useCallback(() => {
    const array = getPath(store.getState(), path) as T[] | undefined
    tracker.sync(array ?? [], keyFn)
    return tracker.records()
  }, [store, path, keyFn, tracker])

  const subscribe = useCallback(
    (onStoreChange: () => void) => {
      const unsubStore = store.subscribe(() => onStoreChange(), path)
      const unsubTracker = tracker.subscribe(() => onStoreChange())
      return () => {
        unsubStore()
        unsubTracker()
      }
    },
    [store, path, tracker]
  )

  const items = useSyncExternalStore(subscribe, getSnapshot, getSnapshot)

  const done = useCallback(
    (key: string) => tracker.done(key),
    [tracker]
  )

  const entered = useCallback(
    (key: string) => tracker.entered(key),
    [tracker]
  )

  const flush = useCallback(
    () => tracker.flush(),
    [tracker]
  )

  return { items, done, entered, flush }
}
