import type { Action, Middleware } from './types.js';
export interface MiddlewarePipeline {
    add(middleware: Middleware): void;
    remove(name: string): void;
    run(action: Action, currentState: unknown, apply: (processedAction: Action) => unknown): {
        nextState: unknown;
        cancelled: boolean;
        action: Action;
    };
}
export declare function createMiddlewarePipeline(initial?: Middleware[]): MiddlewarePipeline;
//# sourceMappingURL=middleware.d.ts.map