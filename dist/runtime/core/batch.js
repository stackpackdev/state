// Buffered dispatch for batching rapid state changes
// Extracted from Flow.js: useSetFlowToBuffer + setTimeout(fn, 25) pattern (lines 117-141)
// Critical for AI agents that fire many state changes in rapid succession.
export function createBatcher(applyFn, ms = 25) {
    // From Flow.js: useSetFlowToBuffer = {} and useSetFlowToTimeout = null
    let buffer = new Map();
    let timeout = null;
    return {
        queue(key, action) {
            buffer.set(key, action);
            if (timeout)
                clearTimeout(timeout);
            timeout = setTimeout(() => {
                timeout = null;
                const actions = Array.from(buffer.values());
                buffer.clear();
                applyFn(actions);
            }, ms);
        },
        flush() {
            if (timeout)
                clearTimeout(timeout);
            timeout = null;
            const actions = Array.from(buffer.values());
            buffer.clear();
            if (actions.length > 0)
                applyFn(actions);
        },
        cancel() {
            if (timeout)
                clearTimeout(timeout);
            timeout = null;
            buffer.clear();
        },
        get pending() {
            return buffer.size;
        },
    };
}
//# sourceMappingURL=batch.js.map