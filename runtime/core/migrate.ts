// Schema migrations: apply structured migration plans to store state
// Standalone utility — does not modify store.ts or types.ts

import type { ZodType } from 'zod'
import type { Actor, Store } from './types.js'

// ─── Types ──────────────────────────────────────────────────

export interface MigrationPlan {
  /** Add new fields with schema and default value */
  add?: Record<string, { schema: ZodType; default: unknown }>
  /** Remove fields by path */
  remove?: string[]
  /** Rename fields: old path -> new path */
  rename?: Record<string, string>
  /** Transform field values */
  transform?: Record<string, (value: unknown) => unknown>
}

export interface MigrationResult {
  success: boolean
  errors: string[]
}

// ─── Internal path helpers (plain JS, no Immer) ─────────────

function getNestedValue(obj: any, path: string): any {
  return path.split('.').reduce((o, k) => o?.[k], obj)
}

function setNestedValue(obj: any, path: string, value: any): void {
  const parts = path.split('.')
  const last = parts.pop()!
  const target = parts.reduce((o, k) => ((o[k] = o[k] ?? {}), o[k]), obj)
  target[last] = value
}

function deleteNestedValue(obj: any, path: string): void {
  const parts = path.split('.')
  const last = parts.pop()!
  const target = parts.reduce((o, k) => o?.[k], obj)
  if (target && typeof target === 'object') {
    delete target[last]
  }
}

// ─── Public API ─────────────────────────────────────────────

/**
 * Apply a migration plan to a store's state.
 *
 * Operations are applied in order: rename → transform → remove → add.
 * If the store has a Zod schema, the migrated state is validated before committing.
 * On validation failure, the store is left unchanged and errors are returned.
 */
export function applyMigration<T>(
  store: Store<T>,
  plan: MigrationPlan,
  actor: Actor
): MigrationResult {
  const clone = structuredClone(store.getState()) as any
  const errors: string[] = []

  // 1. Rename: read old path, write to new path, delete old
  if (plan.rename) {
    for (const [oldPath, newPath] of Object.entries(plan.rename)) {
      const value = getNestedValue(clone, oldPath)
      if (value === undefined) {
        errors.push(`rename: source path "${oldPath}" does not exist`)
        continue
      }
      setNestedValue(clone, newPath, value)
      deleteNestedValue(clone, oldPath)
    }
  }

  // 2. Transform: read value, apply function, write back
  if (plan.transform) {
    for (const [path, fn] of Object.entries(plan.transform)) {
      const value = getNestedValue(clone, path)
      try {
        const transformed = fn(value)
        setNestedValue(clone, path, transformed)
      } catch (e) {
        errors.push(`transform: error at "${path}": ${e instanceof Error ? e.message : String(e)}`)
      }
    }
  }

  // 3. Remove: delete paths
  if (plan.remove) {
    for (const path of plan.remove) {
      deleteNestedValue(clone, path)
    }
  }

  // 4. Add: set default values for new fields
  if (plan.add) {
    for (const [path, { default: defaultValue }] of Object.entries(plan.add)) {
      setNestedValue(clone, path, defaultValue)
    }
  }

  // If there were errors during transformation, bail out
  if (errors.length > 0) {
    return { success: false, errors }
  }

  // Validate against Zod schema if the store has one
  const schema = store.getSchema()
  if (schema) {
    const result = schema.safeParse(clone)
    if (!result.success) {
      return {
        success: false,
        errors: result.error.issues.map(
          (i) => `${i.path.join('.')}: ${i.message}`
        ),
      }
    }
  }

  // Commit the migrated state
  store.reset(clone as T, actor)

  return { success: true, errors: [] }
}
