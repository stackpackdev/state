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
    // Internal state
    const recordMap = new Map();
    const timers = new Map();
    let listeners = [];
    // Stable ordering: keys in insertion order, leaving items stay in their original position
    let keyOrder = [];
    function now() {
        return Date.now();
    }
    function getOrderedRecords() {
        const result = [];
        for (const key of keyOrder) {
            const record = recordMap.get(key);
            if (record)
                result.push(record);
        }
        return result;
    }
    function notify() {
        const snapshot = getOrderedRecords();
        for (const listener of listeners) {
            listener(snapshot);
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
    function removeRecord(key) {
        cancelTimer(key);
        recordMap.delete(key);
        keyOrder = keyOrder.filter(k => k !== key);
        onRemoved?.(key);
        notify();
    }
    function sync(next, keyFn) {
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
        // 2. Handle new items
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
        if (changed)
            notify();
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
            notify();
        }
    }
    function done(key) {
        const record = recordMap.get(key);
        if (record && record.phase === 'leaving') {
            removeRecord(key);
        }
    }
    function flush() {
        const leavingKeys = [];
        for (const [key, record] of recordMap) {
            if (record.phase === 'leaving') {
                leavingKeys.push(key);
            }
        }
        for (const key of leavingKeys) {
            removeRecord(key);
        }
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
        listeners = [];
    }
    return {
        sync,
        syncBoolean,
        entered,
        done,
        flush,
        records,
        subscribe,
        destroy,
    };
}
//# sourceMappingURL=presence.js.map