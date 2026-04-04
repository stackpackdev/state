export interface ModeInfo {
    discriminant: string;
    modeNames: string[];
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
export declare function extractModes(schema: any): ModeInfo | null;
/**
 * Create a descriptive error message for mode transitions.
 * Agent-friendly: includes store name, current mode, attempted state, and discriminant.
 */
export declare function createModeError(storeName: string, currentMode: string, attemptedState: any, discriminant: string): string;
/**
 * Auto-derive gate conditions from mode info.
 * For each mode name, creates a gate `{modeName}` that is true when
 * the discriminant field matches that mode.
 */
export declare function deriveGatesFromModes(modeInfo: ModeInfo): Record<string, (state: any) => boolean>;
/**
 * Auto-derive when conditions from mode info.
 * For each mode name, creates a when `is{ModeName}` (capitalized) that is
 * true when the discriminant field matches that mode.
 */
export declare function deriveWhenFromModes(modeInfo: ModeInfo): Record<string, (state: any) => boolean>;
//# sourceMappingURL=modes.d.ts.map