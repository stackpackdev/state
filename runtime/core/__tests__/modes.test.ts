import { describe, it, expect, beforeEach } from 'vitest'
import { z } from 'zod'
import { extractModes, createModeError, deriveGatesFromModes, deriveWhenFromModes } from '../modes.js'
import { defineStore } from '../define.js'
import { createStore, storeRegistry } from '../store.js'
import { createHumanActor } from '../actor.js'

const user = createHumanActor('testUser')

beforeEach(() => {
  storeRegistry.clear()
})

// ─── Discriminated union schema used across tests ───────────────

const connectionSchema = z.discriminatedUnion('status', [
  z.object({ status: z.literal('idle') }),
  z.object({ status: z.literal('connecting'), attempt: z.number() }),
  z.object({ status: z.literal('connected'), sessionId: z.string() }),
  z.object({ status: z.literal('error'), message: z.string() }),
])

// ─── extractModes ───────────────────────────────────────────────

describe('extractModes', () => {
  it('returns correct discriminant and mode names for a discriminated union', () => {
    const result = extractModes(connectionSchema)
    expect(result).not.toBeNull()
    expect(result!.discriminant).toBe('status')
    expect(result!.modeNames).toEqual(['idle', 'connecting', 'connected', 'error'])
  })

  it('returns null for a regular ZodObject', () => {
    const schema = z.object({ name: z.string(), count: z.number() })
    const result = extractModes(schema)
    expect(result).toBeNull()
  })

  it('returns null for null/undefined input', () => {
    expect(extractModes(null)).toBeNull()
    expect(extractModes(undefined)).toBeNull()
  })

  it('returns null for a plain union (non-discriminated)', () => {
    const schema = z.union([z.string(), z.number()])
    const result = extractModes(schema)
    expect(result).toBeNull()
  })
})

// ─── createModeError ────────────────────────────────────────────

describe('createModeError', () => {
  it('creates descriptive error with both modes', () => {
    const error = createModeError(
      'connection',
      'idle',
      { status: 'connected', sessionId: 'abc' },
      'status'
    )
    expect(error).toContain('connection')
    expect(error).toContain('idle')
    expect(error).toContain('connected')
    expect(error).toContain('status')
  })

  it('handles missing discriminant in attempted state', () => {
    const error = createModeError('connection', 'idle', { foo: 'bar' }, 'status')
    expect(error).toContain('idle')
    expect(error).toContain('missing')
  })
})

// ─── deriveGatesFromModes / deriveWhenFromModes ─────────────────

describe('deriveGatesFromModes', () => {
  it('creates a gate for each mode name', () => {
    const modeInfo = { discriminant: 'status', modeNames: ['idle', 'loading', 'error'] }
    const gates = deriveGatesFromModes(modeInfo)

    expect(Object.keys(gates)).toEqual(['idle', 'loading', 'error'])
    expect(gates.idle({ status: 'idle' })).toBe(true)
    expect(gates.idle({ status: 'loading' })).toBe(false)
    expect(gates.loading({ status: 'loading' })).toBe(true)
    expect(gates.error({ status: 'error' })).toBe(true)
  })
})

describe('deriveWhenFromModes', () => {
  it('creates is{ModeName} when conditions', () => {
    const modeInfo = { discriminant: 'status', modeNames: ['idle', 'loading', 'error'] }
    const when = deriveWhenFromModes(modeInfo)

    expect(Object.keys(when)).toEqual(['isIdle', 'isLoading', 'isError'])
    expect(when.isIdle({ status: 'idle' })).toBe(true)
    expect(when.isIdle({ status: 'loading' })).toBe(false)
    expect(when.isLoading({ status: 'loading' })).toBe(true)
  })
})

// ─── defineStore with discriminated union ───────────────────────

describe('defineStore with discriminated union', () => {
  it('auto-derives gates for each mode', () => {
    const { store } = defineStore({
      name: 'mode-gates',
      schema: connectionSchema,
      initial: { status: 'idle' as const },
    })

    const gates = store.getGates()
    expect(gates.idle).toBe(true)
    expect(gates.connecting).toBe(false)
    expect(gates.connected).toBe(false)
    expect(gates.error).toBe(false)
  })

  it('auto-derives when conditions (is{ModeName})', () => {
    const { store } = defineStore({
      name: 'mode-when',
      schema: connectionSchema,
      initial: { status: 'idle' as const },
    })

    const when = store.getWhen()
    expect(when.isIdle).toBe(true)
    expect(when.isConnecting).toBe(false)
    expect(when.isConnected).toBe(false)
    expect(when.isError).toBe(false)
  })

  it('updates gates and when after mode transition', () => {
    const { store } = defineStore({
      name: 'mode-transition',
      schema: connectionSchema,
      initial: { status: 'idle' as const },
    })

    // Transition to connecting
    store.update(
      () => ({ status: 'connecting' as const, attempt: 1 }),
      user
    )

    expect(store.getGates().idle).toBe(false)
    expect(store.getGates().connecting).toBe(true)
    expect(store.getWhen().isIdle).toBe(false)
    expect(store.getWhen().isConnecting).toBe(true)
  })

  it('user-provided gates override auto-derived ones', () => {
    const { store } = defineStore({
      name: 'mode-override-gates',
      schema: connectionSchema,
      initial: { status: 'idle' as const },
      gates: {
        // Override the auto-derived 'idle' gate with custom logic
        idle: () => false,
        customGate: (s) => s.status === 'connected',
      },
    })

    const gates = store.getGates()
    // User override takes precedence
    expect(gates.idle).toBe(false)
    // Custom gate is present
    expect(gates.customGate).toBe(false)
    // Auto-derived gates for other modes still exist
    expect(gates.connecting).toBe(false)
    expect(gates.connected).toBe(false)
  })

  it('user-provided when conditions override auto-derived ones', () => {
    const { store } = defineStore({
      name: 'mode-override-when',
      schema: connectionSchema,
      initial: { status: 'idle' as const },
      when: {
        // Override auto-derived isIdle
        isIdle: () => false,
        customWhen: (s) => s.status !== 'error',
      },
    })

    const when = store.getWhen()
    // User override takes precedence
    expect(when.isIdle).toBe(false)
    // Custom when is present
    expect(when.customWhen).toBe(true)
    // Auto-derived when for other modes still exist
    expect(when.isConnecting).toBe(false)
  })
})

// ─── Zod validation of mode transitions ─────────────────────────

describe('store validates mode transitions via Zod', () => {
  it('rejects invalid state shape for a mode', () => {
    const { store } = defineStore({
      name: 'mode-validation',
      schema: connectionSchema,
      initial: { status: 'idle' as const },
    })

    // Try to set 'connected' mode without required sessionId field
    store.update(
      () => ({ status: 'connected' } as any),
      user
    )

    // Should be rolled back — still idle
    expect(store.getState().status).toBe('idle')
  })

  it('accepts valid state shape for a mode', () => {
    const { store } = defineStore({
      name: 'mode-valid',
      schema: connectionSchema,
      initial: { status: 'idle' as const },
    })

    store.update(
      () => ({ status: 'connected' as const, sessionId: 'sess-123' }),
      user
    )

    expect(store.getState().status).toBe('connected')
    expect((store.getState() as any).sessionId).toBe('sess-123')
  })
})

// ─── Backward compatibility ─────────────────────────────────────

describe('backward compatibility', () => {
  it('flat object schemas still work exactly as before', () => {
    const { store } = defineStore({
      name: 'flat-compat',
      schema: z.object({ count: z.number(), label: z.string() }),
      initial: { count: 0, label: 'hello' },
      when: {
        hasItems: (s) => s.count > 0,
      },
      gates: {
        isLabeled: (s) => s.label.length > 0,
      },
    })

    expect(store.getState()).toEqual({ count: 0, label: 'hello' })
    expect(store.getWhen().hasItems).toBe(false)
    expect(store.getGates().isLabeled).toBe(true)

    store.update((draft) => { draft.count = 5 }, user)
    expect(store.getWhen().hasItems).toBe(true)
  })

  it('createStore without defineStore is unaffected', () => {
    const store = createStore({
      name: 'raw-store-compat',
      initial: { x: 1, y: 2 },
      stateSchema: z.object({ x: z.number(), y: z.number() }),
      when: { isPositive: (s: any) => s.x > 0 },
    })

    expect(store.getState()).toEqual({ x: 1, y: 2 })
    expect(store.getWhen().isPositive).toBe(true)
  })
})
