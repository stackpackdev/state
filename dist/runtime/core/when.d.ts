export type WhenConditions<T = any> = Record<string, (state: T) => boolean>;
export type GateConditions<T = any> = Record<string, (state: T) => boolean>;
export interface WhenEvaluator<T = any> {
    /** Evaluate all when conditions against current state */
    evaluate(state: T): Record<string, boolean>;
    /** Evaluate a single when condition */
    check(name: string, state: T): boolean;
    /** Add a new when condition */
    add(name: string, predicate: (state: T) => boolean): void;
    /** Remove a when condition */
    remove(name: string): void;
    /** List all condition names */
    names(): string[];
}
export interface GateEvaluator<T = any> {
    /** Evaluate all gate conditions against current state */
    evaluate(state: T): Record<string, boolean>;
    /** Evaluate a single gate condition */
    check(name: string, state: T): boolean;
    /** Add a new gate condition */
    add(name: string, predicate: (state: T) => boolean): void;
    /** Remove a gate condition */
    remove(name: string): void;
    /** List all gate names */
    names(): string[];
}
export declare function createWhenEvaluator<T>(conditions?: WhenConditions<T>): WhenEvaluator<T>;
export declare function createGateEvaluator<T>(conditions?: GateConditions<T>): GateEvaluator<T>;
//# sourceMappingURL=when.d.ts.map