/**
 * Get a value at a dot-path from an object.
 * Supports: 'a.b.c', 'items.0.text', 'deeply.nested.path'
 */
export declare function getPath(obj: any, path?: string): any;
/**
 * Set a value at a dot-path on an object (mutates — use inside Immer produce).
 * Creates intermediate objects/arrays as needed.
 */
export declare function setPath(obj: any, path: string, value: unknown): void;
/**
 * Delete a value at a dot-path on an object (mutates — use inside Immer produce).
 */
export declare function deletePath(obj: any, path: string): void;
/**
 * Check if a path exists and has a value in an object.
 */
export declare function hasPath(obj: any, path: string): boolean;
/**
 * Simple glob pattern match for permission paths.
 * Supports: '*' (match everything), 'todos.*' (match todos subtree)
 */
export declare function matchPath(pattern: string, path: string): boolean;
//# sourceMappingURL=path.d.ts.map