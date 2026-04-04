import React, { useState, useCallback, useMemo } from 'react';
import { useStore, useValue, useComputed } from 'state-agent/react';
import { addTask, updateTask, deleteTask, optimisticMoveTask } from '../state/projects.store';
import { logActivity } from '../state/activity.store';
import { addNotification } from '../state/notifications.store';
import { SearchBar } from '../components/SearchBar';
import { TaskCard } from '../components/TaskCard';
import type { Project, Task, TaskStatus, TaskPriority, SearchFilters } from '../types';

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

const INITIAL_FILTERS: SearchFilters = {
  query: '',
  status: 'all',
  priority: 'all',
  assignee: '',
};

export function TaskBoardPage({
  projectId,
  onBack,
}: {
  projectId: string;
  onBack: () => void;
}) {
  const { value: projectState } = useStore<{ projects: Project[] }>('projects');
  const showCompletedTasks = useValue<boolean>('settings', 'showCompletedTasks');
  const userName = useComputed<string>('auth', 'userName');

  // Find the project
  const project = useMemo(
    () => projectState.projects.find((p) => p.id === projectId),
    [projectState.projects, projectId]
  );
  const allTasks = project?.tasks ?? [];

  // Search/filter state
  const [filters, setFilters] = useState<SearchFilters>(INITIAL_FILTERS);

  const hasActiveFilters = useMemo(() => {
    return (
      filters.query !== '' ||
      filters.status !== 'all' ||
      filters.priority !== 'all' ||
      filters.assignee !== ''
    );
  }, [filters]);

  // Apply filters + settings
  const filteredTasks = useMemo(() => {
    let result = allTasks;

    if (!showCompletedTasks) {
      result = result.filter((t) => t.status !== 'done');
    }

    if (filters.query) {
      const q = filters.query.toLowerCase();
      result = result.filter(
        (t) =>
          t.title.toLowerCase().includes(q) ||
          t.description.toLowerCase().includes(q)
      );
    }
    if (filters.status !== 'all') {
      result = result.filter((t) => t.status === filters.status);
    }
    if (filters.priority !== 'all') {
      result = result.filter((t) => t.priority === filters.priority);
    }
    if (filters.assignee) {
      result = result.filter((t) =>
        t.assignee.toLowerCase().includes(filters.assignee.toLowerCase())
      );
    }

    return result;
  }, [allTasks, filters, showCompletedTasks]);

  // Column-grouped tasks for kanban
  const columns = useMemo(() => {
    const todo = filteredTasks.filter((t) => t.status === 'todo');
    const inProgress = filteredTasks.filter((t) => t.status === 'in-progress');
    const done = filteredTasks.filter((t) => t.status === 'done');
    return { todo, 'in-progress': inProgress, done };
  }, [filteredTasks]);

  // Stats
  const stats = useMemo(() => {
    const total = allTasks.length;
    const completed = allTasks.filter((t) => t.status === 'done').length;
    const inProgress = allTasks.filter((t) => t.status === 'in-progress').length;
    const todo = allTasks.filter((t) => t.status === 'todo').length;
    const completionPercent = total > 0 ? Math.round((completed / total) * 100) : 0;
    const highPriority = allTasks.filter((t) => t.priority === 'high').length;
    return { total, completed, inProgress, todo, completionPercent, highPriority };
  }, [allTasks]);

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
        addTask(projectId, newTitle.trim(), newDesc.trim(), newPriority, newAssignee.trim() || 'Unassigned');
        logActivity('task_created', `Created task "${newTitle.trim()}" in ${project?.name ?? projectId}`, userName);
        addNotification('success', `Task "${newTitle.trim()}" created`);
        setNewTitle('');
        setNewDesc('');
        setNewPriority('medium');
        setNewAssignee('');
        setShowAddForm(false);
      }
    },
    [newTitle, newDesc, newPriority, newAssignee, projectId, project?.name, userName]
  );

  const handleUpdateTask = useCallback(
    (task: Task) => {
      updateTask(projectId, task);
      logActivity('task_updated', `Updated task "${task.title}"`, userName);
    },
    [projectId, userName]
  );

  const handleDeleteTask = useCallback(
    (taskId: string) => {
      const task = allTasks.find((t) => t.id === taskId);
      deleteTask(projectId, taskId);
      logActivity('task_deleted', `Deleted task "${task?.title ?? taskId}"`, userName);
      addNotification('warning', 'Task deleted');
    },
    [projectId, allTasks, userName]
  );

  const handleMoveTask = useCallback(
    async (task: Task, newStatus: TaskStatus) => {
      logActivity('task_moved', `Moving "${task.title}" to ${newStatus}`, userName);
      const success = await optimisticMoveTask(projectId, task, newStatus);
      if (success) {
        addNotification('success', `Task moved to ${newStatus}`);
      } else {
        addNotification('error', `Failed to move task - rolled back`);
        logActivity('task_moved', `Rollback: "${task.title}" move failed`, userName);
      }
    },
    [projectId, userName]
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
        onQueryChange={(query) => setFilters((prev) => ({ ...prev, query }))}
        onStatusChange={(status) => setFilters((prev) => ({ ...prev, status }))}
        onPriorityChange={(priority) => setFilters((prev) => ({ ...prev, priority }))}
        onAssigneeChange={(assignee) => setFilters((prev) => ({ ...prev, assignee }))}
        onReset={() => setFilters(INITIAL_FILTERS)}
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
                  onEdit={(t) => handleUpdateTask(t)}
                  onDelete={(id) => handleDeleteTask(id)}
                  onMove={(t, s) => handleMoveTask(t, s)}
                />
              ))
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
