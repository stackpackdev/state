// Component Binding Contracts
// Declares which store data a React component reads, which actions it calls,
// and which gates control its mounting. Machine-readable for agent impact analysis.
//
// Dev-mode validation: when NODE_ENV=development, withContract wraps the component
// to track actual store reads and warn when reads occur outside the declared contract.
import { createElement, useEffect, useRef } from 'react';
// ─── Registry ────────────────────────────────────────────────
const contractRegistry = new Map();
// ─── Dev-mode validation tracking ────────────────────────────
let devValidationEnabled = false;
let activeComponentName = null;
let activeContract = null;
const undeclaredReads = new Set();
/** Enable/disable dev-mode contract validation. Called automatically in withContract when NODE_ENV=development. */
export function setDevValidation(enabled) {
    devValidationEnabled = enabled;
}
/**
 * Called by hooks (useStore, useValue, etc.) to report a store read.
 * In dev mode with an active contract, warns if the read is not declared.
 */
export function reportStoreRead(storeName, path) {
    if (!devValidationEnabled || !activeContract || !activeComponentName)
        return;
    const readPath = path ?? '*';
    const key = `${storeName}:${readPath}`;
    if (undeclaredReads.has(key))
        return; // already warned
    const isDeclared = Object.values(activeContract.reads).some(r => {
        if (r.store !== storeName)
            return false;
        if (!path)
            return true; // reading whole store, any declaration for this store counts
        return (r.path === path ||
            r.path === '*' ||
            path.startsWith(r.path + '.') ||
            r.path.startsWith(path + '.'));
    });
    if (!isDeclared) {
        undeclaredReads.add(key);
        console.warn(`[state-agent] Contract violation: <${activeComponentName}> reads "${storeName}${path ? '.' + path : ''}" ` +
            `but this path is not declared in its contract. Declared reads: ${JSON.stringify(activeContract.reads)}`);
    }
}
/**
 * Wrap a React component with a data contract.
 * Registers the contract for agent introspection.
 * In development, wraps the component to validate store reads against the contract.
 */
export function withContract(contract, component) {
    const name = component.displayName || component.name || 'Anonymous';
    contractRegistry.set(name, contract);
    // In dev mode, wrap to track reads
    if (process.env.NODE_ENV === 'development') {
        devValidationEnabled = true;
        const Wrapper = (props) => {
            const prevComponent = useRef(null);
            const prevContract = useRef(null);
            // Set active context before render
            prevComponent.current = activeComponentName;
            prevContract.current = activeContract;
            activeComponentName = name;
            activeContract = contract;
            // Restore after render via microtask (hooks fire synchronously during render)
            useEffect(() => {
                activeComponentName = prevComponent.current;
                activeContract = prevContract.current;
            });
            return createElement(component, props);
        };
        Wrapper.displayName = `Contract(${name})`;
        return Wrapper;
    }
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