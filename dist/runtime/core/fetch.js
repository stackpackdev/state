// Declarative data fetching — define what data a store needs, not how to fetch it.
// Built-in loading, error, cache states with Zod response validation.
//
// The agent declares data sources at store level. The runtime handles:
//   - Loading/error/stale state transitions
//   - Zod validation of fetched data
//   - Cache with TTL
//   - Refetch on demand
//   - Automatic state updates via a system actor
import { createSystemActor } from './actor.js';
// ─── Initial State ──────────────────────────────────────────
export function createInitialFetchState() {
    return {
        data: null,
        error: null,
        status: 'idle',
        fetchedAt: null,
        isStale: false,
    };
}
// ─── Create Fetcher ─────────────────────────────────────────
export function createFetcher(options) {
    const { name, fn, schema, cacheTtl = 0, actor: customActor, } = options;
    const actor = customActor ?? createSystemActor(`fetcher:${name}`);
    let state = createInitialFetchState();
    let fetchPromise = null;
    function isCacheValid() {
        if (cacheTtl <= 0 || state.fetchedAt === null)
            return false;
        return Date.now() - state.fetchedAt < cacheTtl;
    }
    function updateStale() {
        if (state.data !== null && state.fetchedAt !== null && cacheTtl > 0) {
            state = { ...state, isStale: !isCacheValid() };
        }
    }
    async function executeFetch() {
        state = { ...state, status: 'loading', error: null, isStale: false };
        try {
            const raw = await fn();
            // Validate with Zod if schema provided
            let data;
            if (schema) {
                const result = schema.safeParse(raw);
                if (!result.success) {
                    throw new Error(`[state-agent] Fetcher "${name}": response validation failed:\n` +
                        result.error.issues.map((i) => `  ${i.path.join('.')}: ${i.message}`).join('\n'));
                }
                data = result.data;
            }
            else {
                data = raw;
            }
            state = {
                data,
                error: null,
                status: 'success',
                fetchedAt: Date.now(),
                isStale: false,
            };
            return data;
        }
        catch (err) {
            const error = err instanceof Error ? err : new Error(String(err));
            state = { ...state, status: 'error', error };
            throw error;
        }
        finally {
            fetchPromise = null;
        }
    }
    const fetcher = {
        get name() { return name; },
        getState() {
            updateStale();
            return state;
        },
        async fetch() {
            // Return cached data if still valid
            if (isCacheValid() && state.data !== null) {
                return state.data;
            }
            // Deduplicate in-flight requests
            if (fetchPromise)
                return fetchPromise;
            fetchPromise = executeFetch();
            return fetchPromise;
        },
        async refetch() {
            fetchPromise = null;
            state = { ...state, fetchedAt: null };
            fetchPromise = executeFetch();
            return fetchPromise;
        },
        invalidate() {
            state = { ...state, fetchedAt: null, isStale: state.data !== null };
        },
        bind(store, storePath) {
            const path = storePath ?? name;
            // Sync fetcher state → store
            function syncToStore(fetchState) {
                store.update((draft) => {
                    const target = path.includes('.')
                        ? path.split('.').reduce((obj, key) => obj[key], draft)
                        : draft[path] !== undefined ? draft[path] : draft;
                    // If the store path points to an object, spread fetch state into it
                    if (typeof target === 'object' && target !== null) {
                        Object.assign(target, {
                            data: fetchState.data,
                            isLoading: fetchState.status === 'loading',
                            error: fetchState.error,
                            isStale: fetchState.isStale,
                        });
                    }
                }, actor);
            }
            // Wrap fetch/refetch to sync state to store
            const boundFetcher = {
                ...fetcher,
                async fetch() {
                    syncToStore({ ...state, status: 'loading', error: null, isStale: false });
                    try {
                        const data = await fetcher.fetch();
                        syncToStore(fetcher.getState());
                        return data;
                    }
                    catch (err) {
                        syncToStore(fetcher.getState());
                        throw err;
                    }
                },
                async refetch() {
                    syncToStore({ ...state, status: 'loading', error: null, isStale: false });
                    try {
                        const data = await fetcher.refetch();
                        syncToStore(fetcher.getState());
                        return data;
                    }
                    catch (err) {
                        syncToStore(fetcher.getState());
                        throw err;
                    }
                },
                invalidate() {
                    fetcher.invalidate();
                    syncToStore(fetcher.getState());
                },
                unbind() {
                    // No-op cleanup — future: could remove store listener
                },
            };
            return boundFetcher;
        },
    };
    return fetcher;
}
//# sourceMappingURL=fetch.js.map