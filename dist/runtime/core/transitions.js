// Declared Transition Graphs
//
// When a store uses discriminated union modes, transitions can be declared
// to restrict which mode changes are valid. Keys are "from -> to" pairs,
// values are transition names. Wildcard '*' as source matches any mode.
/**
 * Parse transition declarations like:
 *   'cart -> shipping': 'proceedToShipping'
 *   '* -> cart': 'reset'
 *
 * Returns a TransitionGraph.
 */
export function createTransitionGraph(transitions) {
    // from -> to -> transitionName
    const graph = new Map();
    for (const [key, transitionName] of Object.entries(transitions)) {
        const parts = key.split(' -> ');
        if (parts.length !== 2) {
            throw new Error(`[state-agent] Invalid transition key "${key}". Expected format: "from -> to"`);
        }
        const from = parts[0].trim();
        const to = parts[1].trim();
        if (!from || !to) {
            throw new Error(`[state-agent] Invalid transition key "${key}". Both "from" and "to" must be non-empty.`);
        }
        let targets = graph.get(from);
        if (!targets) {
            targets = new Map();
            graph.set(from, targets);
        }
        targets.set(to, transitionName);
    }
    return {
        canTransition(from, to) {
            // Check explicit entry first
            const explicit = graph.get(from);
            if (explicit?.has(to))
                return true;
            // Check wildcard entry
            const wildcard = graph.get('*');
            if (wildcard?.has(to))
                return true;
            return false;
        },
        validTargets(from) {
            const targets = new Set();
            // Explicit targets for this mode
            const explicit = graph.get(from);
            if (explicit) {
                for (const to of explicit.keys()) {
                    targets.add(to);
                }
            }
            // Wildcard targets
            const wildcard = graph.get('*');
            if (wildcard) {
                for (const to of wildcard.keys()) {
                    targets.add(to);
                }
            }
            return Array.from(targets);
        },
        transitionName(from, to) {
            // Check explicit first
            const explicit = graph.get(from);
            if (explicit?.has(to))
                return explicit.get(to);
            // Check wildcard
            const wildcard = graph.get('*');
            if (wildcard?.has(to))
                return wildcard.get(to);
            return undefined;
        },
        validate(allModes) {
            const warnings = [];
            const errors = [];
            // Collect all modes that appear as targets (reachable via some transition)
            const reachableTargets = new Set();
            // Collect all modes that have outgoing transitions
            const hasOutgoing = new Set();
            for (const [from, targets] of graph) {
                if (from !== '*') {
                    hasOutgoing.add(from);
                }
                for (const to of targets.keys()) {
                    reachableTargets.add(to);
                    // Self-loops are errors
                    if (from === to) {
                        errors.push(`Self-loop detected: "${from}" -> "${to}"`);
                    }
                }
            }
            // If there's a wildcard, all modes effectively have outgoing transitions
            // and all wildcard targets are reachable from anywhere
            const hasWildcard = graph.has('*');
            for (const mode of allModes) {
                // Check unreachable: no transition leads to this mode (and not a wildcard target)
                if (!reachableTargets.has(mode) && !(hasWildcard && graph.get('*')?.has(mode))) {
                    warnings.push(`Unreachable state: "${mode}" — no transition leads to it`);
                }
                // Check dead ends: no outgoing transitions from this mode (and no wildcard)
                if (!hasOutgoing.has(mode) && !hasWildcard) {
                    warnings.push(`Dead end: "${mode}" — no outgoing transitions`);
                }
            }
            return { warnings, errors };
        },
    };
}
//# sourceMappingURL=transitions.js.map