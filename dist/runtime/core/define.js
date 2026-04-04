// defineStore — ergonomic one-call store creation
// Infers types from schema, reduces boilerplate from 3 declarations to 1
import { createStore } from './store.js';
import { extractModes, deriveGatesFromModes, deriveWhenFromModes } from './modes.js';
export function defineStore(options) {
    // Auto-derive gates and when conditions from discriminated union modes.
    // User-provided gates/when take precedence over auto-derived ones.
    const modeInfo = extractModes(options.schema);
    let mergedWhen = options.when;
    let mergedGates = options.gates;
    if (modeInfo) {
        const autoWhen = deriveWhenFromModes(modeInfo);
        const autoGates = deriveGatesFromModes(modeInfo);
        // Auto-derived first, then user overrides on top
        mergedWhen = { ...autoWhen, ...options.when };
        mergedGates = { ...autoGates, ...options.gates };
    }
    const store = createStore({
        name: options.name,
        stateSchema: options.schema,
        initial: options.initial,
        when: mergedWhen,
        gates: mergedGates,
        computed: options.computed,
        properties: options.properties,
        middleware: options.middleware,
        dependencies: options.dependencies,
        transitions: options.transitions,
        historyLimit: options.historyLimit,
        batchMs: options.batchMs,
        persist: options.persist,
        effects: options.effects,
        undo: options.undo,
        publishes: options.publishes,
        subscribes: options.subscribes,
    });
    return { store, schema: options.schema, select: (store.select ?? {}) };
}
//# sourceMappingURL=define.js.map