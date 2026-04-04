// Consumption-based state grouping using bipartite graph + union-find
// Replaces similarity-based grouping (matching variable names across components)
// with consumption-based grouping (state variables read by the SAME component belong together)
//
// This produces correct groups at any scale:
// - O(V+E) time complexity on the consumption graph
// - No false positives from name collisions (e.g., isLoading in unrelated components)
// - Deterministic: same input always produces same output
// ─── Union-Find ─────────────────────────────────────────────
// Disjoint set data structure for grouping connected state variables
class UnionFind {
    parent = new Map();
    rank = new Map();
    makeSet(x) {
        if (!this.parent.has(x)) {
            this.parent.set(x, x);
            this.rank.set(x, 0);
        }
    }
    find(x) {
        let root = x;
        while (this.parent.get(root) !== root) {
            root = this.parent.get(root);
        }
        // Path compression
        let curr = x;
        while (curr !== root) {
            const next = this.parent.get(curr);
            this.parent.set(curr, root);
            curr = next;
        }
        return root;
    }
    union(x, y) {
        const rootX = this.find(x);
        const rootY = this.find(y);
        if (rootX === rootY)
            return;
        const rankX = this.rank.get(rootX);
        const rankY = this.rank.get(rootY);
        if (rankX < rankY) {
            this.parent.set(rootX, rootY);
        }
        else if (rankX > rankY) {
            this.parent.set(rootY, rootX);
        }
        else {
            this.parent.set(rootY, rootX);
            this.rank.set(rootX, rankX + 1);
        }
    }
    /** Get all groups as Map<root, members[]> */
    getGroups() {
        const groups = new Map();
        for (const key of this.parent.keys()) {
            const root = this.find(key);
            if (!groups.has(root)) {
                groups.set(root, []);
            }
            groups.get(root).push(key);
        }
        return groups;
    }
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
export function buildConsumptionGroups(components) {
    const uf = new UnionFind();
    // Map: "variableName@componentName" → node data
    // We scope by component to distinguish isLoading in TodoList vs isLoading in PostList
    const nodeData = new Map();
    // Map: variable name → set of components that have it
    const variableToComponents = new Map();
    // Phase 1: Create nodes for all state variables
    for (const comp of components) {
        for (const state of comp.localState) {
            const nodeId = `${state.name}@${comp.name}`;
            uf.makeSet(nodeId);
            nodeData.set(nodeId, {
                id: nodeId,
                component: comp.name,
                variable: state.name,
                type: state.type,
                initialValue: state.initialValue,
            });
            // Track which components use each variable name
            if (!variableToComponents.has(state.name)) {
                variableToComponents.set(state.name, new Set());
            }
            variableToComponents.get(state.name).add(comp.name);
        }
    }
    // Phase 2: Union state variables that are consumed together within a component
    // If a component has [items, filter, isLoading], they're all consumed together
    for (const comp of components) {
        const nodeIds = comp.localState.map(s => `${s.name}@${comp.name}`);
        for (let i = 1; i < nodeIds.length; i++) {
            uf.union(nodeIds[0], nodeIds[i]);
        }
    }
    // Phase 3: Union variables that are genuinely shared across components
    // Two components sharing a variable name are only connected if:
    // - They share through a parent-child relationship (one passes to other via props)
    // - They both appear as children of the same parent component
    // For now, we connect same-named variables ONLY if the components are
    // parent-child (one lists the other in children[])
    const childToParent = new Map();
    for (const comp of components) {
        for (const child of comp.children) {
            if (!childToParent.has(child)) {
                childToParent.set(child, []);
            }
            childToParent.get(child).push(comp.name);
        }
    }
    for (const [varName, compNames] of variableToComponents) {
        const compArray = Array.from(compNames);
        for (let i = 0; i < compArray.length; i++) {
            for (let j = i + 1; j < compArray.length; j++) {
                const a = compArray[i];
                const b = compArray[j];
                // Only union if parent-child relationship exists
                const aParents = childToParent.get(a) || [];
                const bParents = childToParent.get(b) || [];
                if (aParents.includes(b) ||
                    bParents.includes(a) ||
                    // Or if they share a common parent
                    aParents.some(p => bParents.includes(p))) {
                    uf.union(`${varName}@${a}`, `${varName}@${b}`);
                }
            }
        }
    }
    // Phase 4: Extract groups from union-find
    const rawGroups = uf.getGroups();
    const groups = [];
    for (const [, members] of rawGroups) {
        if (members.length === 0)
            continue;
        const components = new Set();
        const state = [];
        // Deduplicate state variables by name (keep the one with most type info)
        const seenVars = new Map();
        for (const nodeId of members) {
            const node = nodeData.get(nodeId);
            if (!node)
                continue;
            components.add(node.component);
            const existing = seenVars.get(node.variable);
            if (!existing || (node.type && !existing.type)) {
                seenVars.set(node.variable, {
                    name: node.variable,
                    type: node.type,
                    initialValue: node.initialValue,
                    owner: node.component,
                });
            }
        }
        state.push(...seenVars.values());
        // Generate group name from the primary component or state variables
        const compArray = Array.from(components);
        const groupName = compArray.length === 1
            ? camelCase(compArray[0])
            : generateGroupName(state.map(s => s.name));
        groups.push({
            name: groupName,
            components: compArray,
            state,
        });
    }
    // Filter out single-variable groups from single components (they stay local)
    return groups.filter(g => g.state.length > 1 || g.components.length > 1);
}
// ─── Helpers ────────────────────────────────────────────────
function camelCase(str) {
    return str
        .replace(/[-_\s]+(.)?/g, (_, c) => (c ? c.toUpperCase() : ''))
        .replace(/^./, c => c.toLowerCase());
}
function generateGroupName(varNames) {
    // Use the most descriptive variable name (longest, non-boolean)
    const sorted = [...varNames].sort((a, b) => {
        // Prefer non-boolean names
        const aIsFlag = a.startsWith('is') || a.startsWith('has');
        const bIsFlag = b.startsWith('is') || b.startsWith('has');
        if (aIsFlag && !bIsFlag)
            return 1;
        if (!aIsFlag && bIsFlag)
            return -1;
        // Then by length (longer = more descriptive)
        return b.length - a.length;
    });
    return camelCase(sorted[0] || 'state');
}
//# sourceMappingURL=consumption-graph.js.map