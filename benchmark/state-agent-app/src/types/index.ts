// ── Auth ──

export interface User {
  id: string;
  name: string;
  email: string;
  avatar: string;
}

// ── Projects ──

export type ProjectStatus = 'active' | 'archived';

export interface Project {
  id: string;
  name: string;
  description: string;
  status: ProjectStatus;
  createdAt: string;
  tasks: Task[];
}

// ── Tasks ──

export type TaskStatus = 'todo' | 'in-progress' | 'done';
export type TaskPriority = 'low' | 'medium' | 'high';

export interface Task {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  assignee: string;
  createdAt: string;
}

// ── Notifications ──

export type NotificationType = 'success' | 'error' | 'info' | 'warning';

export interface Notification {
  id: string;
  type: NotificationType;
  message: string;
  createdAt: number;
  duration: number; // ms, 0 = no auto-dismiss
}

// ── Settings ──

export type Theme = 'light' | 'dark';

export interface Settings {
  theme: Theme;
  showCompletedTasks: boolean;
  notificationsEnabled: boolean;
}

// ── Activity Log ──

export type ActivityActionType =
  | 'project_created'
  | 'project_updated'
  | 'project_deleted'
  | 'task_created'
  | 'task_updated'
  | 'task_deleted'
  | 'task_moved'
  | 'user_login'
  | 'user_logout'
  | 'settings_changed'
  | 'wizard_completed';

export interface ActivityEntry {
  id: string;
  actionType: ActivityActionType;
  description: string;
  actor: string;
  timestamp: number;
}

// ── Wizard ──

export type WizardStepId = 'profile' | 'preferences' | 'review';

export interface WizardStep {
  id: WizardStepId;
  label: string;
  isCompleted: boolean;
}

export interface WizardData {
  displayName: string;
  role: string;
  defaultProjectView: 'list' | 'board';
  emailNotifications: boolean;
}

// ── Search / Filters ──

export interface SearchFilters {
  query: string;
  status: TaskStatus | 'all';
  priority: TaskPriority | 'all';
  assignee: string;
}

// ── Page navigation ──

export type PageId =
  | 'login'
  | 'dashboard'
  | 'projects'
  | 'taskboard'
  | 'settings'
  | 'onboarding';
