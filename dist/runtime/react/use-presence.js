// React hooks for presence-based animated lifecycle
//
// usePresence  — single boolean gate → deferred unmounting
// usePresenceList — array of items → enter/leave per item
//
// These hooks bridge the core PresenceTracker (framework-agnostic)
// with React's subscription model (useSyncExternalStore).
import { useCallback, useEffect, useRef, useSyncExternalStore } from 'react';
import { createPresenceTracker } from '../core/presence.js';
import { getPath } from '../core/path.js';
import { getStore } from '../core/store.js';
const BOOLEAN_KEY = '__presence__';
export function usePresence(storeName, gateName, options = {}) {
    const timeout = options.timeout ?? 300;
    // Stable tracker ref — survives re-renders, destroyed on unmount
    const trackerRef = useRef(null);
    if (!trackerRef.current) {
        trackerRef.current = createPresenceTracker({ timeout });
    }
    const tracker = trackerRef.current;
    // Clean up on unmount
    useEffect(() => {
        return () => {
            trackerRef.current?.destroy();
            trackerRef.current = null;
        };
    }, []);
    // Subscribe to the store's gate and sync presence
    const store = getStore(storeName);
    if (!store) {
        throw new Error(`[state-agent] usePresence: Store "${storeName}" not found.`);
    }
    // Snapshot: read gate → sync tracker → return records
    const getSnapshot = useCallback(() => {
        const gateOpen = store.isGated(gateName);
        tracker.syncBoolean(gateOpen);
        return tracker.records();
    }, [store, gateName, tracker]);
    // Subscribe to both the store AND the tracker
    const subscribe = useCallback((onStoreChange) => {
        const unsubStore = store.subscribe(() => onStoreChange());
        const unsubTracker = tracker.subscribe(() => onStoreChange());
        return () => {
            unsubStore();
            unsubTracker();
        };
    }, [store, tracker]);
    const records = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
    const record = records.length > 0 ? records[0] : null;
    // Stable callbacks
    const done = useCallback(() => {
        tracker.done(BOOLEAN_KEY);
    }, [tracker]);
    const entered = useCallback(() => {
        tracker.entered(BOOLEAN_KEY);
    }, [tracker]);
    // Ref callback for automatic transitionend detection
    const elementRef = useRef(null);
    const phaseRef = useRef(null);
    phaseRef.current = record?.phase ?? null;
    const ref = useCallback((el) => {
        // Clean up previous listener
        if (elementRef.current) {
            elementRef.current.removeEventListener('transitionend', handleTransitionEnd);
        }
        elementRef.current = el;
        if (el) {
            el.addEventListener('transitionend', handleTransitionEnd);
        }
    }, 
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []);
    function handleTransitionEnd(e) {
        // Only trigger for the element itself, not bubbled events from children
        if (e.target !== elementRef.current)
            return;
        if (phaseRef.current === 'leaving') {
            tracker.done(BOOLEAN_KEY);
        }
    }
    return {
        isPresent: record !== null,
        phase: record?.phase ?? null,
        done,
        entered,
        ref,
    };
}
const defaultKeyFn = (item) => String(item.id);
export function usePresenceList(storeName, path, options = {}) {
    const timeout = options.timeout ?? 300;
    const keyFn = options.keyFn ?? defaultKeyFn;
    // Stable tracker ref
    const trackerRef = useRef(null);
    if (!trackerRef.current) {
        trackerRef.current = createPresenceTracker({ timeout });
    }
    const tracker = trackerRef.current;
    // Clean up on unmount
    useEffect(() => {
        return () => {
            trackerRef.current?.destroy();
            trackerRef.current = null;
        };
    }, []);
    const store = getStore(storeName);
    if (!store) {
        throw new Error(`[state-agent] usePresenceList: Store "${storeName}" not found.`);
    }
    // Snapshot: read array at path → sync tracker → return records
    const getSnapshot = useCallback(() => {
        const array = getPath(store.getState(), path);
        tracker.sync(array ?? [], keyFn);
        return tracker.records();
    }, [store, path, keyFn, tracker]);
    const subscribe = useCallback((onStoreChange) => {
        const unsubStore = store.subscribe(() => onStoreChange(), path);
        const unsubTracker = tracker.subscribe(() => onStoreChange());
        return () => {
            unsubStore();
            unsubTracker();
        };
    }, [store, path, tracker]);
    const items = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
    const done = useCallback((key) => tracker.done(key), [tracker]);
    const entered = useCallback((key) => tracker.entered(key), [tracker]);
    const flush = useCallback(() => tracker.flush(), [tracker]);
    return { items, done, entered, flush };
}
//# sourceMappingURL=use-presence.js.map