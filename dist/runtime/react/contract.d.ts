import { type ComponentType } from 'react';
export interface ComponentContract {
    /** Store data this component reads */
    reads: Record<string, {
        store: string;
        path: string;
    }>;
    /** Actions this component can perform */
    writes?: {
        store: string;
        actions: string[];
    }[];
    /** Gates that control this component's mounting */
    gates?: {
        store: string;
        gate: string;
    }[];
}
/** Enable/disable dev-mode contract validation. Called automatically in withContract when NODE_ENV=development. */
export declare function setDevValidation(enabled: boolean): void;
/**
 * Called by hooks (useStore, useValue, etc.) to report a store read.
 * In dev mode with an active contract, warns if the read is not declared.
 */
export declare function reportStoreRead(storeName: string, path?: string): void;
/**
 * Wrap a React component with a data contract.
 * Registers the contract for agent introspection.
 * In development, wraps the component to validate store reads against the contract.
 */
export declare function withContract<P extends Record<string, unknown>>(contract: ComponentContract, component: ComponentType<P>): ComponentType<P>;
/** Get all registered contracts for agent introspection */
export declare function getContracts(): Map<string, ComponentContract>;
/** Clear all registered contracts */
export declare function clearContracts(): void;
/**
 * Given a store name and optional path, return all components that read from it.
 * Enables impact analysis: "if I change todos.items, which components break?"
 *
 * Path matching rules:
 * - No path: returns all components reading any path from the store
 * - Exact match: "items" matches "items"
 * - Parent match: "items" matches "items.0.text" (changing parent affects children)
 * - Child match: "items.0.text" matches "items" (changing child affects parent readers)
 */
export declare function findAffectedComponents(storeName: string, path?: string): string[];
/**
 * Given a store name and action name, return all components that write that action.
 * Enables: "which components call addTodo?"
 */
export declare function findComponentsByAction(storeName: string, actionName: string): string[];
/**
 * Given a store name and gate name, return all components gated by it.
 * Enables: "which components unmount when auth.isAuthenticated goes false?"
 */
export declare function findGatedComponents(storeName: string, gateName: string): string[];
//# sourceMappingURL=contract.d.ts.map