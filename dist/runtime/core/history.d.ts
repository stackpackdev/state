import type { Action } from './types.js';
export interface ActionHistory {
    push(action: Action): void;
    getAll(): Action[];
    getByActor(actorId: string): Action[];
    getByPath(path: string): Action[];
    getLast(n?: number): Action[];
    clear(): void;
    readonly length: number;
}
export declare function createHistory(limit?: number): ActionHistory;
//# sourceMappingURL=history.d.ts.map