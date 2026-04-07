// Presence Tracker — framework-agnostic deferred unmounting
//
// The third edge type alongside When (style-edge) and Gate (mount-edge):
//   - When: appearance changes, element stays mounted
//   - Gate: element mounts/unmounts immediately
//   - Presence: element mounts immediately, unmounts only after leave completes
//
// This solves React's fundamental animation problem (react#161, open since 2013):
// React has no concept of "this node should be removed, but not yet."
// The presence tracker maintains lifecycle phases (entering → present → leaving)
// as explicit, observable state that any subscriber can read.
//
// Key design decisions:
//   1. Presence lives in the state layer, not the component tree.
//      AnimatePresence tracks presence via React keys + ref counting (fragile).
//      PresenceTracker tracks it via a keyed record map (observable, race-free).
//   2. Values are frozen at leave time — leaving items show consistent data.
//   3. Re-adding a leaving item cancels the leave and flips back to entering.
//      This solves rapid-toggle race conditions structurally.
// ─── Implementation ─────────────────────────────────────────
const BOOLEAN_KEY = '__presence__';
export function createPresenceTracker(options = {}) {
    const timeout = options.timeout ?? 0;
    const onRemoved = options.onRemoved;
    const coalesce = options.coalesce ?? false;
    // Internal state
    const recordMap = new Map();
    const timers = new Map();
    let listeners = [];
    // Stable ordering: keys in insertion order, leaving items stay in their original position
    let keyOrder = [];
    // Lazy keyOrder rebuild (3.2) — defer filter() until read
    const deletedKeys = new Set();
    let keyOrderDirty = false;
    // Cached snapshot with dirty flag (1.1c)
    let cachedSnapshot = null;
    let snapshotDirty = true;
    // Reference equality cache for sync (1.1b)
    let lastNextRef = null;
    // Generation counter (2.5)
    let _generation = 0;
    // Microtask coalescing (3.1)
    let pendingFlush = false;
    function now() {
        return Date.now();
    }
    function invalidateSnapshot() {
        snapshotDirty = true;
        _generation++;
    }
    function rebuildKeyOrderIfDirty() {
        if (keyOrderDirty) {
            keyOrder = keyOrder.filter(k => !deletedKeys.has(k));
            deletedKeys.clear();
            keyOrderDirty = false;
        }
    }
    function getOrderedRecords() {
        rebuildKeyOrderIfDirty();
        if (!snapshotDirty && cachedSnapshot)
            return cachedSnapshot;
        const result = [];
        for (const key of keyOrder) {
            const record = recordMap.get(key);
            if (record)
                result.push(record);
        }
        cachedSnapshot = result;
        snapshotDirty = false;
        return result;
    }
    // Core notify — always synchronous, called by scheduleNotify or directly
    function notifyNow() {
        if (listeners.length === 0)
            return;
        const snapshot = getOrderedRecords();
        for (const listener of listeners) {
            listener(snapshot);
        }
    }
    // Lazy notify (1.1a) with optional microtask coalescing (3.1)
    function notify() {
        if (listeners.length === 0)
            return;
        if (coalesce) {
            if (!pendingFlush) {
                pendingFlush = true;
                queueMicrotask(() => {
                    pendingFlush = false;
                    notifyNow();
                });
            }
        }
        else {
            notifyNow();
        }
    }
    function cancelTimer(key) {
        const timer = timers.get(key);
        if (timer !== undefined) {
            clearTimeout(timer);
            timers.delete(key);
        }
    }
    function startLeaveTimer(key) {
        if (timeout <= 0)
            return;
        cancelTimer(key);
        timers.set(key, setTimeout(() => {
            timers.delete(key);
            removeRecord(key);
        }, timeout));
    }
    // Lazy keyOrder rebuild (3.2) — mark key as deleted, defer filter
    function removeRecord(key) {
        cancelTimer(key);
        recordMap.delete(key);
        deletedKeys.add(key);
        keyOrderDirty = true;
        invalidateSnapshot();
        onRemoved?.(key);
        notify();
    }
    function sync(next, keyFn) {
        // Reference equality check (1.1b) — if same array ref, skip diffing
        if (next === lastNextRef)
            return getOrderedRecords();
        lastNextRef = next;
        const nextKeys = new Set();
        const nextByKey = new Map();
        for (const item of next) {
            const key = keyFn(item);
            nextKeys.add(key);
            nextByKey.set(key, item);
        }
        let changed = false;
        // 1. Handle existing records
        for (const [key, record] of recordMap) {
            if (nextKeys.has(key)) {
                // Item still present in next
                if (record.phase === 'leaving') {
                    // Was leaving, re-added → cancel leave, back to entering
                    cancelTimer(key);
                    const newValue = nextByKey.get(key);
                    recordMap.set(key, {
                        key,
                        value: newValue,
                        phase: 'entering',
                        at: now(),
                    });
                    changed = true;
                }
                else {
                    // Still present → update value, keep phase
                    const newValue = nextByKey.get(key);
                    if (newValue !== record.value) {
                        recordMap.set(key, { ...record, value: newValue });
                        changed = true;
                    }
                }
            }
            else {
                // Item removed from next
                if (record.phase !== 'leaving') {
                    // Transition to leaving, freeze value
                    recordMap.set(key, {
                        key,
                        value: record.value,
                        phase: 'leaving',
                        at: now(),
                    });
                    startLeaveTimer(key);
                    changed = true;
                }
                // If already leaving, do nothing (timer is running or manual done() expected)
            }
        }
        // 2. Handle new items — must rebuild keyOrder first if dirty
        rebuildKeyOrderIfDirty();
        for (const item of next) {
            const key = keyFn(item);
            if (!recordMap.has(key)) {
                recordMap.set(key, {
                    key,
                    value: item,
                    phase: 'entering',
                    at: now(),
                });
                keyOrder.push(key);
                changed = true;
            }
        }
        if (changed) {
            invalidateSnapshot();
            notify();
        }
        return getOrderedRecords();
    }
    function syncBoolean(active) {
        // Cast through any since T might not be boolean in the generic,
        // but syncBoolean always works with boolean values
        return sync(active ? [true] : [], () => BOOLEAN_KEY);
    }
    function entered(key) {
        const record = recordMap.get(key);
        if (record && record.phase === 'entering') {
            recordMap.set(key, { ...record, phase: 'present', at: now() });
            invalidateSnapshot();
            notify();
        }
    }
    // Batch entered (2.4) — single notify for multiple transitions
    function enteredBatch(keys) {
        let changed = false;
        const t = now();
        for (const key of keys) {
            const record = recordMap.get(key);
            if (record && record.phase === 'entering') {
                recordMap.set(key, { ...record, phase: 'present', at: t });
                changed = true;
            }
        }
        if (changed) {
            invalidateSnapshot();
            notify();
        }
    }
    function done(key) {
        const record = recordMap.get(key);
        if (record && record.phase === 'leaving') {
            removeRecord(key);
        }
    }
    // Batch done (2.4) — single notify for multiple removals
    function doneBatch(keys) {
        const toRemove = [];
        for (const key of keys) {
            const record = recordMap.get(key);
            if (record && record.phase === 'leaving') {
                toRemove.push(key);
            }
        }
        if (toRemove.length === 0)
            return;
        for (const key of toRemove) {
            cancelTimer(key);
            recordMap.delete(key);
            deletedKeys.add(key);
            onRemoved?.(key);
        }
        keyOrderDirty = true;
        invalidateSnapshot();
        notify(); // single notification
    }
    // Batch flush (1.1d) — single-pass set-based removal, single notify
    function flush() {
        const leavingKeys = [];
        for (const [key, record] of recordMap) {
            if (record.phase === 'leaving')
                leavingKeys.push(key);
        }
        if (leavingKeys.length === 0)
            return;
        for (const key of leavingKeys) {
            cancelTimer(key);
            recordMap.delete(key);
            deletedKeys.add(key);
            onRemoved?.(key);
        }
        keyOrderDirty = true;
        invalidateSnapshot();
        notify(); // single notification
    }
    function records() {
        return getOrderedRecords();
    }
    function subscribe(listener) {
        listeners.push(listener);
        return () => {
            listeners = listeners.filter(l => l !== listener);
        };
    }
    function destroy() {
        for (const timer of timers.values()) {
            clearTimeout(timer);
        }
        timers.clear();
        recordMap.clear();
        keyOrder = [];
        deletedKeys.clear();
        keyOrderDirty = false;
        listeners = [];
        cachedSnapshot = null;
        snapshotDirty = true;
        lastNextRef = null;
        pendingFlush = false;
    }
    return {
        sync,
        syncBoolean,
        entered,
        enteredBatch,
        done,
        doneBatch,
        flush,
        records,
        subscribe,
        get generation() {
            return _generation;
        },
        destroy,
    };
}
//# sourceMappingURL=presence.js.map