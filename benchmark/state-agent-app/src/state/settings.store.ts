import { defineStore, z, getDefaultActor } from 'state-agent';
import type { Theme } from '../types';

export const settings = defineStore({
  name: 'settings',
  schema: z.object({
    theme: z.enum(['light', 'dark']),
    showCompletedTasks: z.boolean(),
    notificationsEnabled: z.boolean(),
  }),
  initial: {
    theme: 'light' as Theme,
    showCompletedTasks: true,
    notificationsEnabled: true,
  },
  when: {
    isDarkMode: (s) => s.theme === 'dark',
    isLightMode: (s) => s.theme === 'light',
    showingCompleted: (s) => s.showCompletedTasks,
    notificationsOn: (s) => s.notificationsEnabled,
  },
  gates: {
    isDarkMode: (s) => s.theme === 'dark',
  },
});

export function setTheme(theme: Theme): void {
  const actor = getDefaultActor();
  settings.store.set('theme', theme, actor);
}

export function toggleShowCompleted(): void {
  const actor = getDefaultActor();
  settings.store.update((draft) => {
    draft.showCompletedTasks = !draft.showCompletedTasks;
  }, actor);
}

export function toggleNotifications(): void {
  const actor = getDefaultActor();
  settings.store.update((draft) => {
    draft.notificationsEnabled = !draft.notificationsEnabled;
  }, actor);
}
