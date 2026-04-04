import { useMemo } from 'react';
import { useActivityContext } from '../state/ActivityContext';
import type { ActivityActionType } from '../types';

// ── Boilerplate counter: 1x useMemo, 1x useContext (via hook) ──

export function useActivityLog(filterType?: ActivityActionType) {
  const { entries, logActivity, clearLog } = useActivityContext();

  const filtered = useMemo(() => {
    if (!filterType) return entries;
    return entries.filter((e) => e.actionType === filterType);
  }, [entries, filterType]);

  const recentEntries = useMemo(() => {
    return filtered.slice(0, 20);
  }, [filtered]);

  return {
    entries: filtered,
    recentEntries,
    totalCount: entries.length,
    logActivity,
    clearLog,
  };
}
