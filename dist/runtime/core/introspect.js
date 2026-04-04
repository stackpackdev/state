// Agent Introspection API
// Structured runtime inspection of stores and the full state system
// Enables agents to reason about application state without parsing source code
// ─── Introspection Functions ────────────────────────────────
/**
 * Introspect a single store, returning its current runtime state,
 * conditions, computed values, and dependency metadata.
 */
export function introspectStore(store) {
    const meta = store.__meta;
    const result = {
        name: store.name,
        state: store.getState(),
        when: store.getWhen(),
        gates: store.getGates(),
        computed: store.getComputed(),
        dependencies: store.getDependencies(),
        historyLength: store.getHistory().length,
    };
    if (meta) {
        // Modes
        if (meta.modeInfo) {
            const currentState = store.getState();
            result.currentMode = currentState?.[meta.modeInfo.discriminant];
            result.modes = meta.modeInfo.modeNames;
        }
        // Transitions
        if (meta.transitionGraph) {
            if (result.currentMode) {
                result.validTransitions = meta.transitionGraph.validTargets(result.currentMode);
            }
        }
        // Effects
        if (meta.effectRunner) {
            result.effects = meta.effectRunner.status();
        }
        // Selectors
        if (meta.selectorPaths) {
            result.selectorPaths = meta.selectorPaths;
        }
        // Properties
        if (meta.hasProperties) {
            result.properties = store.getProperties();
        }
        // Undo
        result.undoEnabled = meta.undoEnabled ?? false;
        if (meta.undoEnabled) {
            result.canRedo = store.canRedo();
        }
        // Pub/Sub
        if (meta.publishEventNames) {
            result.publishes = meta.publishEventNames;
        }
        if (meta.subscribeEventNames) {
            result.subscribes = meta.subscribeEventNames;
        }
    }
    return result;
}
/**
 * Introspect the entire state system via the store registry,
 * returning a structured description of all registered stores.
 */
export function introspectSystem(registry) {
    const stores = {};
    const storeNames = [];
    for (const [name, store] of registry.getAll()) {
        storeNames.push(name);
        stores[name] = introspectStore(store);
    }
    return {
        stores,
        storeNames,
        storeCount: storeNames.length,
    };
}
//# sourceMappingURL=introspect.js.map