// Declarative conditional state — "When" and "Gate" primitives
//
// Two types of conditions, distinguished by their graph-edge semantics:
//
// WHEN (style-edge): Condition changes appearance but element stays mounted.
//   - Changing a `when` = re-render with new styles/classes
//   - No lifecycle effects, no cascade, cheap
//   - Example: isHovered, isActive, isSelected
//
// GATE (mount-edge): Condition controls whether a component subtree exists.
//   - Changing a `gate` = mount/unmount cascade
//   - Triggers lifecycle hooks, may cause data fetching, expensive
//   - Example: isAuthenticated, hasData, isLoaded
//
// This distinction matters for agents: they need to know before mutating state
// whether the result will be a cheap re-render or an expensive mount cascade.
function createEvaluator(conditions = {}) {
    const conditionMap = new Map(Object.entries(conditions));
    // Memoization: cache result when state reference hasn't changed
    // Immer guarantees new references on mutation, so === is sufficient
    let cachedState = undefined;
    let cachedResult = {};
    return {
        evaluate(state) {
            if (state === cachedState)
                return cachedResult;
            cachedState = state;
            const result = {};
            for (const [name, predicate] of conditionMap) {
                try {
                    result[name] = predicate(state);
                }
                catch {
                    result[name] = false;
                }
            }
            cachedResult = result;
            return cachedResult;
        },
        check(name, state) {
            const predicate = conditionMap.get(name);
            if (!predicate)
                return false;
            try {
                return predicate(state);
            }
            catch {
                return false;
            }
        },
        add(name, predicate) {
            conditionMap.set(name, predicate);
            // Invalidate cache when conditions change
            cachedState = undefined;
        },
        remove(name) {
            conditionMap.delete(name);
            // Invalidate cache when conditions change
            cachedState = undefined;
        },
        names() {
            return Array.from(conditionMap.keys());
        },
    };
}
export function createWhenEvaluator(conditions = {}) {
    return createEvaluator(conditions);
}
export function createGateEvaluator(conditions = {}) {
    return createEvaluator(conditions);
}
//# sourceMappingURL=when.js.map