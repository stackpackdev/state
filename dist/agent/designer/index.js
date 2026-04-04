// State Designer — reasons about app analysis using Together/Separate/When/Gate
// This is where the agent's intelligence lives.
// The designer takes analysis results and produces a state architecture.
//
// v2 changes (agent-optimized):
// - Consumption-based grouping replaces similarity-based grouping
// - `when` (style-edge) vs `gate` (mount-edge) distinction
// - Hierarchical flow with nested sub-flows
// - Store dependency graph for impact analysis
// - Path schemas for deterministic traversal
import { buildConsumptionGroups } from './consumption-graph.js';
/**
 * Design state architecture from app analysis.
 * Uses Together/Separate/When/Gate primitives to reason about state.
 *
 * Together: What data moves as a unit? (consumption-based grouping)
 * Separate: What should be independent? (domain-based separation)
 * When: What conditions change appearance? (style-edge predicates)
 * Gate: What conditions control mounting? (mount-edge predicates)
 */
export async function designState(analysis, feature) {
    const stores = [];
    const flows = [];
    const groups = [];
    // ─── SEPARATE: Identify independent state domains ──────────
    // 1. Auth state (if any component checks auth)
    const hasAuth = analysis.components.some(c => c.handlers.includes('onLogin') ||
        c.handlers.includes('onLogout') ||
        c.localState.some(s => s.name === 'user' || s.name === 'isAuthenticated'));
    if (hasAuth) {
        stores.push({
            name: 'auth',
            description: 'Authentication state',
            shape: {
                user: { type: 'User | null', defaultValue: 'null', nullable: true },
                isAuthenticated: { type: 'boolean', defaultValue: 'false', nullable: false },
                isLoading: { type: 'boolean', defaultValue: 'true', nullable: false },
            },
            // When: style-edge (appearance changes)
            when: {
                isLoading: 'state.isLoading === true',
            },
            // Gate: mount-edge (controls component mounting)
            gates: {
                isAuthenticated: 'state.isAuthenticated === true',
                isGuest: 'state.user === null',
            },
            validation: {},
            usedBy: analysis.components
                .filter(c => c.localState.some(s => s.name === 'user'))
                .map(c => c.name),
            dependencies: { reads: [], gatedBy: [], triggers: [] },
            pathSchema: {
                'user': { type: 'object', nullable: true, fields: ['id', 'name', 'email'] },
                'isAuthenticated': { type: 'boolean' },
                'isLoading': { type: 'boolean' },
            },
            reasoning: 'Auth state is separate — it gates the entire app but changes independently.',
        });
    }
    // 2. Route/navigation flow (if routes exist)
    if (analysis.routes.length > 0) {
        const flowDesign = buildHierarchicalFlow(analysis);
        flows.push(flowDesign);
    }
    // ─── TOGETHER: Group related state ─────────────────────────
    // 3. For each API call, create a store with loading/error/data
    // Deduplicate by store name (multiple calls to /posts become one store)
    const apiStoresSeen = new Set();
    for (const api of analysis.apis) {
        const storeName = inferStoreNameFromUrl(api.url);
        if (apiStoresSeen.has(storeName)) {
            // Merge calledFrom into existing store
            const existing = stores.find(s => s.name === storeName);
            if (existing) {
                const newCallers = api.calledFrom.map(f => f.split('/').pop() || f);
                existing.usedBy = [...new Set([...existing.usedBy, ...newCallers])];
            }
            continue;
        }
        apiStoresSeen.add(storeName);
        stores.push({
            name: storeName,
            description: `Server state for ${api.url.split('?')[0]}`,
            shape: {
                data: { type: 'any', defaultValue: 'null', nullable: true },
                isLoading: { type: 'boolean', defaultValue: 'false', nullable: false },
                error: { type: 'Error | null', defaultValue: 'null', nullable: true },
            },
            // When: style-edge (loading spinner, error message styling)
            when: {
                isLoading: 'state.isLoading === true',
                hasError: 'state.error !== null',
            },
            // Gate: mount-edge (don't render content until data exists)
            gates: {
                hasData: 'state.data !== null',
                isEmpty: 'state.data === null || (Array.isArray(state.data) && state.data.length === 0)',
            },
            validation: {},
            usedBy: api.calledFrom.map(f => f.split('/').pop() || f),
            dependencies: {
                reads: [],
                gatedBy: hasAuth ? ['auth'] : [], // API stores are typically gated by auth
                triggers: [],
            },
            pathSchema: {
                'data': { type: 'any', nullable: true },
                'isLoading': { type: 'boolean' },
                'error': { type: 'object', nullable: true },
            },
            reasoning: `API data + loading + error move together — "Together" principle from Views DataProvider.`,
        });
    }
    // ─── WHEN/GATE: Infer conditional states ─────────────────
    // 4. Detect form components FIRST (before consumption-based grouping)
    // so they get their own dedicated stores
    const formComponents = new Set();
    for (const component of analysis.components) {
        if (component.handlers.includes('onSubmit')) {
            formComponents.add(component.name);
            const formFields = {};
            const formSchema = {};
            for (const state of component.localState) {
                formFields[state.name] = {
                    type: state.type || 'string',
                    defaultValue: state.initialValue || "''",
                    nullable: false,
                };
                formSchema[state.name] = {
                    type: inferSchemaType(state.type || 'string'),
                };
            }
            formSchema['isSubmitting'] = { type: 'boolean' };
            formSchema['errors'] = { type: 'object' };
            stores.push({
                name: `${camelCase(component.name)}Form`,
                description: `Form state for ${component.name}`,
                shape: {
                    ...formFields,
                    isSubmitting: { type: 'boolean', defaultValue: 'false', nullable: false },
                    errors: { type: 'Record<string, string>', defaultValue: '{}', nullable: false },
                },
                // When: style-edge (form field highlighting, button disabled state)
                when: {
                    isSubmitting: 'state.isSubmitting === true',
                    hasErrors: 'Object.keys(state.errors).length > 0',
                    isValid: 'Object.keys(state.errors).length === 0',
                },
                // Gate: no mount-edge conditions for forms (form always renders)
                gates: {},
                validation: Object.fromEntries(Object.keys(formFields).map(key => [key, `value !== ''`])),
                usedBy: [component.name],
                dependencies: { reads: [], gatedBy: [], triggers: [] },
                pathSchema: formSchema,
                reasoning: `Form component with onSubmit — "When" conditions for submission and validation states.`,
            });
        }
    }
    // 5. Consumption-based grouping for non-form, non-API, non-auth components
    // Uses bipartite graph + union-find instead of name-similarity matching
    //
    // Filter out:
    // - Form components (already have dedicated stores)
    // - State variables that are already captured by auth/API stores
    //   (isLoading, user, isAuthenticated, data, error = common API/auth patterns)
    const coveredStateNames = new Set([
        // Auth state
        'user', 'isAuthenticated',
        // API state patterns (data/loading/error is a Together group handled by API stores)
        'isLoading', 'error',
    ]);
    const nonFormComponents = analysis.components
        .filter(c => !formComponents.has(c.name))
        .map(c => ({
        ...c,
        // Strip out state variables already covered by API or auth stores
        localState: c.localState.filter(s => !coveredStateNames.has(s.name)),
    }))
        .filter(c => c.localState.length > 0); // Only keep components with remaining state
    const consumptionGroups = buildConsumptionGroups(nonFormComponents);
    for (const group of consumptionGroups) {
        const shape = {};
        const schema = {};
        const when = {};
        const gates = {};
        for (const stateItem of group.state) {
            shape[stateItem.name] = {
                type: stateItem.type || 'any',
                defaultValue: stateItem.initialValue || 'null',
                nullable: true,
            };
            schema[stateItem.name] = {
                type: inferSchemaType(stateItem.type || 'any'),
                nullable: true,
            };
            // Classify conditions: when (style-edge) vs gate (mount-edge)
            classifyConditions(stateItem, when, gates);
        }
        if (Object.keys(shape).length > 0) {
            stores.push({
                name: group.name,
                description: `State for ${group.components.join(', ')}`,
                shape,
                when,
                gates,
                validation: {},
                usedBy: group.components,
                dependencies: { reads: [], gatedBy: [], triggers: [] },
                pathSchema: schema,
                reasoning: `Components ${group.components.join(', ')} consume this state together — consumption-based grouping.`,
            });
        }
    }
    // ─── FEATURE: If adding a new feature, infer its state ─────
    if (feature) {
        const featureDesign = designFeatureState(feature);
        stores.push(...featureDesign.stores);
        flows.push(...featureDesign.flows);
    }
    // ─── DEPENDENCIES: Infer store-to-store relationships ──────
    inferStoreDependencies(stores, analysis);
    // ─── Group stores into "Together" bundles ──────────────────
    if (stores.length > 2) {
        groups.push({
            name: 'app',
            stores: stores.map(s => s.name),
            flow: flows[0]?.name,
            reasoning: 'All stores grouped at the app level for provider wrapping.',
        });
    }
    return {
        stores,
        flows,
        groups,
        feature,
    };
}
// ─── Hierarchical Flow Builder ──────────────────────────────
function buildHierarchicalFlow(analysis) {
    // Build route tree from flat routes
    const topLevelRoutes = [];
    const nestedRoutes = {};
    for (const route of analysis.routes) {
        const routeName = route.path === '/'
            ? 'Home'
            : route.component || route.path.replace(/\//g, '');
        const name = routeName.charAt(0).toUpperCase() + routeName.slice(1);
        // Check for nested routes
        if (route.children && route.children.length > 0) {
            topLevelRoutes.push(name);
            nestedRoutes[name] = route.children.map(child => {
                const childName = child.component || child.path.replace(/.*\//, '');
                return childName.charAt(0).toUpperCase() + childName.slice(1);
            });
        }
        else {
            topLevelRoutes.push(name);
        }
    }
    // Build the flow tree
    const children = {};
    for (const [parentState, childStates] of Object.entries(nestedRoutes)) {
        if (childStates.length > 0) {
            children[parentState] = {
                name: camelCase(parentState),
                mode: 'separate',
                states: childStates,
                initial: childStates[0],
                reasoning: `Sub-navigation for ${parentState} section.`,
            };
        }
    }
    // Use the Home route (/) as initial, or fall back to first route
    const homeRoute = analysis.routes.find(r => r.path === '/');
    const initialState = homeRoute ? 'Home' : topLevelRoutes[0];
    return {
        name: 'navigation',
        mode: 'separate',
        states: topLevelRoutes,
        initial: initialState,
        children: Object.keys(children).length > 0 ? children : undefined,
        reasoning: `App has ${analysis.routes.length} routes — navigation modeled as hierarchical flow.`,
    };
}
// ─── Condition Classification ───────────────────────────────
// Classify state conditions as when (style-edge) vs gate (mount-edge)
function classifyConditions(stateItem, when, gates) {
    const { name, type, initialValue } = stateItem;
    // Boolean fields: classify based on naming patterns
    if (type?.includes('boolean') || initialValue === 'false' || initialValue === 'true') {
        const conditionName = `is${name.charAt(0).toUpperCase() + name.slice(1)}`;
        // Gate patterns: conditions that control component mounting
        if (name === 'isAuthenticated' ||
            name === 'isLoaded' ||
            name === 'isReady' ||
            name === 'isVisible' ||
            name === 'isOpen' ||
            name === 'isShowing' ||
            name === 'isEnabled') {
            gates[conditionName] = `state.${name} === true`;
        }
        else {
            // When patterns: conditions that change appearance
            when[conditionName] = `state.${name} === true`;
        }
    }
    // Nullable fields: gate pattern (content renders only when data exists)
    if (type?.includes('null') || initialValue === 'null') {
        gates[`has${name.charAt(0).toUpperCase() + name.slice(1)}`] = `state.${name} !== null`;
    }
    // Array fields: both when and gate
    if (type?.includes('[]') || initialValue === '[]') {
        when[`has${name.charAt(0).toUpperCase() + name.slice(1)}`] = `state.${name}.length > 0`;
        gates[`isEmpty${name.charAt(0).toUpperCase() + name.slice(1)}`] = `state.${name}.length === 0`;
    }
}
// ─── Store Dependency Inference ─────────────────────────────
// Build the dependency graph between stores for agent impact analysis
function inferStoreDependencies(stores, analysis) {
    const storeNames = new Set(stores.map(s => s.name));
    // Build: component → stores it uses
    const componentToStores = new Map();
    for (const store of stores) {
        for (const comp of store.usedBy) {
            if (!componentToStores.has(comp)) {
                componentToStores.set(comp, []);
            }
            componentToStores.get(comp).push(store.name);
        }
    }
    // For each store, find what other stores share components with it
    for (const store of stores) {
        const colocatedStores = new Set();
        for (const comp of store.usedBy) {
            const otherStores = componentToStores.get(comp) || [];
            for (const other of otherStores) {
                if (other !== store.name) {
                    colocatedStores.add(other);
                }
            }
        }
        // Stores with gates that wrap components using this store → gatedBy
        for (const other of colocatedStores) {
            const otherStore = stores.find(s => s.name === other);
            if (otherStore && Object.keys(otherStore.gates).length > 0) {
                if (!store.dependencies.gatedBy.includes(other)) {
                    store.dependencies.gatedBy.push(other);
                }
            }
        }
        // Auth gates everything — special case
        if (store.name !== 'auth' && storeNames.has('auth')) {
            // Check if any component using this store is in an auth-gated route
            const authGatedComponents = analysis.routes
                .filter(r => r.requiresAuth)
                .map(r => r.component);
            const isGatedByAuth = store.usedBy.some(comp => authGatedComponents.includes(comp));
            if (isGatedByAuth && !store.dependencies.gatedBy.includes('auth')) {
                store.dependencies.gatedBy.push('auth');
            }
        }
        // API stores trigger refresh when auth changes (common pattern)
        if (store.shape.data && store.shape.isLoading && storeNames.has('auth')) {
            if (!store.dependencies.triggers.includes('auth')) {
                store.dependencies.triggers.push('auth');
            }
        }
    }
}
// ─── Schema Type Inference ──────────────────────────────────
function inferSchemaType(tsType) {
    if (tsType.includes('[]'))
        return 'array';
    if (tsType.includes('boolean'))
        return 'boolean';
    if (tsType.includes('number'))
        return 'number';
    if (tsType.includes('string') && !tsType.includes('|'))
        return 'string';
    if (tsType.includes('|'))
        return 'union';
    if (tsType === 'any')
        return 'any';
    return 'object';
}
const emptyDeps = { reads: [], gatedBy: [], triggers: [] };
const FEATURE_TEMPLATES = [
    {
        keywords: ['cart', 'shopping', 'basket'],
        stores: [
            {
                name: 'cart',
                description: 'Shopping cart state',
                shape: {
                    items: { type: 'CartItem[]', defaultValue: '[]', nullable: false },
                    total: { type: 'number', defaultValue: '0', nullable: false },
                    itemCount: { type: 'number', defaultValue: '0', nullable: false },
                    isOpen: { type: 'boolean', defaultValue: 'false', nullable: false },
                },
                when: {
                    hasItems: 'state.items.length > 0',
                },
                gates: {
                    isEmpty: 'state.items.length === 0',
                    isOpen: 'state.isOpen === true',
                },
                validation: { 'items.*.quantity': 'value > 0' },
                usedBy: [],
                dependencies: emptyDeps,
                pathSchema: {
                    'items': { type: 'array' },
                    'items.*': { type: 'object', fields: ['id', 'name', 'price', 'quantity'] },
                    'items.*.id': { type: 'string' },
                    'items.*.name': { type: 'string' },
                    'items.*.price': { type: 'number' },
                    'items.*.quantity': { type: 'number', validation: 'value > 0' },
                    'total': { type: 'number' },
                    'itemCount': { type: 'number' },
                    'isOpen': { type: 'boolean' },
                },
                reasoning: 'Cart items + total + count move together. Separate from checkout flow.',
            },
        ],
        flows: [],
    },
    {
        keywords: ['checkout', 'purchase', 'payment'],
        stores: [
            {
                name: 'shipping',
                description: 'Shipping information for checkout',
                shape: {
                    address: { type: 'string', defaultValue: "''", nullable: false },
                    city: { type: 'string', defaultValue: "''", nullable: false },
                    zip: { type: 'string', defaultValue: "''", nullable: false },
                    method: { type: "'standard' | 'express'", defaultValue: "'standard'", nullable: false },
                },
                when: {},
                gates: {
                    isComplete: "state.address !== '' && state.city !== '' && state.zip !== ''",
                },
                validation: {
                    address: "value !== ''",
                    city: "value !== ''",
                    zip: "value.length >= 5",
                },
                usedBy: [],
                dependencies: { reads: ['cart'], gatedBy: [], triggers: [] },
                pathSchema: {
                    'address': { type: 'string' },
                    'city': { type: 'string' },
                    'zip': { type: 'string' },
                    'method': { type: 'string', values: ['standard', 'express'] },
                },
                reasoning: 'Shipping fields move together — "Together" principle.',
            },
            {
                name: 'payment',
                description: 'Payment state for checkout',
                shape: {
                    method: { type: "'card' | 'paypal' | null", defaultValue: 'null', nullable: true },
                    isProcessing: { type: 'boolean', defaultValue: 'false', nullable: false },
                    error: { type: 'string | null', defaultValue: 'null', nullable: true },
                    orderId: { type: 'string | null', defaultValue: 'null', nullable: true },
                },
                when: {
                    isProcessing: 'state.isProcessing === true',
                },
                gates: {
                    hasError: 'state.error !== null',
                    isComplete: 'state.orderId !== null',
                    hasMethod: 'state.method !== null',
                },
                validation: {},
                usedBy: [],
                dependencies: { reads: ['cart', 'shipping'], gatedBy: ['shipping'], triggers: [] },
                pathSchema: {
                    'method': { type: 'string', nullable: true, values: ['card', 'paypal'] },
                    'isProcessing': { type: 'boolean' },
                    'error': { type: 'string', nullable: true },
                    'orderId': { type: 'string', nullable: true },
                },
                reasoning: 'Payment method + processing + error are a "Together" group.',
            },
        ],
        flows: [
            {
                name: 'checkout',
                mode: 'separate',
                states: ['Cart', 'Shipping', 'Payment', 'Confirmation'],
                initial: 'Cart',
                reasoning: 'Checkout is a multi-step flow — modeled as a state machine.',
            },
        ],
    },
    {
        keywords: ['search', 'filter', 'query'],
        stores: [
            {
                name: 'search',
                description: 'Search and filter state',
                shape: {
                    query: { type: 'string', defaultValue: "''", nullable: false },
                    results: { type: 'any[]', defaultValue: '[]', nullable: false },
                    isSearching: { type: 'boolean', defaultValue: 'false', nullable: false },
                    filters: { type: 'Record<string, string>', defaultValue: '{}', nullable: false },
                },
                when: {
                    isSearching: 'state.isSearching === true',
                    hasQuery: "state.query !== ''",
                    hasFilters: 'Object.keys(state.filters).length > 0',
                },
                gates: {
                    hasResults: 'state.results.length > 0',
                    isEmpty: "state.query !== '' && state.results.length === 0 && !state.isSearching",
                },
                validation: {},
                usedBy: [],
                dependencies: emptyDeps,
                pathSchema: {
                    'query': { type: 'string' },
                    'results': { type: 'array' },
                    'isSearching': { type: 'boolean' },
                    'filters': { type: 'object' },
                },
                reasoning: 'Search query + results + loading move together.',
            },
        ],
        flows: [],
    },
    {
        keywords: ['settings', 'preferences', 'config'],
        stores: [
            {
                name: 'settings',
                description: 'User preferences and settings',
                shape: {
                    theme: { type: "'light' | 'dark'", defaultValue: "'light'", nullable: false },
                    language: { type: 'string', defaultValue: "'en'", nullable: false },
                    notifications: { type: 'boolean', defaultValue: 'true', nullable: false },
                    isSaving: { type: 'boolean', defaultValue: 'false', nullable: false },
                },
                when: {
                    isDark: "state.theme === 'dark'",
                    isSaving: 'state.isSaving === true',
                    notificationsEnabled: 'state.notifications === true',
                },
                gates: {},
                validation: {},
                usedBy: [],
                dependencies: emptyDeps,
                pathSchema: {
                    'theme': { type: 'string', values: ['light', 'dark'] },
                    'language': { type: 'string' },
                    'notifications': { type: 'boolean' },
                    'isSaving': { type: 'boolean' },
                },
                reasoning: 'User settings are separate from app state — "Separate" principle.',
            },
        ],
        flows: [],
    },
    {
        keywords: ['notification', 'alert', 'toast', 'message'],
        stores: [
            {
                name: 'notifications',
                description: 'In-app notification state',
                shape: {
                    items: { type: 'Notification[]', defaultValue: '[]', nullable: false },
                    unreadCount: { type: 'number', defaultValue: '0', nullable: false },
                },
                when: {
                    hasUnread: 'state.unreadCount > 0',
                },
                gates: {
                    hasNotifications: 'state.items.length > 0',
                    isEmpty: 'state.items.length === 0',
                },
                validation: {},
                usedBy: [],
                dependencies: emptyDeps,
                pathSchema: {
                    'items': { type: 'array' },
                    'items.*': { type: 'object', fields: ['id', 'message', 'read', 'timestamp'] },
                    'unreadCount': { type: 'number' },
                },
                reasoning: 'Notifications + unread count are a "Together" group.',
            },
        ],
        flows: [],
    },
    {
        keywords: ['modal', 'dialog', 'popup', 'overlay'],
        stores: [
            {
                name: 'modal',
                description: 'Modal/dialog state',
                shape: {
                    isOpen: { type: 'boolean', defaultValue: 'false', nullable: false },
                    content: { type: 'string | null', defaultValue: 'null', nullable: true },
                    type: { type: 'string | null', defaultValue: 'null', nullable: true },
                },
                when: {},
                gates: {
                    isOpen: 'state.isOpen === true',
                    hasContent: 'state.content !== null',
                },
                validation: {},
                usedBy: [],
                dependencies: emptyDeps,
                pathSchema: {
                    'isOpen': { type: 'boolean' },
                    'content': { type: 'string', nullable: true },
                    'type': { type: 'string', nullable: true },
                },
                reasoning: 'Modal open/close + content are a "Together" group.',
            },
        ],
        flows: [],
    },
];
/**
 * Design state for a new feature based on its description.
 * Uses keyword matching against feature templates.
 * Multiple templates can match (e.g., "shopping cart with checkout" matches both cart and checkout).
 */
function designFeatureState(feature) {
    const featureLower = feature.toLowerCase();
    const stores = [];
    const flows = [];
    const matchedTemplates = new Set();
    for (const template of FEATURE_TEMPLATES) {
        if (template.keywords.some(kw => featureLower.includes(kw))) {
            for (const store of template.stores) {
                if (!matchedTemplates.has(store.name)) {
                    matchedTemplates.add(store.name);
                    stores.push({ ...store });
                }
            }
            flows.push(...template.flows);
        }
    }
    // If no template matched, create a generic feature store from the feature name
    if (stores.length === 0) {
        const storeName = camelCase(feature.split(/\s+/).slice(0, 3).join(' '));
        stores.push({
            name: storeName,
            description: `State for ${feature}`,
            shape: {
                data: { type: 'any', defaultValue: 'null', nullable: true },
                isLoading: { type: 'boolean', defaultValue: 'false', nullable: false },
                error: { type: 'string | null', defaultValue: 'null', nullable: true },
            },
            when: {
                isLoading: 'state.isLoading === true',
            },
            gates: {
                hasError: 'state.error !== null',
                hasData: 'state.data !== null',
            },
            validation: {},
            usedBy: [],
            dependencies: emptyDeps,
            pathSchema: {
                'data': { type: 'any', nullable: true },
                'isLoading': { type: 'boolean' },
                'error': { type: 'string', nullable: true },
            },
            reasoning: `Feature store for "${feature}" — uses generic data/loading/error pattern.`,
        });
    }
    return { stores, flows };
}
// ─── Helpers ─────────────────────────────────────────────────
function inferStoreNameFromUrl(url) {
    // Strip query params, hash, and protocol/host
    const cleanUrl = url.split('?')[0].split('#')[0];
    const segments = cleanUrl.split('/').filter(s => s && !s.startsWith(':') && !s.startsWith('[') && !s.includes('.'));
    const last = segments[segments.length - 1] || 'api';
    return camelCase(last);
}
function camelCase(str) {
    return str
        .replace(/[-_\s]+(.)?/g, (_, c) => (c ? c.toUpperCase() : ''))
        .replace(/^./, c => c.toLowerCase());
}
//# sourceMappingURL=index.js.map