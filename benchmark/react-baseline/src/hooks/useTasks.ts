import { useCallback, useMemo } from 'react';
import { useProjectContext } from '../state/ProjectContext';
import { useActivityContext } from '../state/ActivityContext';
import { useNotificationContext } from '../state/NotificationContext';
import { useAuth } from '../state/AuthContext';
import { useSettingsContext } from '../state/SettingsContext';
import type { Task, TaskStatus, TaskPriority, SearchFilters } from '../types';

// ── Boilerplate counter: 4x useCallback, 4x useMemo + 5x useContext (via hooks) ──

export function useTasks(projectId: string, filters?: SearchFilters) {
  const { state, addTask, updateTask, deleteTask, optimisticMoveTask } = useProjectContext();
  const { logActivity } = useActivityContext();
  const { addNotification } = useNotificationContext();
  const { state: authState } = useAuth();
  const { settings } = useSettingsContext();

  const actorName = authState.user?.name ?? 'Unknown';

  const project = useMemo(
    () => state.projects.find((p) => p.id === projectId),
    [state.projects, projectId]
  );

  const allTasks = project?.tasks ?? [];

  // Apply filters + settings
  const filteredTasks = useMemo(() => {
    let result = allTasks;

    if (!settings.showCompletedTasks) {
      result = result.filter((t) => t.status !== 'done');
    }

    if (filters) {
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
    }

    return result;
  }, [allTasks, filters, settings.showCompletedTasks]);

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

  const handleAddTask = useCallback(
    (title: string, description: string, priority: TaskPriority, assignee: string) => {
      addTask(projectId, { title, description, status: 'todo', priority, assignee });
      logActivity('task_created', `Created task "${title}" in ${project?.name ?? projectId}`, actorName);
      addNotification('success', `Task "${title}" created`);
    },
    [projectId, project?.name, addTask, logActivity, addNotification, actorName]
  );

  const handleUpdateTask = useCallback(
    (task: Task) => {
      updateTask(projectId, task);
      logActivity('task_updated', `Updated task "${task.title}"`, actorName);
    },
    [projectId, updateTask, logActivity, actorName]
  );

  const handleDeleteTask = useCallback(
    (taskId: string) => {
      const task = allTasks.find((t) => t.id === taskId);
      deleteTask(projectId, taskId);
      logActivity('task_deleted', `Deleted task "${task?.title ?? taskId}"`, actorName);
      addNotification('warning', 'Task deleted');
    },
    [projectId, allTasks, deleteTask, logActivity, addNotification, actorName]
  );

  const handleMoveTask = useCallback(
    async (task: Task, newStatus: TaskStatus) => {
      logActivity('task_moved', `Moving "${task.title}" to ${newStatus}`, actorName);
      const success = await optimisticMoveTask(projectId, task, newStatus);
      if (success) {
        addNotification('success', `Task moved to ${newStatus}`);
      } else {
        addNotification('error', `Failed to move task - rolled back`);
        logActivity('task_moved', `Rollback: "${task.title}" move failed`, actorName);
      }
      return success;
    },
    [projectId, optimisticMoveTask, logActivity, addNotification, actorName]
  );

  return {
    tasks: filteredTasks,
    allTasks,
    columns,
    stats,
    project,
    addTask: handleAddTask,
    updateTask: handleUpdateTask,
    deleteTask: handleDeleteTask,
    moveTask: handleMoveTask,
  };
}
