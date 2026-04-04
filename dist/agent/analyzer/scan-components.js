// Scan React components — find all components, their props, state, children
// Inspired by morph's parse/index.js which parses .view files into AST blocks
// and process-view-files.js which discovers all view files
/**
 * Scan the codebase for React components.
 * Uses pattern matching on file contents to extract component info.
 * In the full agent, this delegates to the LLM for deeper understanding.
 */
export async function scanComponents(root, verbose = false) {
    const fs = await import('fs/promises');
    const path = await import('path');
    const components = [];
    const tsxFiles = await findFiles(root, ['.tsx', '.jsx']);
    for (const filePath of tsxFiles) {
        try {
            const content = await fs.readFile(filePath, 'utf-8');
            const extracted = extractComponentInfo(content, filePath);
            components.push(...extracted);
            if (verbose && extracted.length > 0) {
                console.log(`  Found ${extracted.length} component(s) in ${path.relative(root, filePath)}`);
            }
        }
        catch {
            // Skip files that can't be read
        }
    }
    return components;
}
function extractComponentInfo(content, filePath) {
    const components = [];
    // Match function components: function Name(...) or const Name = (...) =>
    const functionPattern = /(?:export\s+(?:default\s+)?)?(?:function\s+(\w+)|const\s+(\w+)\s*=\s*(?:\([^)]*\)|[^=])\s*=>)/g;
    let match;
    while ((match = functionPattern.exec(content)) !== null) {
        const name = match[1] || match[2];
        if (!name || !/^[A-Z]/.test(name))
            continue; // Components start with uppercase
        // Extract useState calls
        const localState = extractUseState(content);
        // Extract event handlers
        const handlers = extractHandlers(content);
        // Check for data fetching
        const fetchesData = content.includes('fetch(') ||
            content.includes('axios') ||
            content.includes('useSWR') ||
            content.includes('useQuery') ||
            content.includes('useFetch');
        // Extract child component references (JSX tags starting with uppercase)
        const childPattern = /<([A-Z]\w+)/g;
        const children = [];
        let childMatch;
        while ((childMatch = childPattern.exec(content)) !== null) {
            if (childMatch[1] !== name && !children.includes(childMatch[1])) {
                children.push(childMatch[1]);
            }
        }
        components.push({
            filePath,
            name,
            props: extractProps(content, name),
            localState,
            children,
            handlers,
            fetchesData,
        });
    }
    return components;
}
function extractUseState(content) {
    const statePattern = /(?:const|let)\s+\[(\w+),\s*set\w+\]\s*=\s*useState(?:<([^>]+)>)?\(([^)]*)\)/g;
    const states = [];
    let match;
    while ((match = statePattern.exec(content)) !== null) {
        states.push({
            hook: 'useState',
            name: match[1],
            type: match[2] || undefined,
            initialValue: match[3] || undefined,
        });
    }
    return states;
}
function extractHandlers(content) {
    const handlerPattern = /on[A-Z]\w+/g;
    const handlers = new Set();
    let match;
    while ((match = handlerPattern.exec(content)) !== null) {
        handlers.add(match[0]);
    }
    return Array.from(handlers);
}
function extractProps(content, componentName) {
    // Simple extraction — look for destructured props or interface/type definitions
    const propsPattern = new RegExp(`(?:interface\\s+${componentName}Props|type\\s+${componentName}Props)\\s*=?\\s*\\{([^}]+)\\}`, 's');
    const match = propsPattern.exec(content);
    if (!match)
        return [];
    const propsStr = match[1];
    return propsStr
        .split('\n')
        .map(line => line.trim())
        .filter(line => line && !line.startsWith('//'))
        .map(line => {
        const propMatch = line.match(/(\w+)(\?)?:\s*(.+?)(?:;|$)/);
        if (!propMatch)
            return null;
        return {
            name: propMatch[1],
            required: !propMatch[2],
            type: propMatch[3]?.trim(),
        };
    })
        .filter((p) => p !== null);
}
async function findFiles(root, extensions) {
    const fs = await import('fs/promises');
    const path = await import('path');
    const files = [];
    const skipDirs = new Set([
        'node_modules', '.git', '.next', 'dist', 'build',
        'coverage', '.cache', '.turbo', '.vercel',
    ]);
    async function walk(dir) {
        try {
            const entries = await fs.readdir(dir, { withFileTypes: true });
            for (const entry of entries) {
                if (entry.isDirectory()) {
                    if (!skipDirs.has(entry.name) && !entry.name.startsWith('.')) {
                        await walk(path.join(dir, entry.name));
                    }
                }
                else if (extensions.some(ext => entry.name.endsWith(ext))) {
                    files.push(path.join(dir, entry.name));
                }
            }
        }
        catch {
            // Skip directories we can't read
        }
    }
    await walk(root);
    return files;
}
//# sourceMappingURL=scan-components.js.map