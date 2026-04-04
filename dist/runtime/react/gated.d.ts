import React from 'react';
export interface GatedProps {
    /** Store name to read the gate from */
    store: string;
    /** Gate condition name (must be defined in the store's `gates` option) */
    gate: string;
    /** Invert the gate — render children when the gate is false */
    negate?: boolean;
    /** Fallback content when the gate is closed */
    fallback?: React.ReactNode;
    children: React.ReactNode;
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
export declare function Gated({ store, gate, negate, fallback, children }: GatedProps): import("react/jsx-runtime").JSX.Element;
//# sourceMappingURL=gated.d.ts.map