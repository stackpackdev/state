// Scan routes — find navigation structure
// Inspired by Flow.js which represents navigation as tree-like state
export async function scanRoutes(root, verbose = false) {
    const fs = await import('fs/promises');
    const path = await import('path');
    const routes = [];
    // Check if Next.js is a dependency before using file-based route detection
    const isNextJs = await hasNextDependency(root);
    if (isNextJs) {
        // Strategy 1: Next.js app directory
        const appDir = path.join(root, 'app');
        const srcAppDir = path.join(root, 'src', 'app');
        for (const dir of [appDir, srcAppDir]) {
            try {
                await fs.access(dir);
                const nextRoutes = await scanNextAppRoutes(dir, '/');
                routes.push(...nextRoutes);
                if (verbose)
                    console.log(`  Found Next.js app routes in ${path.relative(root, dir)}`);
                return routes;
            }
            catch { /* not found */ }
        }
        // Strategy 2: Next.js pages directory
        const pagesDir = path.join(root, 'pages');
        const srcPagesDir = path.join(root, 'src', 'pages');
        for (const dir of [pagesDir, srcPagesDir]) {
            try {
                await fs.access(dir);
                const nextRoutes = await scanNextPagesRoutes(dir, '/');
                routes.push(...nextRoutes);
                if (verbose)
                    console.log(`  Found Next.js pages routes in ${path.relative(root, dir)}`);
                return routes;
            }
            catch { /* not found */ }
        }
    }
    // Strategy 3: Scan for react-router Route definitions
    const tsxFiles = await findTsxFiles(root);
    for (const filePath of tsxFiles) {
        try {
            const content = await fs.readFile(filePath, 'utf-8');
            if (content.includes('<Route') || content.includes('createBrowserRouter')) {
                const extracted = extractReactRouterRoutes(content, filePath);
                routes.push(...extracted);
                if (verbose && extracted.length > 0) {
                    console.log(`  Found ${extracted.length} route(s) in ${path.relative(root, filePath)}`);
                }
            }
        }
        catch { /* skip */ }
    }
    return routes;
}
async function hasNextDependency(root) {
    try {
        const fs = await import('fs/promises');
        const path = await import('path');
        const pkgJson = JSON.parse(await fs.readFile(path.join(root, 'package.json'), 'utf-8'));
        const deps = { ...pkgJson.dependencies, ...pkgJson.devDependencies };
        return 'next' in deps;
    }
    catch {
        return false;
    }
}
async function scanNextAppRoutes(dir, basePath) {
    const fs = await import('fs/promises');
    const path = await import('path');
    const routes = [];
    try {
        const entries = await fs.readdir(dir, { withFileTypes: true });
        const hasPage = entries.some(e => e.name.startsWith('page.'));
        const hasLayout = entries.some(e => e.name.startsWith('layout.'));
        if (hasPage) {
            const pageFile = entries.find(e => e.name.startsWith('page.'));
            routes.push({
                path: basePath,
                component: `Page`,
                filePath: path.join(dir, pageFile.name),
                requiresAuth: false,
            });
        }
        for (const entry of entries) {
            if (entry.isDirectory() && !entry.name.startsWith('_') && !entry.name.startsWith('.')) {
                const childPath = entry.name.startsWith('[')
                    ? `${basePath === '/' ? '' : basePath}/:${entry.name.replace(/[\[\]]/g, '')}`
                    : `${basePath === '/' ? '' : basePath}/${entry.name}`;
                const childRoutes = await scanNextAppRoutes(path.join(dir, entry.name), childPath);
                routes.push(...childRoutes);
            }
        }
    }
    catch { /* skip */ }
    return routes;
}
async function scanNextPagesRoutes(dir, basePath) {
    const fs = await import('fs/promises');
    const path = await import('path');
    const routes = [];
    try {
        const entries = await fs.readdir(dir, { withFileTypes: true });
        for (const entry of entries) {
            if (entry.name.startsWith('_') || entry.name.startsWith('.'))
                continue;
            if (entry.isDirectory()) {
                const childRoutes = await scanNextPagesRoutes(path.join(dir, entry.name), `${basePath === '/' ? '' : basePath}/${entry.name}`);
                routes.push(...childRoutes);
            }
            else if (/\.(tsx?|jsx?)$/.test(entry.name)) {
                const name = entry.name.replace(/\.(tsx?|jsx?)$/, '');
                const routePath = name === 'index'
                    ? basePath
                    : `${basePath === '/' ? '' : basePath}/${name}`;
                routes.push({
                    path: routePath,
                    component: name,
                    filePath: path.join(dir, entry.name),
                    requiresAuth: false,
                });
            }
        }
    }
    catch { /* skip */ }
    return routes;
}
function extractReactRouterRoutes(content, filePath) {
    const routes = [];
    // Match <Route path="..." component={...} /> or element={<.../>}
    const routePattern = /<Route\s+[^>]*path=["']([^"']+)["'][^>]*(?:component=\{(\w+)\}|element=\{<(\w+))/g;
    let match;
    while ((match = routePattern.exec(content)) !== null) {
        routes.push({
            path: match[1],
            component: match[2] || match[3],
            filePath,
            requiresAuth: false,
        });
    }
    return routes;
}
async function findTsxFiles(root) {
    const fs = await import('fs/promises');
    const path = await import('path');
    const files = [];
    const skipDirs = new Set(['node_modules', '.git', '.next', 'dist', 'build']);
    async function walk(dir) {
        try {
            const entries = await fs.readdir(dir, { withFileTypes: true });
            for (const entry of entries) {
                if (entry.isDirectory() && !skipDirs.has(entry.name) && !entry.name.startsWith('.')) {
                    await walk(path.join(dir, entry.name));
                }
                else if (/\.(tsx|jsx)$/.test(entry.name)) {
                    files.push(path.join(dir, entry.name));
                }
            }
        }
        catch { /* skip */ }
    }
    await walk(root);
    return files;
}
//# sourceMappingURL=scan-routes.js.map