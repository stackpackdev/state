import React from 'react';
import type { PresencePhase } from '../core/types.js';
import type { UsePresenceOptions } from './use-presence.js';
export interface PresenceProps extends UsePresenceOptions {
    /** Store name */
    store: string;
    /** Gate condition name */
    gate: string;
    /**
     * Render function receiving phase and done callback.
     * Use `phase` to apply CSS classes or control animation libraries.
     * Call `done()` to signal leave animation is complete (when timeout is 0).
     */
    children: (props: {
        phase: PresencePhase;
        done: () => void;
        entered: () => void;
        ref: React.RefCallback<HTMLElement>;
    }) => React.ReactNode;
}
/**
 * Conditionally render children with animated lifecycle phases.
 *
 * CSS-only (timeout matches CSS transition duration):
 * ```tsx
 * <Presence store="modal" gate="isOpen" timeout={300}>
 *   {({ phase, ref }) => (
 *     <div ref={ref} className={`modal modal--${phase}`}>
 *       <ModalContent />
 *     </div>
 *   )}
 * </Presence>
 * ```
 *
 * With Framer Motion (manual done() signal):
 * ```tsx
 * <Presence store="modal" gate="isOpen" timeout={0}>
 *   {({ phase, done }) => (
 *     <motion.div
 *       animate={{ opacity: phase === 'leaving' ? 0 : 1 }}
 *       onAnimationComplete={() => phase === 'leaving' && done()}
 *     >
 *       <ModalContent />
 *     </motion.div>
 *   )}
 * </Presence>
 * ```
 */
export declare function Presence({ store, gate, timeout, children }: PresenceProps): import("react/jsx-runtime").JSX.Element | null;
//# sourceMappingURL=presence.d.ts.map