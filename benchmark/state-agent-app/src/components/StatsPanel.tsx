import React from 'react';
import { useComputed } from 'state-agent/react';

// Uses useComputed instead of useMemo — derived values are defined in the store
export function StatsPanel() {
  const activeProjects = useComputed<number>('projects', 'activeCount');
  const archivedProjects = useComputed<number>('projects', 'archivedCount');
  const totalTasks = useComputed<number>('projects', 'totalTasks');
  const completedTasks = useComputed<number>('projects', 'completedTasks');
  const inProgressTasks = useComputed<number>('projects', 'inProgressTasks');
  const todoTasks = useComputed<number>('projects', 'todoTasks');
  const completionPercent = useComputed<number>('projects', 'completionPercent');
  const highPriority = useComputed<number>('projects', 'highPriorityTasks');

  const cards: { label: string; value: string | number; color: string }[] = [
    { label: 'Total Tasks', value: totalTasks, color: '#3b82f6' },
    { label: 'Completed', value: completedTasks, color: '#22c55e' },
    { label: 'In Progress', value: inProgressTasks, color: '#f59e0b' },
    { label: 'To Do', value: todoTasks, color: '#6b7280' },
    { label: 'Completion', value: `${completionPercent}%`, color: '#8b5cf6' },
    { label: 'High Priority', value: highPriority, color: '#ef4444' },
    { label: 'Active Projects', value: activeProjects, color: '#06b6d4' },
    { label: 'Archived', value: archivedProjects, color: '#9ca3af' },
  ];

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 12 }}>
      {cards.map((card) => (
        <div
          key={card.label}
          style={{
            padding: 16,
            borderRadius: 8,
            border: '1px solid #e5e7eb',
            textAlign: 'center',
          }}
        >
          <div style={{ fontSize: 24, fontWeight: 700, color: card.color }}>{card.value}</div>
          <div style={{ fontSize: 12, color: '#6b7280', marginTop: 4 }}>{card.label}</div>
        </div>
      ))}
    </div>
  );
}
