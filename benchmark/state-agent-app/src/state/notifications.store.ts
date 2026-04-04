import { defineStore, z, getDefaultActor } from 'state-agent';
import type { Notification, NotificationType } from '../types';

export const notifications = defineStore({
  name: 'notifications',
  schema: z.object({
    items: z.array(
      z.object({
        id: z.string(),
        type: z.string(),
        message: z.string(),
        createdAt: z.number(),
        duration: z.number(),
      })
    ),
  }),
  initial: {
    items: [] as Notification[],
  },
  when: {
    hasNotifications: (s) => s.items.length > 0,
    isEmpty: (s) => s.items.length === 0,
  },
  computed: {
    count: (s) => s.items.length,
  },
});

let notifId = 0;
const timers = new Map<string, ReturnType<typeof setTimeout>>();

export function addNotification(
  type: NotificationType,
  message: string,
  duration = 4000
): void {
  const actor = getDefaultActor();
  const id = `notif-${++notifId}`;
  const notification: Notification = {
    id,
    type,
    message,
    createdAt: Date.now(),
    duration,
  };

  notifications.store.update((draft) => {
    draft.items.push(notification);
  }, actor);

  if (duration > 0) {
    const timer = setTimeout(() => {
      dismissNotification(id);
    }, duration);
    timers.set(id, timer);
  }
}

export function dismissNotification(id: string): void {
  const timer = timers.get(id);
  if (timer) {
    clearTimeout(timer);
    timers.delete(id);
  }
  const actor = getDefaultActor();
  notifications.store.update((draft) => {
    draft.items = draft.items.filter((n) => n.id !== id);
  }, actor);
}
