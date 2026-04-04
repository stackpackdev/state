// Scan existing state management — find useState, Redux, Zustand, etc.
// Identifies what patterns are already in use so the agent can migrate or integrate
export async function scanState(root, verbose = false) {
    const fs = await import('fs/promises');
    const path = await import('path');
    const statePatterns = [];
    const tsFiles = await findAllTsFiles(root);
    // First check package.json for state management libraries
    const pkgState = await detectStateLibraries(root);
    statePatterns.push(...pkgState);
    for (const filePath of tsFiles) {
        try {
            const content = await fs.readFile(filePath, 'utf-8');
            const extracted = extractStatePatterns(content, filePath);
            statePatterns.push(...extracted);
            if (verbose && extracted.length > 0) {
                console.log(`  Found ${extracted.length} state pattern(s) in ${path.relative(root, filePath)}`);
            }
        }
        catch {
            // Skip files that can't be read
        }
    }
    return statePatterns;
}
async function detectStateLibraries(root) {
    const fs = await import('fs/promises');
    const path = await import('path');
    const results = [];
    try {
        const pkgJson = JSON.parse(await fs.readFile(path.join(root, 'package.json'), 'utf-8'));
        const deps = { ...pkgJson.dependencies, ...pkgJson.devDependencies };
        if (deps['redux'] || deps['@reduxjs/toolkit']) {
            results.push({
                type: 'redux',
                filePath: path.join(root, 'package.json'),
                name: 'Redux',
            });
        }
        if (deps['zustand']) {
            results.push({
                type: 'zustand',
                filePath: path.join(root, 'package.json'),
                name: 'Zustand',
            });
        }
        if (deps['jotai']) {
            results.push({
                type: 'jotai',
                filePath: path.join(root, 'package.json'),
                name: 'Jotai',
            });
        }
    }
    catch {
        // No package.json
    }
    return results;
}
function extractStatePatterns(content, filePath) {
    const patterns = [];
    // useState calls
    const useStatePattern = /\[(\w+),\s*set\w+\]\s*=\s*useState/g;
    let match;
    while ((match = useStatePattern.exec(content)) !== null) {
        patterns.push({
            type: 'useState',
            filePath,
            name: match[1],
        });
    }
    // useReducer calls
    const useReducerPattern = /\[(\w+),\s*dispatch\w*\]\s*=\s*useReducer/g;
    while ((match = useReducerPattern.exec(content)) !== null) {
        patterns.push({
            type: 'useReducer',
            filePath,
            name: match[1],
        });
    }
    // createContext / useContext
    if (content.includes('createContext') || content.includes('useContext')) {
        const contextPattern = /(?:const|let)\s+(\w+)\s*=\s*(?:React\.)?createContext/g;
        while ((match = contextPattern.exec(content)) !== null) {
            patterns.push({
                type: 'context',
                filePath,
                name: match[1],
            });
        }
    }
    // Zustand create() calls
    if (content.includes('create(') && content.includes('zustand')) {
        patterns.push({
            type: 'zustand',
            filePath,
        });
    }
    return patterns;
}
async function findAllTsFiles(root) {
    const fs = await import('fs/promises');
    const path = await import('path');
    const files = [];
    const extensions = ['.ts', '.tsx', '.js', '.jsx'];
    const skipDirs = new Set([
        'node_modules', '.git', '.next', 'dist', 'build', 'coverage',
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
        catch { /* skip */ }
    }
    await walk(root);
    return files;
}
//# sourceMappingURL=scan-state.js.map