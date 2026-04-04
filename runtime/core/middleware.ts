// Enter/leave middleware pipeline
// Extracted from walk.js visitor pattern: enter can short-circuit, leave for post-processing

import type { Action, Middleware } from './types.js'

export interface MiddlewarePipeline {
  add(middleware: Middleware): void
  remove(name: string): void
  run(
    action: Action,
    currentState: unknown,
    apply: (processedAction: Action) => unknown
  ): { nextState: unknown; cancelled: boolean; action: Action }
}

export function createMiddlewarePipeline(
  initial: Middleware[] = []
): MiddlewarePipeline {
  let middlewares: Middleware[] = [...initial]

  return {
    add(middleware: Middleware) {
      middlewares.push(middleware)
    },

    remove(name: string) {
      middlewares = middlewares.filter(m => m.name !== name)
    },

    run(action, currentState, apply) {
      // Enter phase: each middleware can transform or cancel the action
      // From walk.js: enter.some(fn => fn(node, state)) — returning truthy skips
      let processedAction = action
      for (const mw of middlewares) {
        if (mw.enter) {
          const result = mw.enter(processedAction, currentState)
          if (result === null) {
            return { nextState: currentState, cancelled: true, action: processedAction }
          }
          processedAction = result
        }
      }

      // Apply the action (reducer)
      const nextState = apply(processedAction)

      // Leave phase: notification after state change
      // From walk.js: leave functions run after children are processed
      for (const mw of middlewares) {
        if (mw.leave) {
          mw.leave(processedAction, currentState, nextState)
        }
      }

      return { nextState, cancelled: false, action: processedAction }
    },
  }
}
