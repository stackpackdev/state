import type { AppAnalysis } from '../analyzer/index.js';
export interface StateDesign {
    /** Store definitions to generate */
    stores: StoreDesign[];
    /** Flow state machines to generate */
    flows: FlowDesign[];
    /** Together groups */
    groups: GroupDesign[];
    /** Feature being added (if incremental) */
    feature?: string;
}
export interface StoreDesign {
    name: string;
    description: string;
    /** The initial state shape as TypeScript interface */
    shape: Record<string, FieldDesign>;
    /** When conditions: style-edge predicates (cheap re-render, no tree mutation) */
    when: Record<string, string>;
    /** Gate conditions: mount-edge predicates (controls component mounting, may cascade) */
    gates: Record<string, string>;
    /** Validation rules */
    validation: Record<string, string>;
    /** Which components use this store */
    usedBy: string[];
    /** Store dependency metadata for agent traversal */
    dependencies: StoreDependencyDesign;
    /** Path schema for deterministic traversal */
    pathSchema: Record<string, PathSchemaDesign>;
    /** Reasoning: why this store exists */
    reasoning: string;
}
export interface StoreDependencyDesign {
    /** Stores this store reads from */
    reads: string[];
    /** Stores whose gates control this store's component mounting */
    gatedBy: string[];
    /** Stores that should refresh when this store changes */
    triggers: string[];
}
export interface PathSchemaDesign {
    type: string;
    itemType?: string;
    fields?: string[];
    values?: string[];
    nullable?: boolean;
    validation?: string;
}
export interface FieldDesign {
    type: string;
    defaultValue: string;
    description?: string;
    nullable: boolean;
}
export interface FlowDesign {
    name: string;
    /** 'separate' (one active) or 'together' (all render, gated) */
    mode: 'separate' | 'together';
    states: string[];
    initial: string;
    /** Nested sub-flows */
    children?: Record<string, FlowDesign>;
    /** Reasoning: why this flow exists */
    reasoning: string;
}
export interface GroupDesign {
    name: string;
    stores: string[];
    flow?: string;
    /** Reasoning: why these are together */
    reasoning: string;
}
/**
 * Design state architecture from app analysis.
 * Uses Together/Separate/When/Gate primitives to reason about state.
 *
 * Together: What data moves as a unit? (consumption-based grouping)
 * Separate: What should be independent? (domain-based separation)
 * When: What conditions change appearance? (style-edge predicates)
 * Gate: What conditions control mounting? (mount-edge predicates)
 */
export declare function designState(analysis: AppAnalysis, feature?: string): Promise<StateDesign>;
//# sourceMappingURL=index.d.ts.map