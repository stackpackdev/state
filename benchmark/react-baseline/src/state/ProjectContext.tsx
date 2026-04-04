import React, { createContext, useReducer, useCallback, useContext } from 'react';
import type { ProjectState, ProjectAction, Project, Task } from '../types';

// ── Boilerplate counter: 1x createContext, 1x useReducer, 7x useCallback, 1x useContext ──

const initialState: ProjectState = {
  projects: [],
  isLoading: false,
  error: null,
};

function projectReducer(state: ProjectState, action: ProjectAction): ProjectState {
  switch (action.type) {
    case 'SET_PROJECTS':
      return { ...state, projects: action.payload, isLoading: false, error: null };
    case 'ADD_PROJECT':
      return { ...state, projects: [...state.projects, action.payload] };
    case 'UPDATE_PROJECT':
      return {
        ...state,
        projects: state.projects.map((p) =>
          p.id === action.payload.id ? action.payload : p
        ),
      };
    case 'DELETE_PROJECT':
      return {
        ...state,
        projects: state.projects.filter((p) => p.id !== action.payload),
      };
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    case 'SET_ERROR':
      return { ...state, error: action.payload, isLoading: false };
    case 'ADD_TASK': {
      return {
        ...state,
        projects: state.projects.map((p) =>
          p.id === action.payload.projectId
            ? { ...p, tasks: [...p.tasks, action.payload.task] }
            : p
        ),
      };
    }
    case 'UPDATE_TASK': {
      return {
        ...state,
        projects: state.projects.map((p) =>
          p.id === action.payload.projectId
            ? {
                ...p,
                tasks: p.tasks.map((t) =>
                  t.id === action.payload.task.id ? action.payload.task : t
                ),
              }
            : p
        ),
      };
    }
    case 'DELETE_TASK': {
      return {
        ...state,
        projects: state.projects.map((p) =>
          p.id === action.payload.projectId
            ? { ...p, tasks: p.tasks.filter((t) => t.id !== action.payload.taskId) }
            : p
        ),
      };
    }
    case 'ROLLBACK_TASK': {
      return {
        ...state,
        projects: state.projects.map((p) =>
          p.id === action.payload.projectId
            ? {
                ...p,
                tasks: p.tasks.map((t) =>
                  t.id === action.payload.task.id ? action.payload.task : t
                ),
              }
            : p
        ),
      };
    }
    default:
      return state;
  }
}

// ── Seed data ──

const SEED_TASKS: Task[] = [
  { id: 't1', title: 'Design wireframes', description: 'Create low-fi wireframes for the dashboard', status: 'done', priority: 'high', assignee: 'Alice Admin', createdAt: '2026-02-01' },
  { id: 't2', title: 'Implement auth flow', description: 'Login, logout, token refresh', status: 'in-progress', priority: 'high', assignee: 'Bob User', createdAt: '2026-02-05' },
  { id: 't3', title: 'Write unit tests', description: 'Cover auth and project modules', status: 'todo', priority: 'medium', assignee: 'Alice Admin', createdAt: '2026-02-10' },
  { id: 't4', title: 'Setup CI pipeline', description: 'GitHub Actions for build + test', status: 'todo', priority: 'low', assignee: 'Bob User', createdAt: '2026-02-12' },
  { id: 't5', title: 'API documentation', description: 'Swagger/OpenAPI spec', status: 'in-progress', priority: 'medium', assignee: 'Alice Admin', createdAt: '2026-02-15' },
  { id: 't6', title: 'Performance audit', description: 'Lighthouse + bundle analysis', status: 'todo', priority: 'low', assignee: 'Bob User', createdAt: '2026-02-18' },
];

const SEED_PROJECTS: Project[] = [
  {
    id: 'p1',
    name: 'Website Redesign',
    description: 'Complete overhaul of the company website with new branding',
    status: 'active',
    createdAt: '2026-01-15',
    tasks: SEED_TASKS.slice(0, 3),
  },
  {
    id: 'p2',
    name: 'Mobile App v2',
    description: 'React Native rewrite of the legacy mobile application',
    status: 'active',
    createdAt: '2026-02-01',
    tasks: SEED_TASKS.slice(3),
  },
  {
    id: 'p3',
    name: 'Data Migration',
    description: 'Migrate from PostgreSQL to CockroachDB',
    status: 'archived',
    createdAt: '2025-11-20',
    tasks: [],
  },
];

interface ProjectContextValue {
  state: ProjectState;
  fetchProjects: () => Promise<void>;
  addProject: (project: Omit<Project, 'id' | 'createdAt' | 'tasks'>) => void;
  updateProject: (project: Project) => void;
  deleteProject: (id: string) => void;
  addTask: (projectId: string, task: Omit<Task, 'id' | 'createdAt'>) => void;
  updateTask: (projectId: string, task: Task) => void;
  deleteTask: (projectId: string, taskId: string) => void;
  optimisticMoveTask: (projectId: string, task: Task, newStatus: Task['status']) => Promise<boolean>;
}

export const ProjectContext = createContext<ProjectContextValue | null>(null);

let idCounter = 100;
function nextId(prefix: string) {
  return `${prefix}${++idCounter}`;
}

export function ProjectProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(projectReducer, initialState);

  const fetchProjects = useCallback(async () => {
    dispatch({ type: 'SET_LOADING', payload: true });
    // Simulate 800ms fetch
    await new Promise((r) => setTimeout(r, 800));
    dispatch({ type: 'SET_PROJECTS', payload: SEED_PROJECTS });
  }, []);

  const addProject = useCallback((data: Omit<Project, 'id' | 'createdAt' | 'tasks'>) => {
    const project: Project = {
      ...data,
      id: nextId('p'),
      createdAt: new Date().toISOString().slice(0, 10),
      tasks: [],
    };
    dispatch({ type: 'ADD_PROJECT', payload: project });
  }, []);

  const updateProject = useCallback((project: Project) => {
    dispatch({ type: 'UPDATE_PROJECT', payload: project });
  }, []);

  const deleteProject = useCallback((id: string) => {
    dispatch({ type: 'DELETE_PROJECT', payload: id });
  }, []);

  const addTask = useCallback((projectId: string, data: Omit<Task, 'id' | 'createdAt'>) => {
    const task: Task = {
      ...data,
      id: nextId('t'),
      createdAt: new Date().toISOString().slice(0, 10),
    };
    dispatch({ type: 'ADD_TASK', payload: { projectId, task } });
  }, []);

  const updateTask = useCallback((projectId: string, task: Task) => {
    dispatch({ type: 'UPDATE_TASK', payload: { projectId, task } });
  }, []);

  const deleteTask = useCallback((projectId: string, taskId: string) => {
    dispatch({ type: 'DELETE_TASK', payload: { projectId, taskId } });
  }, []);

  // Optimistic update: immediately change status, then simulate server with 20% failure
  const optimisticMoveTask = useCallback(async (projectId: string, task: Task, newStatus: Task['status']): Promise<boolean> => {
    const originalTask = { ...task };
    const updatedTask = { ...task, status: newStatus };

    // Optimistically update
    dispatch({ type: 'UPDATE_TASK', payload: { projectId, task: updatedTask } });

    // Simulate server call
    await new Promise((r) => setTimeout(r, 600));
    const failed = Math.random() < 0.2;

    if (failed) {
      // Rollback
      dispatch({ type: 'ROLLBACK_TASK', payload: { projectId, task: originalTask } });
      return false;
    }
    return true;
  }, []);

  return (
    <ProjectContext.Provider
      value={{
        state,
        fetchProjects,
        addProject,
        updateProject,
        deleteProject,
        addTask,
        updateTask,
        deleteTask,
        optimisticMoveTask,
      }}
    >
      {children}
    </ProjectContext.Provider>
  );
}

export function useProjectContext(): ProjectContextValue {
  const ctx = useContext(ProjectContext);
  if (!ctx) throw new Error('useProjectContext must be used within ProjectProvider');
  return ctx;
}
