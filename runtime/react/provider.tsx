// StoreProvider — renders a store into React context
// Extracted from Data.js DataProvider (lines 75-234) + Flow.js ViewsFlow (lines 260-276)
// Simplified: wraps a store in context so hooks can access it

import React from 'react'
import type { Store, StoreOptions } from '../core/types.js'
import { createStore } from '../core/store.js'
import { getStoreContext } from './context.js'

export interface StoreProviderProps {
  /** An existing store instance, or options to create one */
  store: Store | StoreOptions
  children: React.ReactNode
}

/**
 * Provide a store to the React component tree.
 * Multiple StoreProviders can be nested for different stores (named context pattern).
 */
export function StoreProvider({ store: storeOrOptions, children }: StoreProviderProps) {
  // Accept either a store or options to create one
  const storeRef = React.useRef<Store | null>(null)

  if (storeRef.current === null) {
    storeRef.current = 'getState' in storeOrOptions
      ? storeOrOptions as Store
      : createStore(storeOrOptions as StoreOptions)
  }

  const store = storeRef.current
  const Context = getStoreContext(store.name)

  // Cleanup on unmount
  React.useEffect(() => {
    return () => {
      // Don't destroy the store on unmount — it may be used elsewhere
      // Store lifecycle is managed explicitly by the developer or agent
    }
  }, [])

  return (
    <Context.Provider value={store}>
      {children}
    </Context.Provider>
  )
}

/**
 * Provide multiple stores at once.
 * Convenience for wrapping multiple providers.
 */
export interface MultiStoreProviderProps {
  stores: Array<Store | StoreOptions>
  children: React.ReactNode
}

export function MultiStoreProvider({ stores, children }: MultiStoreProviderProps) {
  return stores.reduceRight<React.ReactNode>(
    (acc, store) => <StoreProvider store={store}>{acc}</StoreProvider>,
    children
  ) as React.ReactElement
}
