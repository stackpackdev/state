import { Fragment as _Fragment, jsx as _jsx } from "react/jsx-runtime";
import { usePresence } from './use-presence.js';
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
export function Presence({ store, gate, timeout, children }) {
    const { isPresent, phase, done, entered, ref } = usePresence(store, gate, { timeout });
    if (!isPresent || !phase)
        return null;
    return _jsx(_Fragment, { children: children({ phase, done, entered, ref }) });
}
//# sourceMappingURL=presence.js.map