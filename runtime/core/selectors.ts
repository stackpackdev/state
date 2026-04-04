// Auto-generated selector tree from Zod schema
// Provides type-safe, path-based selectors for store state access

import { z } from 'zod'
import { getPath } from './path.js'

export type SelectorNode<V = any> = {
  $path: string
  $select: (state: any) => V
}

export type SelectorTree<T> = {
  [K in keyof T]: T[K] extends Record<string, any>
    ? SelectorTree<T[K]> & SelectorNode<T[K]>
    : SelectorNode<T[K]>
}

/**
 * Build a selector tree from a Zod schema.
 * Walks the schema shape recursively, creating nodes with $path and $select.
 *
 * - ZodObject: recurse into shape keys
 * - ZodArray: single selector for the whole array (no per-item recursion)
 * - ZodDiscriminatedUnion: selector for the discriminant field only
 * - Primitives: leaf selector node
 */
export function buildSelectorTree<T>(
  schema: z.ZodType<T>,
  prefix?: string
): SelectorTree<T> {
  const tree: any = {}

  if (schema instanceof z.ZodObject) {
    const shape = schema.shape as Record<string, z.ZodType>
    for (const key of Object.keys(shape)) {
      const path = prefix ? `${prefix}.${key}` : key
      const childSchema = shape[key]

      // Every key gets $path and $select
      const node: any = {
        $path: path,
        $select: (state: any) => getPath(state, path),
      }

      // If child is a ZodObject, recurse and merge nested selectors
      if (childSchema instanceof z.ZodObject) {
        const nested = buildSelectorTree(childSchema, path)
        Object.assign(node, nested)
      }

      tree[key] = node
    }
  } else if (schema instanceof z.ZodDiscriminatedUnion) {
    // For discriminated unions, only create a selector for the discriminant field
    const discriminator = (schema as any)._def.discriminator as string
    if (discriminator) {
      const path = prefix ? `${prefix}.${discriminator}` : discriminator
      tree[discriminator] = {
        $path: path,
        $select: (state: any) => getPath(state, path),
      }
    }
  }

  return Object.freeze(tree) as SelectorTree<T>
}
