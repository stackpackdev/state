export interface AppAnalysis {
    /** Root directory of the app */
    root: string;
    /** Detected framework: 'react', 'next', 'remix', 'vite-react', etc. */
    framework: string;
    /** Components found with their props, state, and children */
    components: ComponentInfo[];
    /** API calls found with their data shapes */
    apis: ApiInfo[];
    /** Routes/pages found */
    routes: RouteInfo[];
    /** Existing state management found */
    existingState: ExistingStateInfo[];
}
export interface ComponentInfo {
    filePath: string;
    name: string;
    props: PropInfo[];
    /** useState, useReducer, useContext calls */
    localState: LocalStateInfo[];
    /** Child components */
    children: string[];
    /** Event handlers (onClick, onChange, onSubmit) */
    handlers: string[];
    /** Whether this component fetches data */
    fetchesData: boolean;
}
export interface PropInfo {
    name: string;
    type?: string;
    required: boolean;
    defaultValue?: string;
}
export interface LocalStateInfo {
    hook: 'useState' | 'useReducer' | 'useContext' | 'useRef';
    name: string;
    initialValue?: string;
    type?: string;
}
export interface ApiInfo {
    filePath: string;
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
    url: string;
    /** Inferred response shape */
    responseShape?: Record<string, string>;
    /** Where this API is called from */
    calledFrom: string[];
}
export interface RouteInfo {
    path: string;
    component: string;
    filePath: string;
    /** Nested routes */
    children?: RouteInfo[];
    /** Whether this route requires auth */
    requiresAuth: boolean;
}
export interface ExistingStateInfo {
    type: 'useState' | 'useReducer' | 'redux' | 'zustand' | 'jotai' | 'context' | 'other';
    filePath: string;
    name?: string;
    shape?: Record<string, string>;
}
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
export declare function analyzeApp(root: string, verbose?: boolean): Promise<AppAnalysis>;
//# sourceMappingURL=index.d.ts.map