import type { ComponentInfo } from '../analyzer/index.js';
export interface ConsumptionNode {
    /** Unique ID: "ComponentName:variableName" */
    id: string;
    /** Component that owns this state variable */
    component: string;
    /** State variable name */
    variable: string;
    /** Type information */
    type?: string;
    /** Initial value */
    initialValue?: string;
}
export interface ConsumptionGroup {
    /** Generated group name */
    name: string;
    /** Components that consume state in this group */
    components: string[];
    /** State variables in this group */
    state: Array<{
        name: string;
        type?: string;
        initialValue?: string;
        /** Which component originally owned this state */
        owner: string;
    }>;
}
/**
 * Build consumption groups from component analysis.
 *
 * Algorithm:
 * 1. For each component, create nodes for all its state variables (component-scoped)
 * 2. For each component, union all its state variables (they're consumed together)
 * 3. Find connected components via union-find
 * 4. Each connected component becomes a store group
 *
 * The key insight: two state variables belong together if ANY component reads both.
 * This is the "Together" principle expressed as a graph algorithm.
 */
export declare function buildConsumptionGroups(components: ComponentInfo[]): ConsumptionGroup[];
//# sourceMappingURL=consumption-graph.d.ts.map