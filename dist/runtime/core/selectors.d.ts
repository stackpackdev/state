import { z } from 'zod';
export type SelectorNode<V = any> = {
    $path: string;
    $select: (state: any) => V;
};
export type SelectorTree<T> = {
    [K in keyof T]: T[K] extends Record<string, any> ? SelectorTree<T[K]> & SelectorNode<T[K]> : SelectorNode<T[K]>;
};
/**
 * Build a selector tree from a Zod schema.
 * Walks the schema shape recursively, creating nodes with $path and $select.
 *
 * - ZodObject: recurse into shape keys
 * - ZodArray: single selector for the whole array (no per-item recursion)
 * - ZodDiscriminatedUnion: selector for the discriminant field only
 * - Primitives: leaf selector node
 */
export declare function buildSelectorTree<T>(schema: z.ZodType<T>, prefix?: string): SelectorTree<T>;
//# sourceMappingURL=selectors.d.ts.map