import { Fragment as _Fragment, jsx as _jsx } from "react/jsx-runtime";
import { useGate } from './hooks.js';
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
export function Gated({ store, gate, negate, fallback = null, children }) {
    const isOpen = useGate(store, gate);
    const shouldRender = negate ? !isOpen : isOpen;
    return _jsx(_Fragment, { children: shouldRender ? children : fallback });
}
//# sourceMappingURL=gated.js.map