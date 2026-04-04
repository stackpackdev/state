import { useState, useMemo, useCallback } from 'react';
import type { SearchFilters, TaskStatus, TaskPriority } from '../types';

// ── Boilerplate counter: 1x useState, 4x useCallback, 1x useMemo ──

const INITIAL_FILTERS: SearchFilters = {
  query: '',
  status: 'all',
  priority: 'all',
  assignee: '',
};

export function useSearch() {
  const [filters, setFilters] = useState<SearchFilters>(INITIAL_FILTERS);

  const setQuery = useCallback((query: string) => {
    setFilters((prev) => ({ ...prev, query }));
  }, []);

  const setStatusFilter = useCallback((status: TaskStatus | 'all') => {
    setFilters((prev) => ({ ...prev, status }));
  }, []);

  const setPriorityFilter = useCallback((priority: TaskPriority | 'all') => {
    setFilters((prev) => ({ ...prev, priority }));
  }, []);

  const setAssigneeFilter = useCallback((assignee: string) => {
    setFilters((prev) => ({ ...prev, assignee }));
  }, []);

  const resetFilters = useCallback(() => {
    setFilters(INITIAL_FILTERS);
  }, []);

  const hasActiveFilters = useMemo(() => {
    return (
      filters.query !== '' ||
      filters.status !== 'all' ||
      filters.priority !== 'all' ||
      filters.assignee !== ''
    );
  }, [filters]);

  return {
    filters,
    setQuery,
    setStatusFilter,
    setPriorityFilter,
    setAssigneeFilter,
    resetFilters,
    hasActiveFilters,
  };
}
