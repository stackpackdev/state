import { z } from 'zod'
import type { ZodObject } from 'zod'
import { defineStore, type DefineStoreOptions, type DefineStoreResult } from '../core/define.js'
import type { Middleware, StoreDependencies } from '../core/types.js'

export interface ComponentDefinition {
  schema: ZodObject<any>
  conditions?: {
    when?: Record<string, (state: any) => boolean>
    gates?: Record<string, (state: any) => boolean>
    computed?: Record<string, (state: any) => unknown>
  }
  initial: Record<string, unknown>
}

interface ComposeStoreOptions<S extends ZodObject<any>> {
  name: string
  schema: S
  components: ComponentDefinition[]
  initial: z.infer<S>
  when?: Record<string, (state: any) => boolean>
  gates?: Record<string, (state: any) => boolean>
  computed?: Record<string, (state: any) => unknown>
  middleware?: Middleware[]
  dependencies?: StoreDependencies
}

/**
 * Resolve a component's display name for error messages.
 * Uses the component's schema description, or falls back to
 * stringifying the schema's field names.
 */
function componentName(comp: ComponentDefinition): string {
  const keys = Object.keys(comp.schema.shape)
  // Well-known component names based on shape keys
  if (keys.includes('isLoading')) return 'Loadable'
  if (keys.includes('page') && keys.includes('pageSize')) return 'Paginated'
  if (keys.includes('filter') && keys.includes('sortBy')) return 'Filterable'
  if (keys.includes('selectedIds')) return 'Selectable'
  return `Component(${keys.join(',')})`
}

export function composeStore<S extends ZodObject<any>>(
  options: ComposeStoreOptions<S>
): DefineStoreResult<any> {
  const userFieldNames = new Set(Object.keys(options.schema.shape))

  // Track which fields belong to which source for conflict detection
  const fieldSources = new Map<string, string>()
  for (const field of userFieldNames) {
    fieldSources.set(field, 'user schema')
  }

  // Merge schemas, checking for conflicts
  let mergedShape: Record<string, any> = { ...options.schema.shape }

  for (const comp of options.components) {
    const name = componentName(comp)
    const compFields = Object.keys(comp.schema.shape)

    for (const field of compFields) {
      const existingSource = fieldSources.get(field)
      if (existingSource) {
        throw new Error(
          `Field '${field}' defined by both ${name} and ${existingSource}`
        )
      }
      fieldSources.set(field, name)
    }

    mergedShape = { ...mergedShape, ...comp.schema.shape }
  }

  const mergedSchema = z.object(mergedShape)

  // Merge conditions: components first, then user overrides on top
  let mergedWhen: Record<string, (state: any) => boolean> = {}
  let mergedGates: Record<string, (state: any) => boolean> = {}
  let mergedComputed: Record<string, (state: any) => unknown> = {}

  for (const comp of options.components) {
    const conds = comp.conditions
    if (conds?.when) mergedWhen = { ...mergedWhen, ...conds.when }
    if (conds?.gates) mergedGates = { ...mergedGates, ...conds.gates }
    if (conds?.computed) mergedComputed = { ...mergedComputed, ...conds.computed }
  }

  // User-provided override component conditions
  if (options.when) mergedWhen = { ...mergedWhen, ...options.when }
  if (options.gates) mergedGates = { ...mergedGates, ...options.gates }
  if (options.computed) mergedComputed = { ...mergedComputed, ...options.computed }

  // Merge initial values: components first, then user initial on top
  let mergedInitial: Record<string, unknown> = {}
  for (const comp of options.components) {
    mergedInitial = { ...mergedInitial, ...comp.initial }
  }
  mergedInitial = { ...mergedInitial, ...options.initial }

  return defineStore({
    name: options.name,
    schema: mergedSchema,
    initial: mergedInitial,
    when: Object.keys(mergedWhen).length > 0 ? mergedWhen : undefined,
    gates: Object.keys(mergedGates).length > 0 ? mergedGates : undefined,
    computed: Object.keys(mergedComputed).length > 0 ? mergedComputed : undefined,
    middleware: options.middleware,
    dependencies: options.dependencies,
  })
}
