import React, { createContext, useState, useCallback, useContext } from 'react';
import type { ActivityEntry, ActivityActionType } from '../types';

// ── Boilerplate counter: 1x createContext, 1x useState, 2x useCallback, 1x useContext ──

interface ActivityContextValue {
  entries: ActivityEntry[];
  logActivity: (actionType: ActivityActionType, description: string, actor: string) => void;
  clearLog: () => void;
}

export const ActivityContext = createContext<ActivityContextValue | null>(null);

let activityId = 0;

export function ActivityProvider({ children }: { children: React.ReactNode }) {
  const [entries, setEntries] = useState<ActivityEntry[]>([]);

  const logActivity = useCallback(
    (actionType: ActivityActionType, description: string, actor: string) => {
      const entry: ActivityEntry = {
        id: `act-${++activityId}`,
        actionType,
        description,
        actor,
        timestamp: Date.now(),
      };
      setEntries((prev) => [entry, ...prev]);
    },
    []
  );

  const clearLog = useCallback(() => {
    setEntries([]);
  }, []);

  return (
    <ActivityContext.Provider value={{ entries, logActivity, clearLog }}>
      {children}
    </ActivityContext.Provider>
  );
}

export function useActivityContext(): ActivityContextValue {
  const ctx = useContext(ActivityContext);
  if (!ctx) throw new Error('useActivityContext must be used within ActivityProvider');
  return ctx;
}
