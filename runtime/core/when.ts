// Declarative conditional state — "When" and "Gate" primitives
//
// Two types of conditions, distinguished by their graph-edge semantics:
//
// WHEN (style-edge): Condition changes appearance but element stays mounted.
//   - Changing a `when` = re-render with new styles/classes
//   - No lifecycle effects, no cascade, cheap
//   - Example: isHovered, isActive, isSelected
//
// GATE (mount-edge): Condition controls whether a component subtree exists.
//   - Changing a `gate` = mount/unmount cascade
//   - Triggers lifecycle hooks, may cause data fetching, expensive
//   - Example: isAuthenticated, hasData, isLoaded
//
// This distinction matters for agents: they need to know before mutating state
// whether the result will be a cheap re-render or an expensive mount cascade.

export type WhenConditions<T = any> = Record<string, (state: T) => boolean>
export type GateConditions<T = any> = Record<string, (state: T) => boolean>

export interface WhenEvaluator<T = any> {
  /** Evaluate all when conditions against current state */
  evaluate(state: T): Record<string, boolean>
  /** Evaluate a single when condition */
  check(name: string, state: T): boolean
  /** Add a new when condition */
  add(name: string, predicate: (state: T) => boolean): void
  /** Remove a when condition */
  remove(name: string): void
  /** List all condition names */
  names(): string[]
}

export interface GateEvaluator<T = any> {
  /** Evaluate all gate conditions against current state */
  evaluate(state: T): Record<string, boolean>
  /** Evaluate a single gate condition */
  check(name: string, state: T): boolean
  /** Add a new gate condition */
  add(name: string, predicate: (state: T) => boolean): void
  /** Remove a gate condition */
  remove(name: string): void
  /** List all gate names */
  names(): string[]
}

function createEvaluator<T>(
  conditions: Record<string, (state: T) => boolean> = {}
) {
  const conditionMap = new Map(Object.entries(conditions))

  // Memoization: cache result when state reference hasn't changed
  // Immer guarantees new references on mutation, so === is sufficient
  let cachedState: unknown = undefined
  let cachedResult: Record<string, boolean> = {}

  return {
    evaluate(state: T) {
      if (state === cachedState) return cachedResult
      cachedState = state
      const result: Record<string, boolean> = {}
      for (const [name, predicate] of conditionMap) {
        try {
          result[name] = predicate(state)
        } catch {
          result[name] = false
        }
      }
      cachedResult = result
      return cachedResult
    },

    check(name: string, state: T) {
      const predicate = conditionMap.get(name)
      if (!predicate) return false
      try {
        return predicate(state)
      } catch {
        return false
      }
    },

    add(name: string, predicate: (state: T) => boolean) {
      conditionMap.set(name, predicate)
      // Invalidate cache when conditions change
      cachedState = undefined
    },

    remove(name: string) {
      conditionMap.delete(name)
      // Invalidate cache when conditions change
      cachedState = undefined
    },

    names() {
      return Array.from(conditionMap.keys())
    },
  }
}

export function createWhenEvaluator<T>(
  conditions: WhenConditions<T> = {}
): WhenEvaluator<T> {
  return createEvaluator(conditions)
}

export function createGateEvaluator<T>(
  conditions: GateConditions<T> = {}
): GateEvaluator<T> {
  return createEvaluator(conditions)
}
