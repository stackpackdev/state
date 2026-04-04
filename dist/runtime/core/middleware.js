// Enter/leave middleware pipeline
// Extracted from walk.js visitor pattern: enter can short-circuit, leave for post-processing
export function createMiddlewarePipeline(initial = []) {
    let middlewares = [...initial];
    return {
        add(middleware) {
            middlewares.push(middleware);
        },
        remove(name) {
            middlewares = middlewares.filter(m => m.name !== name);
        },
        run(action, currentState, apply) {
            // Enter phase: each middleware can transform or cancel the action
            // From walk.js: enter.some(fn => fn(node, state)) — returning truthy skips
            let processedAction = action;
            for (const mw of middlewares) {
                if (mw.enter) {
                    const result = mw.enter(processedAction, currentState);
                    if (result === null) {
                        return { nextState: currentState, cancelled: true, action: processedAction };
                    }
                    processedAction = result;
                }
            }
            // Apply the action (reducer)
            const nextState = apply(processedAction);
            // Leave phase: notification after state change
            // From walk.js: leave functions run after children are processed
            for (const mw of middlewares) {
                if (mw.leave) {
                    mw.leave(processedAction, currentState, nextState);
                }
            }
            return { nextState, cancelled: false, action: processedAction };
        },
    };
}
//# sourceMappingURL=middleware.js.map