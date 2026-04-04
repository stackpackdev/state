// Core store: create, read, write, subscribe
// The heart of state-agent's runtime, extracted from:
//   - Data.js: DataContexts registry (line 74), reducer (lines 32-72),
//     listener system (lines 93-143), touched tracking, path-based access
//   - Flow.js: action history (lines 143-145), has() pattern (lines 93-106)
//   - walk.js: middleware enter/leave (visitor pattern)
import { produce } from 'immer';
import { z } from 'zod';
import { getPath, setPath, deletePath, hasPath } from './path.js';
import { canAct } from './actor.js';
import { createHistory } from './history.js';
import { createMiddlewarePipeline } from './middleware.js';
import { createWhenEvaluator, createGateEvaluator } from './when.js';
import { createComputedEvaluator } from './computed.js';
import { createBatcher } from './batch.js';
import { introspectSystem } from './introspect.js';
import { buildSelectorTree } from './selectors.js';
import { extractModes } from './modes.js';
import { createTransitionGraph } from './transitions.js';
import { createOptimisticQueue } from './optimistic.js';
import { createPersistMiddleware } from './persist.js';
import { createEffectRunner } from './effects.js';
import { eventBus } from './pubsub.js';
// ─── Global Registry ─────────────────────────────────────────
// From DataContexts = {} (Data.js line 74): lazy, named, global
const registry = new Map();
export const storeRegistry = {
    get(name) {
        return registry.get(name);
    },
    getAll() {
        return new Map(registry);
    },
    has(name) {
        return registry.has(name);
    },
    register(store) {
        registry.set(store.name, store);
    },
    unregister(name) {
        registry.delete(name);
    },
    clear() {
        registry.clear();
    },
    /**
     * Compute the full impact of changing a store.
     * Traverses the dependency graph to find all affected stores.
     * This is the core operation for agent reasoning at scale.
     */
    impactOf(storeName) {
        const readers = [];
        const gatedStores = [];
        const triggered = [];
        const visited = new Set();
        function traverse(name) {
            if (visited.has(name))
                return;
            visited.add(name);
            for (const [otherName, otherStore] of registry) {
                if (otherName === name)
                    continue;
                const deps = otherStore.getDependencies();
                if (deps.reads.includes(name)) {
                    readers.push(otherName);
                }
                if (deps.gatedBy.includes(name)) {
                    gatedStores.push(otherName);
                    // Gated stores cascade — their dependents are also affected
                    traverse(otherName);
                }
                if (deps.triggers.includes(name)) {
                    triggered.push(otherName);
                    traverse(otherName);
                }
            }
        }
        traverse(storeName);
        return {
            readers,
            gatedStores,
            triggered,
            allAffected: Array.from(visited).filter(n => n !== storeName),
        };
    },
    introspect() {
        return introspectSystem(storeRegistry);
    },
};
// Wire the event bus to resolve stores from the registry
eventBus._setStoreResolver((name) => registry.get(name));
// ─── Action ID ───────────────────────────────────────────────
let actionCounter = 0;
function createActionId() {
    return `action_${++actionCounter}_${Date.now()}`;
}
// ─── Create Store ────────────────────────────────────────────
export function createStore(options) {
    const { name, initial, stateSchema, schema, middleware: middlewareList = [], historyLimit = 10_000, batchMs = 0, properties, } = options;
    // Validate initial state against Zod schema if provided
    if (stateSchema) {
        const result = stateSchema.safeParse(initial);
        if (!result.success) {
            throw new Error(`[state-agent] Store "${name}": initial state fails schema validation:\n` +
                result.error.issues.map(i => `  ${i.path.join('.')}: ${i.message}`).join('\n'));
        }
    }
    // Persistence: set up middleware and hydrate before initial state
    const allMiddleware = [...middlewareList];
    let hydratedState;
    if (options.persist) {
        const { middleware: persistMw, hydrate } = createPersistMiddleware(options.persist, stateSchema);
        allMiddleware.push(persistMw);
        hydratedState = hydrate();
    }
    // Internal state — from Data.js dual-state pattern (lines 83-84)
    let state = hydratedState !== undefined ? hydratedState : initial;
    let touched = new Set();
    // Subsystems
    const history = createHistory(historyLimit);
    const pipeline = createMiddlewarePipeline(allMiddleware);
    const whenEval = createWhenEvaluator(options.when);
    const gateEval = createGateEvaluator(options.gates);
    const computedEval = createComputedEvaluator(options.computed);
    // Store metadata for agent traversal
    const dependencies = options.dependencies ?? {
        reads: [],
        gatedBy: [],
        triggers: [],
    };
    const zodSchema = stateSchema;
    const pathSchema = options.pathSchema;
    // Detect discriminated union modes for transition logging
    const modeInfo = stateSchema ? extractModes(stateSchema) : null;
    // Build transition graph if transitions are declared
    const transitionGraph = options.transitions ? createTransitionGraph(options.transitions) : null;
    // Subscriptions — from Data.js listener system (lines 92-100)
    let listeners = [];
    // Undo/redo snapshot stacks (opt-in via options.undo)
    const undoEnabled = !!options.undo;
    const undoLimit = options.undo?.limit ?? 0;
    const undoStack = [];
    const redoStack = [];
    // Flow state (optional) — from Flow.js flowDefinition
    let flowState = {};
    if (schema) {
        for (const [path, states] of Object.entries(schema)) {
            if (states.length > 0) {
                flowState[path] = states[0]; // default to first state
            }
        }
    }
    // ─── Internal: Apply Action ──────────────────────────────
    function reduce(action) {
        switch (action.type) {
            case 'SET': {
                if (action.path) {
                    state = produce(state, (draft) => {
                        setPath(draft, action.path, action.value);
                    });
                    touched = new Set([...touched, action.path]);
                }
                break;
            }
            case 'SET_FN': {
                if (action.fn) {
                    state = produce(state, action.fn);
                    if (action.path) {
                        touched = new Set([...touched, action.path]);
                    }
                }
                break;
            }
            case 'RESET': {
                state = action.value;
                touched = new Set();
                break;
            }
            case 'DELETE': {
                if (action.path) {
                    state = produce(state, (draft) => {
                        deletePath(draft, action.path);
                    });
                }
                break;
            }
            case 'FLOW': {
                if (action.path && action.value && schema) {
                    const validStates = schema[action.path];
                    const targetState = action.value;
                    if (validStates?.includes(targetState)) {
                        flowState = { ...flowState, [action.path]: targetState };
                    }
                }
                break;
            }
            default:
                break;
        }
    }
    function applyAction(action) {
        const prevState = state;
        // Capture undo snapshot before mutation
        if (undoEnabled) {
            undoStack.push(structuredClone(prevState));
            if (undoStack.length > undoLimit) {
                undoStack.shift(); // drop oldest snapshot
            }
            // Clear redo stack on new action (standard undo behavior)
            redoStack.length = 0;
        }
        // Run middleware pipeline: enter → apply → leave
        const { cancelled, action: processedAction } = pipeline.run(action, state, (finalAction) => {
            reduce(finalAction);
            return state;
        });
        if (cancelled) {
            if (undoEnabled)
                undoStack.pop(); // remove unused snapshot
            return;
        }
        // If state didn't change, remove the unnecessary snapshot
        if (undoEnabled && state === prevState) {
            undoStack.pop();
        }
        // Validate resulting state against Zod schema
        if (zodSchema && state !== prevState) {
            const result = zodSchema.safeParse(state);
            if (!result.success) {
                // Roll back to previous state
                state = prevState;
                if (undoEnabled)
                    undoStack.pop(); // remove snapshot for rejected mutation
                if (process.env.NODE_ENV === 'development') {
                    console.warn(`[state-agent] Store "${name}": mutation rejected by schema:\n` +
                        result.error.issues.map(i => `  ${i.path.join('.')}: ${i.message}`).join('\n'));
                }
                return;
            }
        }
        // Log mode transitions for discriminated union stores
        if (modeInfo && state !== prevState) {
            const prevMode = prevState?.[modeInfo.discriminant];
            const nextMode = state?.[modeInfo.discriminant];
            if (prevMode !== nextMode && prevMode !== undefined && nextMode !== undefined) {
                // Enforce transition graph if declared
                if (transitionGraph && !transitionGraph.canTransition(prevMode, nextMode)) {
                    state = prevState;
                    if (undoEnabled)
                        undoStack.pop(); // remove snapshot for rejected transition
                    const validTargetsList = transitionGraph.validTargets(prevMode);
                    const validDesc = validTargetsList.length > 0
                        ? validTargetsList.map(t => {
                            const tName = transitionGraph.transitionName(prevMode, t);
                            return `"${prevMode} -> ${t}"${tName ? ` (${tName})` : ''}`;
                        }).join(', ')
                        : 'none';
                    console.warn(`[state-agent] Store "${name}": transition "${prevMode} -> ${nextMode}" is not declared.\n` +
                        `Valid transitions from "${prevMode}": [${validDesc}]`);
                    return;
                }
                if (process.env.NODE_ENV === 'development') {
                    console.info(`[state-agent] Store "${name}": mode transition "${prevMode}" -> "${nextMode}" (discriminant: "${modeInfo.discriminant}")`);
                }
            }
        }
        // Check properties after mutation
        if (properties && state !== prevState) {
            for (const [propName, check] of Object.entries(properties)) {
                try {
                    if (!check(state)) {
                        console.warn(`[state-agent] Store "${name}": property "${propName}" violated after ${processedAction.type}` +
                            (processedAction.path ? ` at "${processedAction.path}"` : ''));
                    }
                }
                catch (e) {
                    console.warn(`[state-agent] Store "${name}": property "${propName}" threw during check: ${e}`);
                }
            }
        }
        // Record in history
        history.push(processedAction);
        // Notify listeners — from Data.js lines 102-143
        // Sorted listeners fire synchronously after state change
        const meta = {
            action: processedAction,
            has: (path) => hasPath(state, path),
        };
        for (const { listener, path } of listeners) {
            if (path) {
                const prevVal = getPath(prevState, path);
                const nextVal = getPath(state, path);
                if (prevVal !== nextVal) {
                    listener(state, prevState, meta);
                }
            }
            else {
                if (state !== prevState) {
                    listener(state, prevState, meta);
                }
            }
        }
        // Pub/Sub: check and emit events if this store has publishers
        if (hasPublishers && state !== prevState) {
            eventBus.checkAndEmit(name, prevState, state);
        }
    }
    // ─── Batcher (optional) ──────────────────────────────────
    // From Flow.js 25ms buffered dispatch (lines 117-141)
    const batcher = batchMs > 0
        ? createBatcher(actions => {
            for (const action of actions) {
                applyAction(action);
            }
        }, batchMs)
        : null;
    function dispatch(action) {
        if (batcher) {
            batcher.queue(action.path ?? action.type, action);
        }
        else {
            applyAction(action);
        }
    }
    // ─── Store Interface ─────────────────────────────────────
    const store = {
        get name() {
            return name;
        },
        getState() {
            return state;
        },
        get(path) {
            return getPath(state, path);
        },
        set(path, value, actor) {
            if (!canAct(actor, 'write', path)) {
                if (process.env.NODE_ENV === 'development') {
                    console.warn(`[state-agent] Actor "${actor.name}" denied write to "${path}" in store "${name}"`);
                }
                return;
            }
            dispatch({
                id: createActionId(),
                type: 'SET',
                path,
                value,
                actor,
                timestamp: Date.now(),
            });
        },
        update(fn, actor) {
            if (!canAct(actor, 'write', '*')) {
                if (process.env.NODE_ENV === 'development') {
                    console.warn(`[state-agent] Actor "${actor.name}" denied update in store "${name}"`);
                }
                return;
            }
            dispatch({
                id: createActionId(),
                type: 'SET_FN',
                fn,
                actor,
                timestamp: Date.now(),
            });
        },
        reset(value, actor) {
            dispatch({
                id: createActionId(),
                type: 'RESET',
                value,
                actor,
                timestamp: Date.now(),
            });
        },
        delete(path, actor) {
            if (!canAct(actor, 'delete', path)) {
                if (process.env.NODE_ENV === 'development') {
                    console.warn(`[state-agent] Actor "${actor.name}" denied delete at "${path}" in store "${name}"`);
                }
                return;
            }
            dispatch({
                id: createActionId(),
                type: 'DELETE',
                path,
                actor,
                timestamp: Date.now(),
            });
        },
        subscribe(listener, path) {
            const entry = { listener, path };
            listeners.push(entry);
            return () => {
                listeners = listeners.filter(l => l !== entry);
            };
        },
        has(path) {
            // Two modes:
            // 1. Flow state: check if a flow path has a specific state
            if (schema && path in flowState)
                return true;
            // 2. Data state: check if a path exists in state
            return hasPath(state, path);
        },
        getHistory() {
            return history.getAll();
        },
        getWhen() {
            return whenEval.evaluate(state);
        },
        isWhen(conditionName) {
            return whenEval.check(conditionName, state);
        },
        getGates() {
            return gateEval.evaluate(state);
        },
        isGated(gateName) {
            return gateEval.check(gateName, state);
        },
        computed(name) {
            return computedEval.get(name, state);
        },
        getComputed() {
            return computedEval.getAll(state);
        },
        getDependencies() {
            return { ...dependencies };
        },
        getSchema() {
            return zodSchema;
        },
        getProperties() {
            if (!properties)
                return {};
            const results = {};
            for (const [propName, check] of Object.entries(properties)) {
                try {
                    results[propName] = check(state);
                }
                catch {
                    results[propName] = false;
                }
            }
            return results;
        },
        getPathSchema() {
            return pathSchema ? { ...pathSchema } : undefined;
        },
        undo(count = 1, actor) {
            if (!undoEnabled || undoStack.length === 0)
                return 0;
            const actual = Math.min(count, undoStack.length);
            const prevState = state;
            for (let i = 0; i < actual; i++) {
                redoStack.push(structuredClone(state));
                state = undoStack.pop();
            }
            // Notify listeners
            if (state !== prevState) {
                const undoActor = actor ?? { id: 'system', type: 'system', name: 'undo' };
                const undoAction = {
                    id: createActionId(),
                    type: 'UNDO',
                    actor: undoActor,
                    timestamp: Date.now(),
                    meta: { undoCount: actual },
                };
                const meta = {
                    action: undoAction,
                    has: (path) => hasPath(state, path),
                };
                for (const { listener, path } of listeners) {
                    if (path) {
                        const prevVal = getPath(prevState, path);
                        const nextVal = getPath(state, path);
                        if (prevVal !== nextVal) {
                            listener(state, prevState, meta);
                        }
                    }
                    else {
                        listener(state, prevState, meta);
                    }
                }
            }
            return actual;
        },
        redo(count = 1, actor) {
            if (!undoEnabled || redoStack.length === 0)
                return 0;
            const actual = Math.min(count, redoStack.length);
            const prevState = state;
            for (let i = 0; i < actual; i++) {
                undoStack.push(structuredClone(state));
                state = redoStack.pop();
            }
            // Notify listeners
            if (state !== prevState) {
                const redoActor = actor ?? { id: 'system', type: 'system', name: 'redo' };
                const redoAction = {
                    id: createActionId(),
                    type: 'REDO',
                    actor: redoActor,
                    timestamp: Date.now(),
                    meta: { redoCount: actual },
                };
                const meta = {
                    action: redoAction,
                    has: (path) => hasPath(state, path),
                };
                for (const { listener, path } of listeners) {
                    if (path) {
                        const prevVal = getPath(prevState, path);
                        const nextVal = getPath(state, path);
                        if (prevVal !== nextVal) {
                            listener(state, prevState, meta);
                        }
                    }
                    else {
                        listener(state, prevState, meta);
                    }
                }
            }
            return actual;
        },
        canUndo() {
            return undoEnabled && undoStack.length > 0;
        },
        canRedo() {
            return undoEnabled && redoStack.length > 0;
        },
        optimistic: null,
        destroy() {
            if (effectRunner)
                effectRunner.stop();
            eventBus.unregister(name);
            listeners = [];
            history.clear();
            if (batcher)
                batcher.cancel();
            registry.delete(name);
        },
    };
    // Optimistic update queue — one per store
    const optimisticQueue = createOptimisticQueue();
    store.optimistic = (opts) => {
        return optimisticQueue.enqueue(store, opts);
    };
    // Add transition methods if transitions are declared
    if (transitionGraph && modeInfo) {
        store.canTransition = (from, to) => transitionGraph.canTransition(from, to);
        store.validTargets = (from) => {
            const mode = from ?? state?.[modeInfo.discriminant];
            return mode ? transitionGraph.validTargets(mode) : [];
        };
    }
    // Build auto-generated selector tree from Zod schema
    if (zodSchema && (zodSchema instanceof z.ZodObject || zodSchema instanceof z.ZodDiscriminatedUnion)) {
        ;
        store.select = buildSelectorTree(zodSchema);
    }
    // Effect runner (optional) — reactive side effects on state changes
    let effectRunner = null;
    if (options.effects) {
        effectRunner = createEffectRunner(options.effects);
        effectRunner.start(store);
    }
    // Pub/Sub registration (optional) — cross-store event protocol
    const hasPublishers = !!options.publishes;
    if (options.publishes) {
        eventBus.registerPublisher(name, options.publishes);
    }
    if (options.subscribes) {
        eventBus.registerSubscriber(name, options.subscribes);
    }
    // Attach runtime metadata for introspection (V2-2)
    ;
    store.__meta = {
        modeInfo: modeInfo ?? undefined,
        transitionGraph: transitionGraph ?? undefined,
        effectRunner: effectRunner ?? undefined,
        selectorPaths: store.select ? collectSelectorPaths(store.select) : undefined,
        hasProperties: !!properties,
        undoEnabled,
        undoLimit,
        publishEventNames: options.publishes ? Object.keys(options.publishes) : undefined,
        subscribeEventNames: options.subscribes ? Object.keys(options.subscribes) : undefined,
    };
    // Register in global registry — from DataContexts pattern
    registry.set(name, store);
    return store;
}
// ─── Helper: Collect selector paths from tree ─────────────────
function collectSelectorPaths(tree, paths = []) {
    for (const key of Object.keys(tree)) {
        if (key.startsWith('$'))
            continue;
        const node = tree[key];
        if (node && node.$path) {
            paths.push(node.$path);
            collectSelectorPaths(node, paths);
        }
    }
    return paths;
}
// ─── Convenience: Get Store by Name ──────────────────────────
export function getStore(name) {
    return registry.get(name);
}
export function getAllStores() {
    return new Map(registry);
}
//# sourceMappingURL=store.js.map