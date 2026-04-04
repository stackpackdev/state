import { jsx as _jsx } from "react/jsx-runtime";
// StoreProvider — renders a store into React context
// Extracted from Data.js DataProvider (lines 75-234) + Flow.js ViewsFlow (lines 260-276)
// Simplified: wraps a store in context so hooks can access it
import React from 'react';
import { createStore } from '../core/store.js';
import { getStoreContext } from './context.js';
/**
 * Provide a store to the React component tree.
 * Multiple StoreProviders can be nested for different stores (named context pattern).
 */
export function StoreProvider({ store: storeOrOptions, children }) {
    // Accept either a store or options to create one
    const storeRef = React.useRef(null);
    if (storeRef.current === null) {
        storeRef.current = 'getState' in storeOrOptions
            ? storeOrOptions
            : createStore(storeOrOptions);
    }
    const store = storeRef.current;
    const Context = getStoreContext(store.name);
    // Cleanup on unmount
    React.useEffect(() => {
        return () => {
            // Don't destroy the store on unmount — it may be used elsewhere
            // Store lifecycle is managed explicitly by the developer or agent
        };
    }, []);
    return (_jsx(Context.Provider, { value: store, children: children }));
}
export function MultiStoreProvider({ stores, children }) {
    return stores.reduceRight((acc, store) => _jsx(StoreProvider, { store: store, children: acc }), children);
}
//# sourceMappingURL=provider.js.map