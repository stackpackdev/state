import React from 'react';
import type { TaskStatus, TaskPriority } from '../types';

// ── Boilerplate counter: 0 hooks (controlled from parent via props) ──

interface SearchBarProps {
  query: string;
  status: TaskStatus | 'all';
  priority: TaskPriority | 'all';
  assignee: string;
  hasActiveFilters: boolean;
  onQueryChange: (q: string) => void;
  onStatusChange: (s: TaskStatus | 'all') => void;
  onPriorityChange: (p: TaskPriority | 'all') => void;
  onAssigneeChange: (a: string) => void;
  onReset: () => void;
}

const chipStyle = (active: boolean): React.CSSProperties => ({
  padding: '4px 10px',
  borderRadius: 16,
  border: `1px solid ${active ? '#3b82f6' : '#d1d5db'}`,
  backgroundColor: active ? '#eff6ff' : '#fff',
  color: active ? '#3b82f6' : '#374151',
  fontSize: 12,
  cursor: 'pointer',
});

export function SearchBar({
  query,
  status,
  priority,
  assignee,
  hasActiveFilters,
  onQueryChange,
  onStatusChange,
  onPriorityChange,
  onAssigneeChange,
  onReset,
}: SearchBarProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
      {/* Search input */}
      <input
        type="text"
        value={query}
        onChange={(e) => onQueryChange(e.target.value)}
        placeholder="Search tasks..."
        style={{
          padding: '8px 12px',
          border: '1px solid #d1d5db',
          borderRadius: 6,
          fontSize: 14,
          width: '100%',
        }}
      />

      {/* Filter chips row */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
        <span style={{ fontSize: 12, color: '#6b7280', marginRight: 4 }}>Status:</span>
        {(['all', 'todo', 'in-progress', 'done'] as const).map((s) => (
          <button key={s} onClick={() => onStatusChange(s)} style={chipStyle(status === s)}>
            {s}
          </button>
        ))}

        <span style={{ fontSize: 12, color: '#6b7280', marginLeft: 12, marginRight: 4 }}>Priority:</span>
        {(['all', 'low', 'medium', 'high'] as const).map((p) => (
          <button key={p} onClick={() => onPriorityChange(p)} style={chipStyle(priority === p)}>
            {p}
          </button>
        ))}
      </div>

      {/* Assignee filter */}
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <input
          type="text"
          value={assignee}
          onChange={(e) => onAssigneeChange(e.target.value)}
          placeholder="Filter by assignee..."
          style={{
            padding: '6px 10px',
            border: '1px solid #d1d5db',
            borderRadius: 6,
            fontSize: 13,
            width: 200,
          }}
        />
        {hasActiveFilters && (
          <button
            onClick={onReset}
            style={{
              fontSize: 12,
              color: '#ef4444',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              textDecoration: 'underline',
            }}
          >
            Clear all filters
          </button>
        )}
      </div>
    </div>
  );
}
