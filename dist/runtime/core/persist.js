// Persistence layer for state-agent stores
// Provides middleware-based state persistence with debounced writes,
// schema validation on hydration, and versioned migrations.
import { getPath } from './path.js';
// ─── In-memory storage adapter ──────────────────────────────
/** In-memory storage adapter for testing and Node.js environments */
export function createMemoryStorage() {
    const map = new Map();
    return {
        getItem(key) {
            return map.get(key) ?? null;
        },
        setItem(key, value) {
            map.set(key, value);
        },
        removeItem(key) {
            map.delete(key);
        },
    };
}
// ─── Persist middleware + hydration ─────────────────────────
/** Create persist middleware + hydration function */
export function createPersistMiddleware(options, schema) {
    const { key, storage = createMemoryStorage(), paths, version = 1, migrate, debounceMs = 100, } = options;
    let debounceTimer = null;
    function writeTo(state) {
        let envelope;
        if (paths && paths.length > 0) {
            const data = {};
            for (const p of paths) {
                data[p] = getPath(state, p);
            }
            envelope = { __version: version, __paths: true, data };
        }
        else {
            envelope = { __version: version, data: state };
        }
        storage.setItem(key, JSON.stringify(envelope));
    }
    function scheduleWrite(state) {
        if (debounceTimer !== null) {
            clearTimeout(debounceTimer);
        }
        debounceTimer = setTimeout(() => {
            debounceTimer = null;
            writeTo(state);
        }, debounceMs);
    }
    function hydrate() {
        const raw = storage.getItem(key);
        if (raw === null)
            return undefined;
        let parsed;
        try {
            parsed = JSON.parse(raw);
        }
        catch {
            return undefined;
        }
        // Handle version migration
        const storedVersion = parsed.__version ?? 0;
        let data = parsed.data;
        if (storedVersion !== version && migrate) {
            data = migrate(data, storedVersion);
        }
        // Validate against schema if provided
        if (schema) {
            const result = schema.safeParse(data);
            if (!result.success) {
                return undefined;
            }
            return result.data;
        }
        return data;
    }
    const middleware = {
        name: `persist:${key}`,
        leave(_action, _prevState, nextState) {
            scheduleWrite(nextState);
        },
    };
    return { middleware, hydrate };
}
//# sourceMappingURL=persist.js.map