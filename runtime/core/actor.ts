// Actor identity and permission system
// New addition to Views patterns — every state change is attributed to an actor

import type { Actor, ActorType, Permission, PermissionAction } from './types.js'
import { matchPath } from './path.js'

let actorCounter = 0

function generateId(type: ActorType, name: string): string {
  return `${type}_${name}_${++actorCounter}`
}

/**
 * Create a human actor (UI user interactions).
 */
export function createHumanActor(name: string): Actor {
  return {
    id: generateId('human', name),
    type: 'human',
    name,
    permissions: [{ paths: ['*'], actions: ['read', 'write', 'delete'] }],
  }
}

/**
 * Create an AI agent actor with specific permissions.
 */
export function createAgentActor(config: {
  name: string
  model?: string
  permissions?: Permission[]
}): Actor {
  return {
    id: generateId('agent', config.name),
    type: 'agent',
    name: config.name,
    status: 'idle',
    permissions: config.permissions ?? [
      { paths: ['*'], actions: ['read', 'write'] },
    ],
    meta: config.model ? { model: config.model } : undefined,
  }
}

/**
 * Create a system actor for internal/automated state changes.
 */
export function createSystemActor(name?: string): Actor {
  const actorName = name ?? 'system'
  return {
    id: generateId('system', actorName),
    type: 'system',
    name: actorName,
    permissions: [{ paths: ['*'], actions: ['read', 'write', 'delete'] }],
  }
}

/**
 * Check if an actor has permission to perform an action at a path.
 */
export function canAct(
  actor: Actor,
  action: PermissionAction,
  path: string
): boolean {
  if (!actor.permissions || actor.permissions.length === 0) return false

  return actor.permissions.some(
    perm =>
      perm.actions.includes(action) &&
      perm.paths.some(pattern => matchPath(pattern, path))
  )
}

// ─── Default Actor ────────────────────────────────────────────
// Lazy default human actor for ergonomic use without boilerplate

let defaultHumanActor: Actor | null = null

/**
 * Get or create the default human actor.
 * Used as fallback when no actor is explicitly provided.
 */
export function getDefaultActor(): Actor {
  if (!defaultHumanActor) {
    defaultHumanActor = createHumanActor('user')
  }
  return defaultHumanActor
}

/**
 * Update actor status (primarily for agents).
 */
export function withStatus(actor: Actor, status: Actor['status']): Actor {
  return { ...actor, status }
}
