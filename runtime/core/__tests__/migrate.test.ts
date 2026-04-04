import { describe, it, expect, beforeEach } from 'vitest'
import { z } from 'zod'
import { createStore, storeRegistry } from '../store.js'
import { createSystemActor } from '../actor.js'
import { applyMigration } from '../migrate.js'
import type { MigrationPlan } from '../migrate.js'

const migrator = createSystemActor('migrator')

beforeEach(() => {
  storeRegistry.clear()
})

describe('applyMigration', () => {
  it('adds a new field with default value', () => {
    const store = createStore({
      name: 'add-field',
      initial: { name: 'Alice' },
    })

    const result = applyMigration(store, {
      add: {
        age: { schema: z.number(), default: 0 },
      },
    }, migrator)

    expect(result.success).toBe(true)
    expect(result.errors).toEqual([])
    expect(store.getState()).toEqual({ name: 'Alice', age: 0 })
  })

  it('removes a field', () => {
    const store = createStore({
      name: 'remove-field',
      initial: { name: 'Alice', temporary: 'data', keep: true },
    })

    const result = applyMigration(store, {
      remove: ['temporary'],
    }, migrator)

    expect(result.success).toBe(true)
    expect(store.getState()).toEqual({ name: 'Alice', keep: true })
    expect((store.getState() as any).temporary).toBeUndefined()
  })

  it('renames a field (old path -> new path)', () => {
    const store = createStore({
      name: 'rename-field',
      initial: { userName: 'Alice', age: 30 },
    })

    const result = applyMigration(store, {
      rename: { userName: 'displayName' },
    }, migrator)

    expect(result.success).toBe(true)
    const state = store.getState() as any
    expect(state.displayName).toBe('Alice')
    expect(state.userName).toBeUndefined()
    expect(state.age).toBe(30)
  })

  it('transforms a field value', () => {
    const store = createStore({
      name: 'transform-field',
      initial: { count: 5, label: 'hello' },
    })

    const result = applyMigration(store, {
      transform: {
        count: (v) => (v as number) * 10,
        label: (v) => (v as string).toUpperCase(),
      },
    }, migrator)

    expect(result.success).toBe(true)
    expect(store.getState()).toEqual({ count: 50, label: 'HELLO' })
  })

  it('applies combined migration (add + remove + rename + transform)', () => {
    const store = createStore({
      name: 'combined',
      initial: { firstName: 'Alice', age: 30, deprecated: true },
    })

    const result = applyMigration(store, {
      rename: { firstName: 'name' },
      transform: { age: (v) => (v as number) + 1 },
      remove: ['deprecated'],
      add: { active: { schema: z.boolean(), default: true } },
    }, migrator)

    expect(result.success).toBe(true)
    const state = store.getState() as any
    expect(state.name).toBe('Alice')
    expect(state.firstName).toBeUndefined()
    expect(state.age).toBe(31)
    expect(state.deprecated).toBeUndefined()
    expect(state.active).toBe(true)
  })

  it('fails if result does not pass Zod validation', () => {
    const schema = z.object({
      name: z.string(),
      age: z.number(),
    })

    const store = createStore({
      name: 'validation-fail',
      initial: { name: 'Alice', age: 30 },
      stateSchema: schema,
    })

    // Try to remove a required field — validation should fail
    const result = applyMigration(store, {
      remove: ['age'],
    }, migrator)

    expect(result.success).toBe(false)
    expect(result.errors.length).toBeGreaterThan(0)
  })

  it('reports Zod validation errors', () => {
    const schema = z.object({
      name: z.string(),
      age: z.number().min(0),
    })

    const store = createStore({
      name: 'validation-errors',
      initial: { name: 'Alice', age: 30 },
      stateSchema: schema,
    })

    const result = applyMigration(store, {
      transform: { age: () => -5 },
    }, migrator)

    expect(result.success).toBe(false)
    expect(result.errors.some((e) => e.includes('age'))).toBe(true)
  })

  it('updates store state on successful migration', () => {
    const store = createStore({
      name: 'success-update',
      initial: { value: 1 },
    })

    const before = store.getState()
    applyMigration(store, {
      transform: { value: (v) => (v as number) + 99 },
    }, migrator)
    const after = store.getState()

    expect(before).not.toBe(after)
    expect((after as any).value).toBe(100)
  })

  it('does not change store state on failed migration', () => {
    const schema = z.object({
      name: z.string(),
      count: z.number(),
    })

    const store = createStore({
      name: 'fail-no-change',
      initial: { name: 'Alice', count: 10 },
      stateSchema: schema,
    })

    const before = store.getState()

    // This should fail: transform count to a string (violates schema)
    const result = applyMigration(store, {
      transform: { count: () => 'not-a-number' },
    }, migrator)

    expect(result.success).toBe(false)
    expect(store.getState()).toBe(before)
  })

  it('works with nested paths', () => {
    const store = createStore({
      name: 'nested-paths',
      initial: {
        user: { profile: { name: 'Alice', email: 'old@example.com' } },
        settings: { theme: 'dark' },
      },
    })

    const result = applyMigration(store, {
      rename: { 'user.profile.email': 'user.profile.contactEmail' },
      transform: { 'user.profile.name': (v) => (v as string).toUpperCase() },
      add: { 'user.profile.verified': { schema: z.boolean(), default: false } },
      remove: ['settings.theme'],
    }, migrator)

    expect(result.success).toBe(true)
    const state = store.getState() as any
    expect(state.user.profile.name).toBe('ALICE')
    expect(state.user.profile.contactEmail).toBe('old@example.com')
    expect(state.user.profile.email).toBeUndefined()
    expect(state.user.profile.verified).toBe(false)
    expect(state.settings.theme).toBeUndefined()
  })

  it('reports error when renaming from a non-existent path', () => {
    const store = createStore({
      name: 'rename-missing',
      initial: { a: 1 },
    })

    const result = applyMigration(store, {
      rename: { 'nonexistent.path': 'new.path' },
    }, migrator)

    expect(result.success).toBe(false)
    expect(result.errors[0]).toContain('nonexistent.path')
  })
})
