// Hierarchical flow state machines — tree-addressable navigation
//
// From Flow.js: flowDefinition (line 14), has() (lines 93-106),
// getNextFlow with sibling cleanup (lines 53-78), action history
//
// Enhanced from playground review:
// - 'separate' mode: one child active at a time (like routes, tab panels)
// - 'together' mode: all children render, visibility controlled by gates
// - Nested flows: path-based addressing ('/Dashboard/Settings')
// - activeChain(): full active path for agent traversal

import type { Actor, Flow, FlowMode, FlowOptions, Unsubscribe } from './types.js'

type FlowListener = (current: string, prev: string, actor: Actor) => void

/**
 * Create a hierarchical flow state machine.
 * Supports tree-shaped flows with path-based addressing.
 *
 * Path addressing:
 *   flow.go('Settings', actor)         — navigate within this flow
 *   flow.go('/Dashboard/Settings', actor) — navigate to nested path
 *   flow.resolve('Dashboard')          — get child flow
 *   flow.activeChain()                 — ['app/Dashboard', 'dashboard/Settings']
 */
export function createFlow(options: FlowOptions): Flow {
  const { name, states, initial, mode = 'separate' } = options

  if (!states.includes(initial)) {
    throw new Error(
      `Flow "${name}": initial state "${initial}" is not in valid states [${states.join(', ')}]`
    )
  }

  let currentState = initial
  let listeners: FlowListener[] = []
  let history: Array<{
    from: string
    to: string
    actor: Actor
    timestamp: number
  }> = []

  // Build child flows
  const childFlows: Record<string, Flow> = {}
  if (options.children) {
    for (const [key, childOptions] of Object.entries(options.children)) {
      childFlows[key] = createFlow(childOptions)
    }
  }

  const flow: Flow = {
    get name() {
      return name
    },

    get mode() {
      return mode
    },

    current() {
      return currentState
    },

    go(state: string, actor: Actor) {
      // Handle path-based navigation: '/Dashboard/Settings'
      if (state.startsWith('/')) {
        const segments = state.slice(1).split('/')
        if (segments.length > 1) {
          // First segment targets a state in this flow
          const targetState = segments[0]
          const remainingPath = '/' + segments.slice(1).join('/')

          // Navigate this flow to the target state first
          if (states.includes(targetState) && currentState !== targetState) {
            const prev = currentState
            currentState = targetState
            recordTransition(prev, targetState, actor)
            notifyListeners(targetState, prev, actor)
          }

          // Then delegate to child flow
          const childFlow = childFlows[targetState]
          if (childFlow) {
            childFlow.go(remainingPath, actor)
          }
          return
        }
        // Single segment path: treat as direct state name
        state = segments[0]
      }

      // Direct state navigation — validate against schema
      if (!states.includes(state)) {
        if (process.env.NODE_ENV === 'development') {
          console.error(
            `Flow "${name}": invalid state "${state}". Valid states: [${states.join(', ')}]`
          )
        }
        return
      }

      // Skip if already in this state
      if (currentState === state) return

      const prev = currentState
      currentState = state

      recordTransition(prev, state, actor)
      notifyListeners(state, prev, actor)
    },

    has(state: string) {
      // Handle path-based check: 'Dashboard/Settings'
      if (state.includes('/')) {
        const segments = state.split('/')
        if (currentState !== segments[0]) return false
        const childFlow = childFlows[segments[0]]
        if (childFlow) {
          return childFlow.has(segments.slice(1).join('/'))
        }
        return false
      }

      return currentState === state
    },

    states() {
      return [...states]
    },

    resolve(path: string): Flow | undefined {
      if (path.startsWith('/')) {
        path = path.slice(1)
      }

      const segments = path.split('/')
      const first = segments[0]

      const childFlow = childFlows[first]
      if (!childFlow) return undefined

      if (segments.length === 1) {
        return childFlow
      }

      return childFlow.resolve(segments.slice(1).join('/'))
    },

    activeChain(): string[] {
      const chain: string[] = [`${name}/${currentState}`]

      const childFlow = childFlows[currentState]
      if (childFlow) {
        chain.push(...childFlow.activeChain())
      }

      return chain
    },

    children() {
      return { ...childFlows }
    },

    subscribe(listener: FlowListener): Unsubscribe {
      listeners.push(listener)
      return () => {
        listeners = listeners.filter(l => l !== listener)
      }
    },

    getHistory() {
      return [...history]
    },
  }

  function recordTransition(from: string, to: string, actor: Actor) {
    history = [
      { from, to, actor, timestamp: Date.now() },
      ...history,
    ].slice(0, 1000)
  }

  function notifyListeners(current: string, prev: string, actor: Actor) {
    for (const listener of listeners) {
      listener(current, prev, actor)
    }
  }

  return flow
}
