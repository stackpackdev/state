// Deep path access utilities
// Replaces lodash get/set from Data.js (lines 14-18) with zero-dep implementation

/**
 * Get a value at a dot-path from an object.
 * Supports: 'a.b.c', 'items.0.text', 'deeply.nested.path'
 */
export function getPath(obj: any, path?: string): any {
  if (!path) return obj
  const keys = path.split('.')
  let current = obj
  for (const key of keys) {
    if (current == null) return undefined
    current = current[key]
  }
  return current
}

/**
 * Set a value at a dot-path on an object (mutates — use inside Immer produce).
 * Creates intermediate objects/arrays as needed.
 */
export function setPath(obj: any, path: string, value: unknown): void {
  const keys = path.split('.')
  let current = obj
  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i]
    const nextKey = keys[i + 1]
    if (current[key] == null) {
      // Create array if next key is numeric, otherwise object
      current[key] = /^\d+$/.test(nextKey) ? [] : {}
    }
    current = current[key]
  }
  current[keys[keys.length - 1]] = value
}

/**
 * Delete a value at a dot-path on an object (mutates — use inside Immer produce).
 */
export function deletePath(obj: any, path: string): void {
  const keys = path.split('.')
  let current = obj
  for (let i = 0; i < keys.length - 1; i++) {
    if (current == null) return
    current = current[keys[i]]
  }
  if (current != null) {
    const lastKey = keys[keys.length - 1]
    if (Array.isArray(current) && /^\d+$/.test(lastKey)) {
      current.splice(Number(lastKey), 1)
    } else {
      delete current[lastKey]
    }
  }
}

/**
 * Check if a path exists and has a value in an object.
 */
export function hasPath(obj: any, path: string): boolean {
  const value = getPath(obj, path)
  return value !== undefined
}

/**
 * Simple glob pattern match for permission paths.
 * Supports: '*' (match everything), 'todos.*' (match todos subtree)
 */
export function matchPath(pattern: string, path: string): boolean {
  if (pattern === '*') return true
  if (pattern === path) return true

  // 'todos.*' matches 'todos.items', 'todos.items.0.text', etc.
  if (pattern.endsWith('.*')) {
    const prefix = pattern.slice(0, -2)
    return path === prefix || path.startsWith(prefix + '.')
  }

  return false
}
