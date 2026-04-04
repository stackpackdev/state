// Effect Declarations — reactive side effects triggered by state changes
//
// Effects watch specific state paths or mode transitions and run handlers
// when changes are detected. Supports debounce, abort signals, and retry.

import type { Actor, Store } from './types.js'
import { getPath } from './path.js'
import { extractModes } from './modes.js'

// ─── Types ──────────────────────────────────────────────────

export interface EffectDeclaration<T = any> {
  /** Dot-path to watch, or "modeA -> modeB" for transition triggers */
  watch: string
  /** The effect handler */
  handler: (context: EffectContext<T>) => Promise<void> | void
  /** Debounce in ms. Default: 0 (immediate) */
  debounce?: number
  /** Retry configuration */
  retry?: { max: number; backoff?: 'linear' | 'exponential' }
}

export interface EffectContext<T = any> {
  state: T
  prevState: T
  store: Store<T>
  signal: AbortSignal
  actor: Actor
}

export type EffectStatus = 'idle' | 'running' | 'debouncing' | 'retrying' | 'error'

export interface EffectRunner<T = any> {
  /** Start watching for triggers */
  start(store: Store<T>): void
  /** Stop all effects and cancel pending ones */
  stop(): void
  /** Get status of all effects */
  status(): Record<string, EffectStatus>
}

// ─── System Actor ───────────────────────────────────────────

const effectSystemActor: Actor = {
  id: 'effect-system',
  type: 'system',
  name: 'effect-runner',
}

// ─── Transition Parsing ─────────────────────────────────────

interface TransitionWatch {
  from: string
  to: string
}

function parseTransitionWatch(watch: string): TransitionWatch | null {
  if (!watch.includes(' -> ')) return null
  const parts = watch.split(' -> ')
  if (parts.length !== 2) return null
  return { from: parts[0].trim(), to: parts[1].trim() }
}

// ─── Base Retry Delay ───────────────────────────────────────

const BASE_RETRY_DELAY = 100

// ─── Create Effect Runner ───────────────────────────────────

export function createEffectRunner<T>(
  declarations: Record<string, EffectDeclaration<T>>
): EffectRunner<T> {
  const statuses: Record<string, EffectStatus> = {}
  const controllers: Record<string, AbortController> = {}
  const timers: Record<string, ReturnType<typeof setTimeout>> = {}
  let unsubscribe: (() => void) | null = null

  // Initialize all statuses to idle
  for (const name of Object.keys(declarations)) {
    statuses[name] = 'idle'
  }

  function abortEffect(name: string): void {
    if (controllers[name]) {
      controllers[name].abort()
      delete controllers[name]
    }
    if (timers[name]) {
      clearTimeout(timers[name])
      delete timers[name]
    }
  }

  async function runHandler(
    name: string,
    decl: EffectDeclaration<T>,
    store: Store<T>,
    state: T,
    prevState: T
  ): Promise<void> {
    // Abort previous invocation
    abortEffect(name)

    const controller = new AbortController()
    controllers[name] = controller

    const context: EffectContext<T> = {
      state,
      prevState,
      store,
      signal: controller.signal,
      actor: effectSystemActor,
    }

    const maxRetries = decl.retry?.max ?? 0
    const backoff = decl.retry?.backoff ?? 'linear'

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      if (controller.signal.aborted) return

      try {
        statuses[name] = attempt > 0 ? 'retrying' : 'running'
        await decl.handler(context)
        statuses[name] = 'idle'
        return
      } catch (err) {
        if (controller.signal.aborted) return

        if (attempt < maxRetries) {
          // Wait before retry
          const delay =
            backoff === 'exponential'
              ? BASE_RETRY_DELAY * Math.pow(2, attempt)
              : BASE_RETRY_DELAY * (attempt + 1)

          statuses[name] = 'retrying'
          await new Promise<void>((resolve) => {
            timers[name] = setTimeout(resolve, delay)
          })
        } else {
          statuses[name] = 'error'
        }
      }
    }
  }

  function triggerEffect(
    name: string,
    decl: EffectDeclaration<T>,
    store: Store<T>,
    state: T,
    prevState: T
  ): void {
    const debounceMs = decl.debounce ?? 0

    if (debounceMs > 0) {
      abortEffect(name)
      statuses[name] = 'debouncing'
      timers[name] = setTimeout(() => {
        delete timers[name]
        runHandler(name, decl, store, state, prevState)
      }, debounceMs)
    } else {
      runHandler(name, decl, store, state, prevState)
    }
  }

  return {
    start(store: Store<T>) {
      // Detect discriminant for transition watches
      const schema = store.getSchema?.()
      const modeInfo = schema ? extractModes(schema) : null

      unsubscribe = store.subscribe((nextState, prevState) => {
        for (const [name, decl] of Object.entries(declarations)) {
          const transition = parseTransitionWatch(decl.watch)

          if (transition) {
            // Transition watch: detect discriminant field change
            if (!modeInfo) continue
            const prevMode = (prevState as any)?.[modeInfo.discriminant]
            const nextMode = (nextState as any)?.[modeInfo.discriminant]
            if (prevMode === transition.from && nextMode === transition.to) {
              triggerEffect(name, decl, store, nextState, prevState)
            }
          } else {
            // Dot-path watch: compare values at path
            const prevVal = getPath(prevState, decl.watch)
            const nextVal = getPath(nextState, decl.watch)
            if (prevVal !== nextVal) {
              triggerEffect(name, decl, store, nextState, prevState)
            }
          }
        }
      })
    },

    stop() {
      // Abort all controllers and clear all timers
      for (const name of Object.keys(declarations)) {
        abortEffect(name)
        statuses[name] = 'idle'
      }
      if (unsubscribe) {
        unsubscribe()
        unsubscribe = null
      }
    },

    status() {
      return { ...statuses }
    },
  }
}
