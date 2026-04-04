import type { ZodType } from 'zod';
import type { Actor, Store } from './types.js';
export interface MigrationPlan {
    /** Add new fields with schema and default value */
    add?: Record<string, {
        schema: ZodType;
        default: unknown;
    }>;
    /** Remove fields by path */
    remove?: string[];
    /** Rename fields: old path -> new path */
    rename?: Record<string, string>;
    /** Transform field values */
    transform?: Record<string, (value: unknown) => unknown>;
}
export interface MigrationResult {
    success: boolean;
    errors: string[];
}
/**
 * Apply a migration plan to a store's state.
 *
 * Operations are applied in order: rename → transform → remove → add.
 * If the store has a Zod schema, the migrated state is validated before committing.
 * On validation failure, the store is left unchanged and errors are returned.
 */
export declare function applyMigration<T>(store: Store<T>, plan: MigrationPlan, actor: Actor): MigrationResult;
//# sourceMappingURL=migrate.d.ts.map