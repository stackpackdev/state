// Effect Declarations — reactive side effects triggered by state changes
//
// Effects watch specific state paths or mode transitions and run handlers
// when changes are detected. Supports debounce, abort signals, and retry.
import { getPath } from './path.js';
import { extractModes } from './modes.js';
// ─── System Actor ───────────────────────────────────────────
const effectSystemActor = {
    id: 'effect-system',
    type: 'system',
    name: 'effect-runner',
};
function parseTransitionWatch(watch) {
    if (!watch.includes(' -> '))
        return null;
    const parts = watch.split(' -> ');
    if (parts.length !== 2)
        return null;
    return { from: parts[0].trim(), to: parts[1].trim() };
}
// ─── Base Retry Delay ───────────────────────────────────────
const BASE_RETRY_DELAY = 100;
// ─── Create Effect Runner ───────────────────────────────────
export function createEffectRunner(declarations) {
    const statuses = {};
    const controllers = {};
    const timers = {};
    let unsubscribe = null;
    // Initialize all statuses to idle
    for (const name of Object.keys(declarations)) {
        statuses[name] = 'idle';
    }
    function abortEffect(name) {
        if (controllers[name]) {
            controllers[name].abort();
            delete controllers[name];
        }
        if (timers[name]) {
            clearTimeout(timers[name]);
            delete timers[name];
        }
    }
    async function runHandler(name, decl, store, state, prevState) {
        // Abort previous invocation
        abortEffect(name);
        const controller = new AbortController();
        controllers[name] = controller;
        const context = {
            state,
            prevState,
            store,
            signal: controller.signal,
            actor: effectSystemActor,
        };
        const maxRetries = decl.retry?.max ?? 0;
        const backoff = decl.retry?.backoff ?? 'linear';
        for (let attempt = 0; attempt <= maxRetries; attempt++) {
            if (controller.signal.aborted)
                return;
            try {
                statuses[name] = attempt > 0 ? 'retrying' : 'running';
                await decl.handler(context);
                statuses[name] = 'idle';
                return;
            }
            catch (err) {
                if (controller.signal.aborted)
                    return;
                if (attempt < maxRetries) {
                    // Wait before retry
                    const delay = backoff === 'exponential'
                        ? BASE_RETRY_DELAY * Math.pow(2, attempt)
                        : BASE_RETRY_DELAY * (attempt + 1);
                    statuses[name] = 'retrying';
                    await new Promise((resolve) => {
                        timers[name] = setTimeout(resolve, delay);
                    });
                }
                else {
                    statuses[name] = 'error';
                }
            }
        }
    }
    function triggerEffect(name, decl, store, state, prevState) {
        const debounceMs = decl.debounce ?? 0;
        if (debounceMs > 0) {
            abortEffect(name);
            statuses[name] = 'debouncing';
            timers[name] = setTimeout(() => {
                delete timers[name];
                runHandler(name, decl, store, state, prevState);
            }, debounceMs);
        }
        else {
            runHandler(name, decl, store, state, prevState);
        }
    }
    return {
        start(store) {
            // Detect discriminant for transition watches
            const schema = store.getSchema?.();
            const modeInfo = schema ? extractModes(schema) : null;
            unsubscribe = store.subscribe((nextState, prevState) => {
                for (const [name, decl] of Object.entries(declarations)) {
                    const transition = parseTransitionWatch(decl.watch);
                    if (transition) {
                        // Transition watch: detect discriminant field change
                        if (!modeInfo)
                            continue;
                        const prevMode = prevState?.[modeInfo.discriminant];
                        const nextMode = nextState?.[modeInfo.discriminant];
                        if (prevMode === transition.from && nextMode === transition.to) {
                            triggerEffect(name, decl, store, nextState, prevState);
                        }
                    }
                    else {
                        // Dot-path watch: compare values at path
                        const prevVal = getPath(prevState, decl.watch);
                        const nextVal = getPath(nextState, decl.watch);
                        if (prevVal !== nextVal) {
                            triggerEffect(name, decl, store, nextState, prevState);
                        }
                    }
                }
            });
        },
        stop() {
            // Abort all controllers and clear all timers
            for (const name of Object.keys(declarations)) {
                abortEffect(name);
                statuses[name] = 'idle';
            }
            if (unsubscribe) {
                unsubscribe();
                unsubscribe = null;
            }
        },
        status() {
            return { ...statuses };
        },
    };
}
//# sourceMappingURL=effects.js.map