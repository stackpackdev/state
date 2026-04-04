export type ComputedDefinitions<T = any> = Record<string, (state: T) => unknown>;
export interface ComputedEvaluator<T = any> {
    /** Get a computed value by name */
    get<V = unknown>(name: string, state: T): V;
    /** Get all computed values */
    getAll(state: T): Record<string, unknown>;
    /** List all computed value names */
    names(): string[];
}
export declare function createComputedEvaluator<T>(definitions?: ComputedDefinitions<T>): ComputedEvaluator<T>;
//# sourceMappingURL=computed.d.ts.map