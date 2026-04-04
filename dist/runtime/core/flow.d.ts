import type { Flow, FlowOptions } from './types.js';
/**
 * Create a hierarchical flow state machine.
 * Supports tree-shaped flows with path-based addressing.
 *
 * Path addressing:
 *   flow.go('Settings', actor)         — navigate within this flow
 *   flow.go('/Dashboard/Settings', actor) — navigate to nested path
 *   flow.resolve('Dashboard')          — get child flow
 *   flow.activeChain()                 — ['app/Dashboard', 'dashboard/Settings']
 */
export declare function createFlow(options: FlowOptions): Flow;
//# sourceMappingURL=flow.d.ts.map