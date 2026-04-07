import { bench, describe } from 'vitest';
import { createPresenceTracker } from '../presence.js';
// ─── Helpers ──────────────────────────────────────────────
function makeItems(n) {
    return Array.from({ length: n }, (_, i) => ({ id: String(i), label: `item-${i}` }));
}
const keyFn = (item) => item.id;
// ─── Presence Tracker Benchmarks ──────────────────────────
describe('Presence Tracker — sync()', () => {
    bench('sync 10 items (initial add)', () => {
        const tracker = createPresenceTracker({ timeout: 300 });
        tracker.sync(makeItems(10), keyFn);
        tracker.destroy();
    });
    bench('sync 100 items (initial add)', () => {
        const tracker = createPresenceTracker({ timeout: 300 });
        tracker.sync(makeItems(100), keyFn);
        tracker.destroy();
    });
    bench('sync 1000 items (initial add)', () => {
        const tracker = createPresenceTracker({ timeout: 300 });
        tracker.sync(makeItems(1000), keyFn);
        tracker.destroy();
    });
    bench('sync remove half (50 of 100 → leaving)', () => {
        const tracker = createPresenceTracker({ timeout: 0 }); // no timers
        const all = makeItems(100);
        tracker.sync(all, keyFn);
        const half = all.filter((_, i) => i % 2 === 0);
        tracker.sync(half, keyFn);
        tracker.destroy();
    });
    bench('sync stable (100 items, no changes)', () => {
        const tracker = createPresenceTracker({ timeout: 300 });
        const items = makeItems(100);
        tracker.sync(items, keyFn);
        // second sync with same items (new refs though)
        tracker.sync(makeItems(100), keyFn);
        tracker.destroy();
    });
});
describe('Presence Tracker — rapid toggle', () => {
    bench('boolean toggle 10 cycles (open/close modal)', () => {
        const tracker = createPresenceTracker({ timeout: 0 });
        for (let i = 0; i < 10; i++) {
            tracker.syncBoolean(true);
            tracker.syncBoolean(false);
        }
        tracker.destroy();
    });
    bench('re-add during leave (race condition path)', () => {
        const tracker = createPresenceTracker({ timeout: 0 });
        const items = makeItems(10);
        tracker.sync(items, keyFn);
        tracker.sync([], keyFn); // all leaving
        tracker.sync(items, keyFn); // all re-added → cancel leave
        tracker.destroy();
    });
});
describe('Presence Tracker — lifecycle signals', () => {
    bench('entered() 100 items', () => {
        const tracker = createPresenceTracker();
        const items = makeItems(100);
        tracker.sync(items, keyFn);
        for (const item of items)
            tracker.entered(item.id);
        tracker.destroy();
    });
    bench('done() 100 leaving items', () => {
        const tracker = createPresenceTracker({ timeout: 0 });
        const items = makeItems(100);
        tracker.sync(items, keyFn);
        tracker.sync([], keyFn); // all leaving
        for (const item of items)
            tracker.done(item.id);
        tracker.destroy();
    });
    bench('flush() 100 leaving items', () => {
        const tracker = createPresenceTracker({ timeout: 0 });
        tracker.sync(makeItems(100), keyFn);
        tracker.sync([], keyFn); // all leaving
        tracker.flush();
        tracker.destroy();
    });
});
describe('Presence Tracker — subscriptions', () => {
    bench('sync with 10 subscribers', () => {
        const tracker = createPresenceTracker();
        for (let i = 0; i < 10; i++)
            tracker.subscribe(() => { });
        tracker.sync(makeItems(10), keyFn);
        tracker.destroy();
    });
    bench('sync with 100 subscribers', () => {
        const tracker = createPresenceTracker();
        for (let i = 0; i < 100; i++)
            tracker.subscribe(() => { });
        tracker.sync(makeItems(10), keyFn);
        tracker.destroy();
    });
});
describe('Presence Tracker — sustained workload', () => {
    bench('churn: add 5, remove 5, repeat (list animation)', () => {
        const tracker = createPresenceTracker({ timeout: 0 });
        // start with 20 items
        let items = makeItems(20);
        tracker.sync(items, keyFn);
        // remove first 5, add 5 new
        items = [
            ...items.slice(5),
            ...Array.from({ length: 5 }, (_, i) => ({ id: `new-${i}`, label: `new-${i}` })),
        ];
        tracker.sync(items, keyFn);
        // flush leaving items
        tracker.flush();
        tracker.destroy();
    });
});
//# sourceMappingURL=presence.bench.js.map