import type { StateDesign } from '../designer/index.js';
interface GenerateOptions {
    typesOnly?: boolean;
}
/**
 * Generate TypeScript files from a state design.
 * Creates store definitions, hooks, types, and providers.
 */
export declare function generateCode(design: StateDesign, root: string, options?: GenerateOptions): Promise<string[]>;
export {};
//# sourceMappingURL=index.d.ts.map