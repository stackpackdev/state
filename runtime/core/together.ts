// Group related stores — "Together" primitive
// Extracted from DataProvider wrapping sections with shared context (Data.js lines 75-234)
// and DesignTokens.js using DataProvider to group themed state

import type { Flow, Store, Together, TogetherOptions } from './types.js'

/**
 * Group related stores together so they can be managed as a unit.
 * From DataProvider pattern: related state (form fields, checkout steps)
 * is wrapped in a single provider and moves as a unit.
 */
export function together(options: TogetherOptions): Together {
  const { name, stores, flow } = options

  return {
    get name() {
      return name
    },

    get stores() {
      return stores
    },

    get flow() {
      return flow
    },

    store<T = any>(key: string): Store<T> {
      const s = stores[key]
      if (!s) {
        throw new Error(
          `Together "${name}": store "${key}" not found. Available: [${Object.keys(stores).join(', ')}]`
        )
      }
      return s as Store<T>
    },

    destroy() {
      for (const store of Object.values(stores)) {
        store.destroy()
      }
    },
  }
}
