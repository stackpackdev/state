import React from 'react';
import { useComputed } from 'state-agent/react';
import { clearLog } from '../state/activity.store';
import type { ActivityEntry } from '../types';

function formatTime(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

const ACTION_LABELS: Record<string, string> = {
  project_created: 'New Project',
  project_updated: 'Project Update',
  project_deleted: 'Project Deleted',
  task_created: 'New Task',
  task_updated: 'Task Update',
  task_deleted: 'Task Deleted',
  task_moved: 'Task Moved',
  user_login: 'Login',
  user_logout: 'Logout',
  settings_changed: 'Settings',
  wizard_completed: 'Onboarding',
};

export function ActivityFeed() {
  const recentEntries = useComputed<ActivityEntry[]>('activity', 'recentEntries');
  const totalCount = useComputed<number>('activity', 'totalCount');

  if (recentEntries.length === 0) {
    return (
      <div style={{ padding: 16, color: '#9ca3af', fontSize: 14 }}>
        No activity recorded yet.
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <span style={{ fontSize: 13, color: '#6b7280' }}>{totalCount} total entries</span>
        <button
          onClick={clearLog}
          style={{ fontSize: 12, color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer' }}
        >
          Clear log
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {recentEntries.map((entry) => (
          <div
            key={entry.id}
            style={{
              display: 'flex',
              gap: 10,
              padding: '8px 10px',
              borderRadius: 6,
              backgroundColor: '#f9fafb',
              fontSize: 13,
              alignItems: 'center',
            }}
          >
            <span style={{ color: '#9ca3af', fontSize: 11, minWidth: 50 }}>
              {formatTime(entry.timestamp)}
            </span>
            <span
              style={{
                fontSize: 10,
                fontWeight: 600,
                backgroundColor: '#e5e7eb',
                padding: '2px 6px',
                borderRadius: 4,
                minWidth: 80,
                textAlign: 'center',
              }}
            >
              {ACTION_LABELS[entry.actionType] ?? entry.actionType}
            </span>
            <span style={{ flex: 1 }}>{entry.description}</span>
            <span style={{ fontSize: 11, color: '#9ca3af' }}>{entry.actor}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
