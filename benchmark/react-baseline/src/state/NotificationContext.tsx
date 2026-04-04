import React, { createContext, useState, useCallback, useContext, useRef } from 'react';
import type { Notification, NotificationType } from '../types';

// ── Boilerplate counter: 1x createContext, 1x useState, 1x useRef, 2x useCallback, 1x useContext ──

interface NotificationContextValue {
  notifications: Notification[];
  addNotification: (type: NotificationType, message: string, duration?: number) => void;
  dismissNotification: (id: string) => void;
}

export const NotificationContext = createContext<NotificationContextValue | null>(null);

let notifId = 0;

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const timersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const dismissNotification = useCallback((id: string) => {
    const timer = timersRef.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timersRef.current.delete(id);
    }
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const addNotification = useCallback(
    (type: NotificationType, message: string, duration = 4000) => {
      const id = `notif-${++notifId}`;
      const notification: Notification = {
        id,
        type,
        message,
        createdAt: Date.now(),
        duration,
      };
      setNotifications((prev) => [...prev, notification]);

      if (duration > 0) {
        const timer = setTimeout(() => {
          dismissNotification(id);
        }, duration);
        timersRef.current.set(id, timer);
      }
    },
    [dismissNotification]
  );

  return (
    <NotificationContext.Provider value={{ notifications, addNotification, dismissNotification }}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotificationContext(): NotificationContextValue {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error('useNotificationContext must be used within NotificationProvider');
  return ctx;
}
