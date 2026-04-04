// Barrel export for all stores
export { auth, login, logout } from './auth.store';
export { projects, fetchProjects, addProject, updateProject, deleteProject, addTask, updateTask, deleteTask, optimisticMoveTask } from './projects.store';
export { notifications, addNotification, dismissNotification } from './notifications.store';
export { settings, setTheme, toggleShowCompleted, toggleNotifications } from './settings.store';
export { activity, logActivity, clearLog } from './activity.store';
export { onboarding, goNext, goBack, goToStep, updateWizardData, resetWizard } from './onboarding.flow';
