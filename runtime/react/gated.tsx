// <Gated> — Declarative conditional rendering based on store gate conditions
// Replaces ternary/&& patterns with explicit mount/unmount semantics in JSX.
// Makes component lifecycle visible: an agent can see what gates control what subtrees.

import React from 'react'
import { useGate } from './hooks.js'

export interface GatedProps {
  /** Store name to read the gate from */
  store: string
  /** Gate condition name (must be defined in the store's `gates` option) */
  gate: string
  /** Invert the gate — render children when the gate is false */
  negate?: boolean
  /** Fallback content when the gate is closed */
  fallback?: React.ReactNode
  children: React.ReactNode
}

/**
 * Conditionally render children based on a store's gate condition.
 *
 * ```tsx
 * <Gated store="auth" gate="isAuthenticated" fallback={<LoginPage />}>
 *   <Dashboard />
 * </Gated>
 *
 * <Gated store="posts" gate="hasData">
 *   <PostList />
 * </Gated>
 *
 * <Gated store="auth" gate="isAuthenticated" negate>
 *   <LoginPage />
 * </Gated>
 * ```
 */
export function Gated({ store, gate, negate, fallback = null, children }: GatedProps) {
  const isOpen = useGate(store, gate) as boolean
  const shouldRender = negate ? !isOpen : isOpen
  return <>{shouldRender ? children : fallback}</>
}
