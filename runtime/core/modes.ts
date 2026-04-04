// State Modes via Discriminated Unions
//
// When a store's schema is a ZodDiscriminatedUnion, the store operates in
// "mode" semantics: the discriminant field determines which mode the store
// is in, and each mode has its own shape validated by Zod.
//
// This module detects discriminated unions at runtime and extracts mode
// metadata for auto-deriving gates and when conditions.

export interface ModeInfo {
  discriminant: string
  modeNames: string[]
}

/**
 * Extract mode information from a Zod schema.
 * Returns discriminant field name and list of mode names if the schema
 * is a ZodDiscriminatedUnion. Returns null for all other schema types.
 *
 * Zod 4: _def.type === 'union' && _def.discriminator is a string.
 * Options are in _def.options, each is a ZodObject with a shape containing
 * a ZodLiteral for the discriminant field.
 */
export function extractModes(schema: any): ModeInfo | null {
  if (!schema || !schema._def) return null

  const def = schema._def

  // Zod 4: discriminatedUnion produces _def.type === 'union' with a discriminator string
  if (def.type === 'union' && typeof def.discriminator === 'string') {
    const discriminant = def.discriminator
    const options: any[] = def.options ?? schema.options ?? []
    const modeNames: string[] = []

    for (const option of options) {
      const optDef = option?._def
      if (!optDef || optDef.type !== 'object') continue

      const discField = optDef.shape?.[discriminant]
      if (!discField?._def) continue

      // ZodLiteral in Zod 4: _def.type === 'literal', _def.values is an array
      if (discField._def.type === 'literal' && Array.isArray(discField._def.values)) {
        for (const val of discField._def.values) {
          if (typeof val === 'string') {
            modeNames.push(val)
          }
        }
      }
    }

    if (modeNames.length > 0) {
      return { discriminant, modeNames }
    }
  }

  // Zod 3 fallback: _def.typeName === 'ZodDiscriminatedUnion'
  if (def.typeName === 'ZodDiscriminatedUnion') {
    const discriminant = def.discriminator ?? def.discriminant
    if (typeof discriminant !== 'string') return null

    const options: any[] = def.options ?? []
    const modeNames: string[] = []

    for (const option of options) {
      const optDef = option?._def
      if (!optDef?.shape) continue

      const discField = optDef.shape[discriminant]
      if (!discField?._def) continue

      // Zod 3 literal: _def.value is the literal value
      const val = discField._def.value ?? discField._def.values?.[0]
      if (typeof val === 'string') {
        modeNames.push(val)
      }
    }

    if (modeNames.length > 0) {
      return { discriminant, modeNames }
    }
  }

  return null
}

/**
 * Create a descriptive error message for mode transitions.
 * Agent-friendly: includes store name, current mode, attempted state, and discriminant.
 */
export function createModeError(
  storeName: string,
  currentMode: string,
  attemptedState: any,
  discriminant: string
): string {
  const attemptedMode =
    attemptedState && typeof attemptedState === 'object'
      ? attemptedState[discriminant]
      : undefined

  const modeInfo = attemptedMode
    ? `from "${currentMode}" to "${attemptedMode}"`
    : `from "${currentMode}" (new state missing "${discriminant}" field)`

  return (
    `[state-agent] Store "${storeName}": mode transition ${modeInfo}. ` +
    `Discriminant field: "${discriminant}". ` +
    `Ensure the new state shape matches the "${attemptedMode ?? 'unknown'}" mode schema.`
  )
}

/**
 * Auto-derive gate conditions from mode info.
 * For each mode name, creates a gate `{modeName}` that is true when
 * the discriminant field matches that mode.
 */
export function deriveGatesFromModes(
  modeInfo: ModeInfo
): Record<string, (state: any) => boolean> {
  const gates: Record<string, (state: any) => boolean> = {}
  for (const modeName of modeInfo.modeNames) {
    gates[modeName] = (state: any) =>
      state && state[modeInfo.discriminant] === modeName
  }
  return gates
}

/**
 * Auto-derive when conditions from mode info.
 * For each mode name, creates a when `is{ModeName}` (capitalized) that is
 * true when the discriminant field matches that mode.
 */
export function deriveWhenFromModes(
  modeInfo: ModeInfo
): Record<string, (state: any) => boolean> {
  const when: Record<string, (state: any) => boolean> = {}
  for (const modeName of modeInfo.modeNames) {
    const capitalizedName = modeName.charAt(0).toUpperCase() + modeName.slice(1)
    when[`is${capitalizedName}`] = (state: any) =>
      state && state[modeInfo.discriminant] === modeName
  }
  return when
}
