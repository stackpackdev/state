// Named React context registry
// Extracted from Data.js DataContexts = {} (line 74) — lazy context creation by name

import React from 'react'
import type { Store } from '../core/types.js'

type StoreContextValue<T = any> = Store<T> | null

const contexts: Map<string, React.Context<StoreContextValue>> = new Map()

/**
 * Get or create a React context for a store by name.
 * From DataContexts pattern: contexts are lazily created and cached.
 */
export function getStoreContext(
  name: string
): React.Context<StoreContextValue> {
  if (!contexts.has(name)) {
    const ctx = React.createContext<StoreContextValue>(null)
    ctx.displayName = `StateAgent(${name})`
    contexts.set(name, ctx)
  }
  return contexts.get(name)!
}

/**
 * Remove a context (cleanup).
 */
export function removeStoreContext(name: string): void {
  contexts.delete(name)
}
