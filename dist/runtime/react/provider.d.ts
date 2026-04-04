import React from 'react';
import type { Store, StoreOptions } from '../core/types.js';
export interface StoreProviderProps {
    /** An existing store instance, or options to create one */
    store: Store | StoreOptions;
    children: React.ReactNode;
}
/**
 * Provide a store to the React component tree.
 * Multiple StoreProviders can be nested for different stores (named context pattern).
 */
export declare function StoreProvider({ store: storeOrOptions, children }: StoreProviderProps): import("react/jsx-runtime").JSX.Element;
/**
 * Provide multiple stores at once.
 * Convenience for wrapping multiple providers.
 */
export interface MultiStoreProviderProps {
    stores: Array<Store | StoreOptions>;
    children: React.ReactNode;
}
export declare function MultiStoreProvider({ stores, children }: MultiStoreProviderProps): React.ReactElement;
//# sourceMappingURL=provider.d.ts.map