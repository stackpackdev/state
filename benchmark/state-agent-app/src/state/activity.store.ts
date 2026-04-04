import { defineStore, z, getDefaultActor } from 'state-agent';
import type { ActivityEntry, ActivityActionType } from '../types';

export const activity = defineStore({
  name: 'activity',
  schema: z.object({
    entries: z.array(
      z.object({
        id: z.string(),
        actionType: z.string(),
        description: z.string(),
        actor: z.string(),
        timestamp: z.number(),
      })
    ),
  }),
  initial: {
    entries: [] as ActivityEntry[],
  },
  when: {
    hasEntries: (s) => s.entries.length > 0,
    isEmpty: (s) => s.entries.length === 0,
  },
  computed: {
    totalCount: (s) => s.entries.length,
    recentEntries: (s) => s.entries.slice(0, 20),
  },
});

let activityId = 0;

export function logActivity(
  actionType: ActivityActionType,
  description: string,
  actorName: string
): void {
  const actor = getDefaultActor();
  const entry: ActivityEntry = {
    id: `act-${++activityId}`,
    actionType,
    description,
    actor: actorName,
    timestamp: Date.now(),
  };
  activity.store.update((draft) => {
    draft.entries.unshift(entry);
  }, actor);
}

export function clearLog(): void {
  const actor = getDefaultActor();
  activity.store.update((draft) => {
    draft.entries = [];
  }, actor);
}
