import { describe, it, expect } from 'vitest'
import { getPath, setPath, deletePath, hasPath, matchPath } from '../path.js'

describe('getPath', () => {
  it('returns entire object when no path', () => {
    const obj = { a: 1 }
    expect(getPath(obj)).toBe(obj)
  })

  it('gets a top-level key', () => {
    expect(getPath({ a: 1, b: 2 }, 'b')).toBe(2)
  })

  it('gets a nested key', () => {
    expect(getPath({ a: { b: { c: 3 } } }, 'a.b.c')).toBe(3)
  })

  it('gets array elements by index', () => {
    expect(getPath({ items: ['x', 'y', 'z'] }, 'items.1')).toBe('y')
  })

  it('returns undefined for missing paths', () => {
    expect(getPath({ a: 1 }, 'b.c.d')).toBeUndefined()
  })

  it('returns undefined when traversing null', () => {
    expect(getPath({ a: null }, 'a.b')).toBeUndefined()
  })
})

describe('setPath', () => {
  it('sets a top-level key', () => {
    const obj: any = {}
    setPath(obj, 'a', 1)
    expect(obj.a).toBe(1)
  })

  it('sets a nested key, creating intermediates', () => {
    const obj: any = {}
    setPath(obj, 'a.b.c', 42)
    expect(obj.a.b.c).toBe(42)
  })

  it('creates arrays when next key is numeric', () => {
    const obj: any = {}
    setPath(obj, 'items.0', 'hello')
    expect(Array.isArray(obj.items)).toBe(true)
    expect(obj.items[0]).toBe('hello')
  })
})

describe('deletePath', () => {
  it('deletes a key from an object', () => {
    const obj: any = { a: 1, b: 2 }
    deletePath(obj, 'a')
    expect(obj.a).toBeUndefined()
    expect(obj.b).toBe(2)
  })

  it('splices from an array when key is numeric', () => {
    const obj: any = { items: ['a', 'b', 'c'] }
    deletePath(obj, 'items.1')
    expect(obj.items).toEqual(['a', 'c'])
  })

  it('handles missing intermediate paths', () => {
    const obj: any = {}
    deletePath(obj, 'a.b.c') // should not throw
  })
})

describe('hasPath', () => {
  it('returns true for existing paths', () => {
    expect(hasPath({ a: { b: 1 } }, 'a.b')).toBe(true)
  })

  it('returns false for missing paths', () => {
    expect(hasPath({ a: 1 }, 'b')).toBe(false)
  })

  it('returns true for falsy values that exist', () => {
    expect(hasPath({ a: 0 }, 'a')).toBe(true)
    expect(hasPath({ a: '' }, 'a')).toBe(true)
    expect(hasPath({ a: false }, 'a')).toBe(true)
    expect(hasPath({ a: null }, 'a')).toBe(true)
  })
})

describe('matchPath', () => {
  it('wildcard * matches everything', () => {
    expect(matchPath('*', 'anything.here')).toBe(true)
  })

  it('exact match', () => {
    expect(matchPath('todos.items', 'todos.items')).toBe(true)
    expect(matchPath('todos.items', 'todos.filter')).toBe(false)
  })

  it('prefix wildcard matches subtree', () => {
    expect(matchPath('todos.*', 'todos.items')).toBe(true)
    expect(matchPath('todos.*', 'todos.items.0.text')).toBe(true)
    expect(matchPath('todos.*', 'todos')).toBe(true)
    expect(matchPath('todos.*', 'auth.user')).toBe(false)
  })
})
