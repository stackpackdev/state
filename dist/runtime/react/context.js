// Named React context registry
// Extracted from Data.js DataContexts = {} (line 74) — lazy context creation by name
import React from 'react';
const contexts = new Map();
/**
 * Get or create a React context for a store by name.
 * From DataContexts pattern: contexts are lazily created and cached.
 */
export function getStoreContext(name) {
    if (!contexts.has(name)) {
        const ctx = React.createContext(null);
        ctx.displayName = `StateAgent(${name})`;
        contexts.set(name, ctx);
    }
    return contexts.get(name);
}
/**
 * Remove a context (cleanup).
 */
export function removeStoreContext(name) {
    contexts.delete(name);
}
//# sourceMappingURL=context.js.map