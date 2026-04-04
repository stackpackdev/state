// Component Binding Contracts
// Declares which store data a React component reads, which actions it calls,
// and which gates control its mounting. Machine-readable for agent impact analysis.
// ─── Registry ────────────────────────────────────────────────
const contractRegistry = new Map();
/**
 * Wrap a React component with a data contract.
 * Registers the contract for agent introspection.
 * Zero runtime overhead — returns the component unchanged.
 */
export function withContract(contract, component) {
    const name = component.displayName || component.name || 'Anonymous';
    contractRegistry.set(name, contract);
    return component;
}
/** Get all registered contracts for agent introspection */
export function getContracts() {
    return new Map(contractRegistry);
}
/** Clear all registered contracts */
export function clearContracts() {
    contractRegistry.clear();
}
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
export function findAffectedComponents(storeName, path) {
    const affected = [];
    for (const [componentName, contract] of contractRegistry) {
        for (const read of Object.values(contract.reads)) {
            if (read.store === storeName) {
                if (!path ||
                    read.path === path ||
                    read.path.startsWith(path + '.') ||
                    path.startsWith(read.path + '.')) {
                    affected.push(componentName);
                    break;
                }
            }
        }
    }
    return affected;
}
/**
 * Given a store name and action name, return all components that write that action.
 * Enables: "which components call addTodo?"
 */
export function findComponentsByAction(storeName, actionName) {
    const result = [];
    for (const [componentName, contract] of contractRegistry) {
        if (contract.writes) {
            for (const write of contract.writes) {
                if (write.store === storeName && write.actions.includes(actionName)) {
                    result.push(componentName);
                    break;
                }
            }
        }
    }
    return result;
}
/**
 * Given a store name and gate name, return all components gated by it.
 * Enables: "which components unmount when auth.isAuthenticated goes false?"
 */
export function findGatedComponents(storeName, gateName) {
    const result = [];
    for (const [componentName, contract] of contractRegistry) {
        if (contract.gates) {
            for (const gate of contract.gates) {
                if (gate.store === storeName && gate.gate === gateName) {
                    result.push(componentName);
                    break;
                }
            }
        }
    }
    return result;
}
//# sourceMappingURL=contract.js.map