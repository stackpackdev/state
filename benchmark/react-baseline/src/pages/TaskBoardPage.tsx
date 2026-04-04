import React, { useState, useCallback } from 'react';
import { useTasks } from '../hooks/useTasks';
import { useSearch } from '../hooks/useSearch';
import { SearchBar } from '../components/SearchBar';
import { TaskCard } from '../components/TaskCard';
import type { TaskPriority } from '../types';

// ── Boilerplate counter: 5x useState, 1x useCallback + hooks internals ──

const COLUMN_LABELS = {
  todo: 'To Do',
  'in-progress': 'In Progress',
  done: 'Done',
} as const;

const COLUMN_COLORS = {
  todo: '#6b7280',
  'in-progress': '#f59e0b',
  done: '#22c55e',
};

export function TaskBoardPage({
  projectId,
  onBack,
}: {
  projectId: string;
  onBack: () => void;
}) {
  const { filters, setQuery, setStatusFilter, setPriorityFilter, setAssigneeFilter, resetFilters, hasActiveFilters } =
    useSearch();
  const { columns, stats, project, addTask, updateTask, deleteTask, moveTask } =
    useTasks(projectId, filters);

  // New task form
  const [showAddForm, setShowAddForm] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newPriority, setNewPriority] = useState<TaskPriority>('medium');
  const [newAssignee, setNewAssignee] = useState('');

  const handleAddTask = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (newTitle.trim()) {
        addTask(newTitle.trim(), newDesc.trim(), newPriority, newAssignee.trim() || 'Unassigned');
        setNewTitle('');
        setNewDesc('');
        setNewPriority('medium');
        setNewAssignee('');
        setShowAddForm(false);
      }
    },
    [newTitle, newDesc, newPriority, newAssignee, addTask]
  );

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button
            onClick={onBack}
            style={{ background: 'none', border: 'none', fontSize: 14, color: '#3b82f6', cursor: 'pointer' }}
          >
            &larr; Back
          </button>
          <h2>{project?.name ?? 'Task Board'}</h2>
        </div>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          style={{
            padding: '8px 16px',
            backgroundColor: '#3b82f6',
            color: '#fff',
            border: 'none',
            borderRadius: 6,
            fontSize: 13,
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          {showAddForm ? 'Cancel' : '+ Add Task'}
        </button>
      </div>

      {/* Stats bar */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 16, fontSize: 13, color: '#6b7280' }}>
        <span>Total: {stats.total}</span>
        <span>Done: {stats.completed} ({stats.completionPercent}%)</span>
        <span>In Progress: {stats.inProgress}</span>
        <span>To Do: {stats.todo}</span>
        <span style={{ color: '#ef4444' }}>High Priority: {stats.highPriority}</span>
      </div>

      {/* Add task form */}
      {showAddForm && (
        <form
          onSubmit={handleAddTask}
          style={{
            padding: 16,
            border: '1px solid #d1d5db',
            borderRadius: 8,
            marginBottom: 16,
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
          }}
        >
          <input
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="Task title"
            style={{ padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 14 }}
            autoFocus
          />
          <textarea
            value={newDesc}
            onChange={(e) => setNewDesc(e.target.value)}
            placeholder="Description"
            rows={2}
            style={{ padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 14, resize: 'vertical' }}
          />
          <div style={{ display: 'flex', gap: 8 }}>
            <select
              value={newPriority}
              onChange={(e) => setNewPriority(e.target.value as TaskPriority)}
              style={{ padding: '6px 10px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 13 }}
            >
              <option value="low">Low Priority</option>
              <option value="medium">Medium Priority</option>
              <option value="high">High Priority</option>
            </select>
            <input
              value={newAssignee}
              onChange={(e) => setNewAssignee(e.target.value)}
              placeholder="Assignee"
              style={{ padding: '6px 10px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 13, flex: 1 }}
            />
          </div>
          <button
            type="submit"
            style={{
              alignSelf: 'flex-start',
              padding: '8px 20px',
              backgroundColor: '#22c55e',
              color: '#fff',
              border: 'none',
              borderRadius: 6,
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Add Task
          </button>
        </form>
      )}

      {/* Search & filters */}
      <SearchBar
        query={filters.query}
        status={filters.status}
        priority={filters.priority}
        assignee={filters.assignee}
        hasActiveFilters={hasActiveFilters}
        onQueryChange={setQuery}
        onStatusChange={setStatusFilter}
        onPriorityChange={setPriorityFilter}
        onAssigneeChange={setAssigneeFilter}
        onReset={resetFilters}
      />

      {/* Kanban columns */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
        {(Object.keys(COLUMN_LABELS) as Array<keyof typeof COLUMN_LABELS>).map((colKey) => (
          <div
            key={colKey}
            style={{
              backgroundColor: '#f9fafb',
              borderRadius: 8,
              padding: 12,
              minHeight: 200,
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 12,
                paddingBottom: 8,
                borderBottom: `2px solid ${COLUMN_COLORS[colKey]}`,
              }}
            >
              <span style={{ fontWeight: 600, fontSize: 14, color: COLUMN_COLORS[colKey] }}>
                {COLUMN_LABELS[colKey]}
              </span>
              <span style={{ fontSize: 12, color: '#9ca3af' }}>{columns[colKey].length}</span>
            </div>

            {columns[colKey].length === 0 ? (
              <p style={{ fontSize: 12, color: '#d1d5db', textAlign: 'center', padding: 20 }}>
                No tasks
              </p>
            ) : (
              columns[colKey].map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  onEdit={(t) => updateTask(t)}
                  onDelete={(id) => deleteTask(id)}
                  onMove={(t, s) => moveTask(t, s)}
                />
              ))
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
