import React from 'react';
import type { Store } from '../core/types.js';
type StoreContextValue<T = any> = Store<T> | null;
/**
 * Get or create a React context for a store by name.
 * From DataContexts pattern: contexts are lazily created and cached.
 */
export declare function getStoreContext(name: string): React.Context<StoreContextValue>;
/**
 * Remove a context (cleanup).
 */
export declare function removeStoreContext(name: string): void;
export {};
//# sourceMappingURL=context.d.ts.map