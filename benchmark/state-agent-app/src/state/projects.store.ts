import { defineStore, z, getDefaultActor } from 'state-agent';
import type { Project, Task, TaskStatus } from '../types';
import { logActivity } from './activity.store';

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

// Use z.any() for the deeply nested projects array to keep schema manageable
// while still having top-level structure validated
export const projects = defineStore({
  name: 'projects',
  schema: z.object({
    projects: z.array(z.any()),
    isLoading: z.boolean(),
    error: z.union([z.string(), z.null()]),
  }),
  initial: {
    projects: [] as Project[],
    isLoading: false,
    error: null as string | null,
  },
  when: {
    isLoading: (s) => s.isLoading,
    hasError: (s) => s.error !== null,
    isEmpty: (s) => s.projects.length === 0,
  },
  gates: {
    hasProjects: (s) => s.projects.length > 0,
  },
  computed: {
    activeCount: (s) => s.projects.filter((p: Project) => p.status === 'active').length,
    archivedCount: (s) => s.projects.filter((p: Project) => p.status === 'archived').length,
    allTasks: (s) => s.projects.flatMap((p: Project) => p.tasks),
    totalTasks: (s) => s.projects.flatMap((p: Project) => p.tasks).length,
    completedTasks: (s) => s.projects.flatMap((p: Project) => p.tasks).filter((t: Task) => t.status === 'done').length,
    inProgressTasks: (s) => s.projects.flatMap((p: Project) => p.tasks).filter((t: Task) => t.status === 'in-progress').length,
    todoTasks: (s) => s.projects.flatMap((p: Project) => p.tasks).filter((t: Task) => t.status === 'todo').length,
    completionPercent: (s) => {
      const tasks = s.projects.flatMap((p: Project) => p.tasks);
      const total = tasks.length;
      const completed = tasks.filter((t: Task) => t.status === 'done').length;
      return total > 0 ? Math.round((completed / total) * 100) : 0;
    },
    highPriorityTasks: (s) => s.projects.flatMap((p: Project) => p.tasks).filter((t: Task) => t.priority === 'high').length,
  },
  middleware: [
    {
      name: 'activityLogger',
      enter: (action, state) => action,
      leave: (_action, _prevState, _nextState) => {
        // Activity logging is done explicitly at the call site for precise descriptions
      },
    },
  ],
  dependencies: {
    reads: [],
    gatedBy: ['auth'],
    triggers: ['activity'],
  },
});

let idCounter = 100;
function nextId(prefix: string) {
  return `${prefix}${++idCounter}`;
}

export async function fetchProjects(): Promise<void> {
  const actor = getDefaultActor();
  projects.store.update((draft) => {
    draft.isLoading = true;
  }, actor);

  // Simulate 800ms fetch
  await new Promise((r) => setTimeout(r, 800));

  projects.store.update((draft) => {
    draft.projects = SEED_PROJECTS;
    draft.isLoading = false;
    draft.error = null;
  }, actor);
}

export function addProject(name: string, description: string): void {
  const actor = getDefaultActor();
  const project: Project = {
    id: nextId('p'),
    name,
    description,
    status: 'active',
    createdAt: new Date().toISOString().slice(0, 10),
    tasks: [],
  };
  projects.store.update((draft) => {
    draft.projects.push(project);
  }, actor);
}

export function updateProject(project: Project): void {
  const actor = getDefaultActor();
  projects.store.update((draft) => {
    const idx = draft.projects.findIndex((p: Project) => p.id === project.id);
    if (idx >= 0) {
      draft.projects[idx] = project;
    }
  }, actor);
}

export function deleteProject(id: string): void {
  const actor = getDefaultActor();
  projects.store.update((draft) => {
    draft.projects = draft.projects.filter((p: Project) => p.id !== id);
  }, actor);
}

export function addTask(
  projectId: string,
  title: string,
  description: string,
  priority: Task['priority'],
  assignee: string
): void {
  const actor = getDefaultActor();
  const task: Task = {
    id: nextId('t'),
    title,
    description,
    status: 'todo',
    priority,
    assignee,
    createdAt: new Date().toISOString().slice(0, 10),
  };
  projects.store.update((draft) => {
    const project = draft.projects.find((p: Project) => p.id === projectId);
    if (project) {
      project.tasks.push(task);
    }
  }, actor);
}

export function updateTask(projectId: string, task: Task): void {
  const actor = getDefaultActor();
  projects.store.update((draft) => {
    const project = draft.projects.find((p: Project) => p.id === projectId);
    if (project) {
      const idx = project.tasks.findIndex((t: Task) => t.id === task.id);
      if (idx >= 0) {
        project.tasks[idx] = task;
      }
    }
  }, actor);
}

export function deleteTask(projectId: string, taskId: string): void {
  const actor = getDefaultActor();
  projects.store.update((draft) => {
    const project = draft.projects.find((p: Project) => p.id === projectId);
    if (project) {
      project.tasks = project.tasks.filter((t: Task) => t.id !== taskId);
    }
  }, actor);
}

// Optimistic update: immediately change status, then simulate server with 20% failure
export async function optimisticMoveTask(
  projectId: string,
  task: Task,
  newStatus: TaskStatus
): Promise<boolean> {
  const actor = getDefaultActor();
  const originalTask = { ...task };
  const updatedTask = { ...task, status: newStatus };

  // Optimistically update
  updateTask(projectId, updatedTask);

  // Simulate server call
  await new Promise((r) => setTimeout(r, 600));
  const failed = Math.random() < 0.2;

  if (failed) {
    // Rollback
    updateTask(projectId, originalTask);
    return false;
  }
  return true;
}
