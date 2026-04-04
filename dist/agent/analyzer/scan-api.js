// Scan API calls — find fetch/axios calls and data shapes
// Identifies what server state the app needs
export async function scanApi(root, verbose = false) {
    const fs = await import('fs/promises');
    const path = await import('path');
    const apis = [];
    const tsFiles = await findTsFiles(root);
    for (const filePath of tsFiles) {
        try {
            const content = await fs.readFile(filePath, 'utf-8');
            const extracted = extractApiCalls(content, filePath);
            apis.push(...extracted);
            if (verbose && extracted.length > 0) {
                console.log(`  Found ${extracted.length} API call(s) in ${path.relative(root, filePath)}`);
            }
        }
        catch {
            // Skip files that can't be read
        }
    }
    return apis;
}
function extractApiCalls(content, filePath) {
    const apis = [];
    // Match fetch calls: fetch('url'), fetch(`url`), fetch(URL)
    const fetchPattern = /fetch\(\s*[`'"](\/[^`'"]+|https?:\/\/[^`'"]+)[`'"]/g;
    let match;
    while ((match = fetchPattern.exec(content)) !== null) {
        const url = match[1];
        const method = inferMethod(content, match.index);
        apis.push({
            filePath,
            method,
            url,
            calledFrom: [filePath],
        });
    }
    // Match axios calls: axios.get('url'), axios.post('url')
    const axiosPattern = /axios\.(get|post|put|delete|patch)\(\s*[`'"](\/[^`'"]+|https?:\/\/[^`'"]+)[`'"]/g;
    while ((match = axiosPattern.exec(content)) !== null) {
        apis.push({
            filePath,
            method: match[1].toUpperCase(),
            url: match[2],
            calledFrom: [filePath],
        });
    }
    return apis;
}
function inferMethod(content, fetchIndex) {
    // Look backwards from the fetch call for method specification
    const surroundingCode = content.substring(Math.max(0, fetchIndex - 200), fetchIndex + 200);
    if (/method:\s*['"]POST['"]/i.test(surroundingCode))
        return 'POST';
    if (/method:\s*['"]PUT['"]/i.test(surroundingCode))
        return 'PUT';
    if (/method:\s*['"]DELETE['"]/i.test(surroundingCode))
        return 'DELETE';
    if (/method:\s*['"]PATCH['"]/i.test(surroundingCode))
        return 'PATCH';
    return 'GET';
}
async function findTsFiles(root) {
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
//# sourceMappingURL=scan-api.js.map