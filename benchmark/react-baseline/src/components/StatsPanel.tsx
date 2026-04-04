import React, { useMemo } from 'react';
import { useProjectContext } from '../state/ProjectContext';

// ── Boilerplate counter: 1x useMemo, 1x useContext (via hook) ──

export function StatsPanel() {
  const { state } = useProjectContext();

  const stats = useMemo(() => {
    const allTasks = state.projects.flatMap((p) => p.tasks);
    const total = allTasks.length;
    const completed = allTasks.filter((t) => t.status === 'done').length;
    const inProgress = allTasks.filter((t) => t.status === 'in-progress').length;
    const todo = allTasks.filter((t) => t.status === 'todo').length;
    const completionPercent = total > 0 ? Math.round((completed / total) * 100) : 0;
    const highPriority = allTasks.filter((t) => t.priority === 'high').length;
    const activeProjects = state.projects.filter((p) => p.status === 'active').length;
    const archivedProjects = state.projects.filter((p) => p.status === 'archived').length;

    return { total, completed, inProgress, todo, completionPercent, highPriority, activeProjects, archivedProjects };
  }, [state.projects]);

  const cards: { label: string; value: string | number; color: string }[] = [
    { label: 'Total Tasks', value: stats.total, color: '#3b82f6' },
    { label: 'Completed', value: stats.completed, color: '#22c55e' },
    { label: 'In Progress', value: stats.inProgress, color: '#f59e0b' },
    { label: 'To Do', value: stats.todo, color: '#6b7280' },
    { label: 'Completion', value: `${stats.completionPercent}%`, color: '#8b5cf6' },
    { label: 'High Priority', value: stats.highPriority, color: '#ef4444' },
    { label: 'Active Projects', value: stats.activeProjects, color: '#06b6d4' },
    { label: 'Archived', value: stats.archivedProjects, color: '#9ca3af' },
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
