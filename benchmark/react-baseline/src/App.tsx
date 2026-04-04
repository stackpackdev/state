import React, { useState, useCallback, useMemo } from 'react';
import { AuthProvider, useAuth } from './state/AuthContext';
import { ProjectProvider } from './state/ProjectContext';
import { NotificationProvider, useNotificationContext } from './state/NotificationContext';
import { SettingsProvider, useSettingsContext } from './state/SettingsContext';
import { ActivityProvider, useActivityContext } from './state/ActivityContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { NotificationToast } from './components/NotificationToast';
import { ThemeToggle } from './components/ThemeToggle';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { ProjectsPage } from './pages/ProjectsPage';
import { TaskBoardPage } from './pages/TaskBoardPage';
import { SettingsPage } from './pages/SettingsPage';
import { OnboardingWizard } from './pages/OnboardingWizard';
import type { PageId } from './types';

// ── Boilerplate counter (AppInner): 3x useState, 3x useCallback, 1x useMemo, 4x useContext (via hooks) ──
// ── Total app-level: 5 nested providers ──

type Tab = Exclude<PageId, 'login'>;

const TABS: { id: Tab; label: string }[] = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'projects', label: 'Projects' },
  { id: 'settings', label: 'Settings' },
  { id: 'onboarding', label: 'Onboarding' },
];

function NotificationLayer() {
  const { notifications, dismissNotification } = useNotificationContext();
  const { settings } = useSettingsContext();

  if (!settings.notificationsEnabled || notifications.length === 0) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 16,
        right: 16,
        width: 340,
        zIndex: 1000,
      }}
    >
      {notifications.map((n) => (
        <NotificationToast key={n.id} notification={n} onDismiss={dismissNotification} />
      ))}
    </div>
  );
}

function AppInner() {
  const { state: authState, logout } = useAuth();
  const { logActivity } = useActivityContext();
  const { settings } = useSettingsContext();

  const [currentTab, setCurrentTab] = useState<Tab>('dashboard');
  const [taskBoardProjectId, setTaskBoardProjectId] = useState<string | null>(null);
  const [showTaskBoard, setShowTaskBoard] = useState(false);

  const handleOpenProject = useCallback((projectId: string) => {
    setTaskBoardProjectId(projectId);
    setShowTaskBoard(true);
  }, []);

  const handleBackFromBoard = useCallback(() => {
    setShowTaskBoard(false);
    setTaskBoardProjectId(null);
  }, []);

  const handleLogout = useCallback(() => {
    const name = authState.user?.name ?? 'Unknown';
    logActivity('user_logout', `${name} logged out`, name);
    logout();
  }, [authState.user?.name, logActivity, logout]);

  // Theme styles
  const themeStyles = useMemo(
    () => ({
      backgroundColor: settings.theme === 'dark' ? '#111827' : '#ffffff',
      color: settings.theme === 'dark' ? '#f9fafb' : '#111827',
      minHeight: '100vh',
    }),
    [settings.theme]
  );

  return (
    <div style={themeStyles}>
      <ProtectedRoute fallback={<LoginPage />}>
        {/* Top nav */}
        <header
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '12px 24px',
            borderBottom: `1px solid ${settings.theme === 'dark' ? '#374151' : '#e5e7eb'}`,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
            <strong style={{ fontSize: 16 }}>PM Dashboard</strong>
            <nav style={{ display: 'flex', gap: 4 }}>
              {TABS.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => {
                    setCurrentTab(tab.id);
                    setShowTaskBoard(false);
                  }}
                  style={{
                    padding: '6px 14px',
                    borderRadius: 6,
                    border: 'none',
                    backgroundColor:
                      currentTab === tab.id && !showTaskBoard
                        ? settings.theme === 'dark'
                          ? '#374151'
                          : '#eff6ff'
                        : 'transparent',
                    color:
                      currentTab === tab.id && !showTaskBoard
                        ? '#3b82f6'
                        : settings.theme === 'dark'
                          ? '#d1d5db'
                          : '#6b7280',
                    fontSize: 13,
                    fontWeight: currentTab === tab.id && !showTaskBoard ? 600 : 400,
                    cursor: 'pointer',
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <ThemeToggle />
            <span style={{ fontSize: 13, color: '#6b7280' }}>
              {authState.user?.avatar} {authState.user?.name}
            </span>
            <button
              onClick={handleLogout}
              style={{
                padding: '6px 12px',
                borderRadius: 6,
                border: '1px solid #d1d5db',
                backgroundColor: 'transparent',
                color: '#ef4444',
                fontSize: 12,
                cursor: 'pointer',
              }}
            >
              Logout
            </button>
          </div>
        </header>

        {/* Page content */}
        <main style={{ padding: 24, maxWidth: 1100, margin: '0 auto' }}>
          {showTaskBoard && taskBoardProjectId ? (
            <TaskBoardPage projectId={taskBoardProjectId} onBack={handleBackFromBoard} />
          ) : currentTab === 'dashboard' ? (
            <DashboardPage />
          ) : currentTab === 'projects' ? (
            <ProjectsPage onOpenProject={handleOpenProject} />
          ) : currentTab === 'settings' ? (
            <SettingsPage />
          ) : currentTab === 'onboarding' ? (
            <OnboardingWizard onComplete={() => setCurrentTab('dashboard')} />
          ) : null}
        </main>
      </ProtectedRoute>

      <NotificationLayer />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <SettingsProvider>
        <ActivityProvider>
          <ProjectProvider>
            <NotificationProvider>
              <AppInner />
            </NotificationProvider>
          </ProjectProvider>
        </ActivityProvider>
      </SettingsProvider>
    </AuthProvider>
  );
}
