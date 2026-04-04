import { useNotificationContext } from '../state/NotificationContext';
import type { NotificationType } from '../types';

// ── Boilerplate counter: 1x useContext (via hook) ──
// Thin wrapper — the real logic is in the context provider

export function useNotifications() {
  const { notifications, addNotification, dismissNotification } = useNotificationContext();

  return {
    notifications,
    notify: (type: NotificationType, message: string, duration?: number) =>
      addNotification(type, message, duration),
    dismiss: dismissNotification,
    success: (msg: string) => addNotification('success', msg),
    error: (msg: string) => addNotification('error', msg),
    info: (msg: string) => addNotification('info', msg),
    warning: (msg: string) => addNotification('warning', msg),
  };
}
