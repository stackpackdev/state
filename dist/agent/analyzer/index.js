// App Analyzer — scans a codebase to understand its structure and state needs
// Inspired by morph's parse/index.js which parses .view files into ASTs,
// and process-view-files.js which discovers and maps all view files
import { scanComponents } from './scan-components.js';
import { scanApi } from './scan-api.js';
import { scanRoutes } from './scan-routes.js';
import { scanState } from './scan-state.js';
/**
 * Analyze an app to understand its structure and state needs.
 * This is the entry point for the agent's understanding phase.
 *
 * The analyzer works in 4 parallel passes (like morph's pipeline):
 * 1. Scan components — find all React components, their props, state, children
 * 2. Scan API calls — find fetch/axios calls, data shapes
 * 3. Scan routes — find routing structure (react-router, Next.js pages, etc.)
 * 4. Scan existing state — find useState, Redux, Zustand, etc.
 */
export async function analyzeApp(root, verbose = false) {
    if (verbose)
        console.log(`Scanning ${root}...`);
    // Run all scanners in parallel (like morph's parallel processing in watch.js)
    const [components, apis, routes, existingState] = await Promise.all([
        scanComponents(root, verbose),
        scanApi(root, verbose),
        scanRoutes(root, verbose),
        scanState(root, verbose),
    ]);
    // Detect framework from package.json
    const framework = await detectFramework(root);
    if (verbose) {
        console.log(`Found ${components.length} components`);
        console.log(`Found ${apis.length} API calls`);
        console.log(`Found ${routes.length} routes`);
        console.log(`Found ${existingState.length} existing state patterns`);
    }
    return {
        root,
        framework,
        components,
        apis,
        routes,
        existingState,
    };
}
async function detectFramework(root) {
    try {
        const fs = await import('fs/promises');
        const path = await import('path');
        const pkgJson = JSON.parse(await fs.readFile(path.join(root, 'package.json'), 'utf-8'));
        const deps = {
            ...pkgJson.dependencies,
            ...pkgJson.devDependencies,
        };
        if (deps['next'])
            return 'next';
        if (deps['@remix-run/react'])
            return 'remix';
        if (deps['gatsby'])
            return 'gatsby';
        if (deps['vite'] && deps['react'])
            return 'vite-react';
        if (deps['react-scripts'])
            return 'create-react-app';
        if (deps['react'])
            return 'react';
        return 'unknown';
    }
    catch {
        return 'unknown';
    }
}
//# sourceMappingURL=index.js.map