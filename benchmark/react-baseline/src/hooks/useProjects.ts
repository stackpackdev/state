import { useEffect, useState, useCallback, useMemo } from 'react';
import { useProjectContext } from '../state/ProjectContext';
import { useActivityContext } from '../state/ActivityContext';
import { useNotificationContext } from '../state/NotificationContext';
import { useAuth } from '../state/AuthContext';
import type { Project } from '../types';

// ── Boilerplate counter: 1x useEffect, 2x useState, 4x useCallback, 1x useMemo + 4x useContext (via hooks) ──

export function useProjects() {
  const { state, fetchProjects, addProject, updateProject, deleteProject } = useProjectContext();
  const { logActivity } = useActivityContext();
  const { addNotification } = useNotificationContext();
  const { state: authState } = useAuth();
  const [hasFetched, setHasFetched] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const actorName = authState.user?.name ?? 'Unknown';

  useEffect(() => {
    if (!hasFetched) {
      fetchProjects();
      setHasFetched(true);
    }
  }, [hasFetched, fetchProjects]);

  const handleAddProject = useCallback(
    (name: string, description: string) => {
      addProject({ name, description, status: 'active' });
      logActivity('project_created', `Created project "${name}"`, actorName);
      addNotification('success', `Project "${name}" created`);
    },
    [addProject, logActivity, addNotification, actorName]
  );

  const handleUpdateProject = useCallback(
    (project: Project) => {
      updateProject(project);
      logActivity('project_updated', `Updated project "${project.name}"`, actorName);
      addNotification('info', `Project "${project.name}" updated`);
      setEditingId(null);
    },
    [updateProject, logActivity, addNotification, actorName]
  );

  const handleDeleteProject = useCallback(
    (id: string) => {
      const project = state.projects.find((p) => p.id === id);
      deleteProject(id);
      logActivity('project_deleted', `Deleted project "${project?.name ?? id}"`, actorName);
      addNotification('warning', `Project deleted`);
    },
    [state.projects, deleteProject, logActivity, addNotification, actorName]
  );

  const handleArchiveProject = useCallback(
    (project: Project) => {
      const updated = { ...project, status: 'archived' as const };
      updateProject(updated);
      logActivity('project_updated', `Archived project "${project.name}"`, actorName);
      addNotification('info', `Project "${project.name}" archived`);
    },
    [updateProject, logActivity, addNotification, actorName]
  );

  const activeProjects = useMemo(
    () => state.projects.filter((p) => p.status === 'active'),
    [state.projects]
  );

  return {
    projects: state.projects,
    activeProjects,
    isLoading: state.isLoading,
    error: state.error,
    editingId,
    setEditingId,
    addProject: handleAddProject,
    updateProject: handleUpdateProject,
    deleteProject: handleDeleteProject,
    archiveProject: handleArchiveProject,
  };
}
