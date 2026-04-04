// useFetch — React hook for declarative data fetching with store binding
// Wraps createFetcher with automatic lifecycle management.
import { useCallback, useEffect, useRef, useSyncExternalStore } from 'react';
import { createFetcher } from '../core/fetch.js';
// Global fetcher registry — deduplicates across components
const fetcherRegistry = new Map();
export function useFetch(options) {
    const { key, auto = true, ...fetcherOptions } = options;
    // Get or create fetcher — stable across re-renders
    const fetcherRef = useRef(null);
    if (!fetcherRef.current) {
        const existing = fetcherRegistry.get(key);
        if (existing) {
            fetcherRef.current = existing;
        }
        else {
            const fetcher = createFetcher({ name: key, ...fetcherOptions });
            fetcherRegistry.set(key, fetcher);
            fetcherRef.current = fetcher;
        }
    }
    const fetcher = fetcherRef.current;
    // Track state changes for re-rendering
    const stateRef = useRef(fetcher.getState());
    const listenersRef = useRef(new Set());
    const subscribe = useCallback((onStoreChange) => {
        listenersRef.current.add(onStoreChange);
        return () => { listenersRef.current.delete(onStoreChange); };
    }, []);
    const getSnapshot = useCallback(() => {
        const next = fetcher.getState();
        if (next !== stateRef.current) {
            stateRef.current = next;
        }
        return stateRef.current;
    }, [fetcher]);
    const state = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
    // Notify subscribers after fetch completes
    const notifyChange = useCallback(() => {
        for (const listener of listenersRef.current) {
            listener();
        }
    }, []);
    const doFetch = useCallback(async () => {
        try {
            const data = await fetcher.fetch();
            notifyChange();
            return data;
        }
        catch {
            notifyChange();
            return undefined;
        }
    }, [fetcher, notifyChange]);
    const doRefetch = useCallback(async () => {
        try {
            const data = await fetcher.refetch();
            notifyChange();
            return data;
        }
        catch {
            notifyChange();
            return undefined;
        }
    }, [fetcher, notifyChange]);
    const doInvalidate = useCallback(() => {
        fetcher.invalidate();
        notifyChange();
    }, [fetcher, notifyChange]);
    // Auto-fetch on mount
    useEffect(() => {
        if (auto) {
            doFetch();
        }
    }, [auto, doFetch]);
    // Cleanup fetcher from registry on unmount (if no other consumers)
    useEffect(() => {
        return () => {
            // Only remove if this was the last consumer
            if (listenersRef.current.size === 0) {
                fetcherRegistry.delete(key);
            }
        };
    }, [key]);
    return {
        data: state.data,
        error: state.error,
        isLoading: state.status === 'loading',
        isStale: state.isStale,
        status: state.status,
        fetch: doFetch,
        refetch: doRefetch,
        invalidate: doInvalidate,
    };
}
/** Clear all cached fetchers — useful in tests */
export function clearFetcherRegistry() {
    fetcherRegistry.clear();
}
//# sourceMappingURL=use-fetch.js.map