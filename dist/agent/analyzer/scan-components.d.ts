import type { ComponentInfo } from './index.js';
/**
 * Scan the codebase for React components.
 * Uses pattern matching on file contents to extract component info.
 * In the full agent, this delegates to the LLM for deeper understanding.
 */
export declare function scanComponents(root: string, verbose?: boolean): Promise<ComponentInfo[]>;
//# sourceMappingURL=scan-components.d.ts.map