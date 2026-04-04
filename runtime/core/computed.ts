// Computed/derived values for stores
// Memoized using state reference equality (same as when/gate evaluators)

export type ComputedDefinitions<T = any> = Record<string, (state: T) => unknown>

export interface ComputedEvaluator<T = any> {
  /** Get a computed value by name */
  get<V = unknown>(name: string, state: T): V
  /** Get all computed values */
  getAll(state: T): Record<string, unknown>
  /** List all computed value names */
  names(): string[]
}

export function createComputedEvaluator<T>(
  definitions: ComputedDefinitions<T> = {}
): ComputedEvaluator<T> {
  const defMap = new Map(Object.entries(definitions))

  // Per-key memoization: each computed value caches independently
  const cache = new Map<string, { state: unknown; value: unknown }>()

  return {
    get<V = unknown>(name: string, state: T): V {
      const fn = defMap.get(name)
      if (!fn) return undefined as V

      const cached = cache.get(name)
      if (cached && cached.state === state) return cached.value as V

      const value = fn(state)
      cache.set(name, { state, value })
      return value as V
    },

    getAll(state: T): Record<string, unknown> {
      const result: Record<string, unknown> = {}
      for (const name of defMap.keys()) {
        result[name] = this.get(name, state)
      }
      return result
    },

    names() {
      return Array.from(defMap.keys())
    },
  }
}
