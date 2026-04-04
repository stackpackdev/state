// Computed/derived values for stores
// Memoized using state reference equality (same as when/gate evaluators)
export function createComputedEvaluator(definitions = {}) {
    const defMap = new Map(Object.entries(definitions));
    // Per-key memoization: each computed value caches independently
    const cache = new Map();
    return {
        get(name, state) {
            const fn = defMap.get(name);
            if (!fn)
                return undefined;
            const cached = cache.get(name);
            if (cached && cached.state === state)
                return cached.value;
            const value = fn(state);
            cache.set(name, { state, value });
            return value;
        },
        getAll(state) {
            const result = {};
            for (const name of defMap.keys()) {
                result[name] = this.get(name, state);
            }
            return result;
        },
        names() {
            return Array.from(defMap.keys());
        },
    };
}
//# sourceMappingURL=computed.js.map