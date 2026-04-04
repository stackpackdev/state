import type { Actor, Permission, PermissionAction } from './types.js';
/**
 * Create a human actor (UI user interactions).
 */
export declare function createHumanActor(name: string): Actor;
/**
 * Create an AI agent actor with specific permissions.
 */
export declare function createAgentActor(config: {
    name: string;
    model?: string;
    permissions?: Permission[];
}): Actor;
/**
 * Create a system actor for internal/automated state changes.
 */
export declare function createSystemActor(name?: string): Actor;
/**
 * Check if an actor has permission to perform an action at a path.
 */
export declare function canAct(actor: Actor, action: PermissionAction, path: string): boolean;
/**
 * Get or create the default human actor.
 * Used as fallback when no actor is explicitly provided.
 */
export declare function getDefaultActor(): Actor;
/**
 * Update actor status (primarily for agents).
 */
export declare function withStatus(actor: Actor, status: Actor['status']): Actor;
//# sourceMappingURL=actor.d.ts.map