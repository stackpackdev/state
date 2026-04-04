export interface TransitionGraph {
    /** Check if a transition is valid */
    canTransition(from: string, to: string): boolean;
    /** Get all valid targets from a given mode */
    validTargets(from: string): string[];
    /** Get the transition name */
    transitionName(from: string, to: string): string | undefined;
    /** Validate that the graph has no unreachable states or dead ends */
    validate(allModes: string[]): {
        warnings: string[];
        errors: string[];
    };
}
/**
 * Parse transition declarations like:
 *   'cart -> shipping': 'proceedToShipping'
 *   '* -> cart': 'reset'
 *
 * Returns a TransitionGraph.
 */
export declare function createTransitionGraph(transitions: Record<string, string>): TransitionGraph;
//# sourceMappingURL=transitions.d.ts.map