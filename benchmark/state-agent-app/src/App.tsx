import React, { useState, useCallback, useMemo } from 'react';
import { useStore, useValue, useComputed, Gated } from 'state-agent/react';
import { AppStoreProvider } from './state/provider';
import { logout } from './state/auth.store';
import { logActivity } from './state/activity.store';
import { dismissNotification } from './state/notifications.store';
import { NotificationToast } from './components/NotificationToast';
import { ThemeToggle } from './components/ThemeToggle';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { ProjectsPage } from './pages/ProjectsPage';
import { TaskBoardPage } from './pages/TaskBoardPage';
import { SettingsPage } from './pages/SettingsPage';
import { OnboardingWizard } from './pages/OnboardingWizard';
import type { PageId, Notification, Theme, User } from './types';

type Tab = Exclude<PageId, 'login'>;

const TABS: { id: Tab; label: string }[] = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'projects', label: 'Projects' },
  { id: 'settings', label: 'Settings' },
  { id: 'onboarding', label: 'Onboarding' },
];

function NotificationLayer() {
  const notificationItems = useValue<Notification[]>('notifications', 'items');
  const notificationsEnabled = useValue<boolean>('settings', 'notificationsEnabled');

  if (!notificationsEnabled || notificationItems.length === 0) return null;

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
      {notificationItems.map((n) => (
        <NotificationToast key={n.id} notification={n} onDismiss={dismissNotification} />
      ))}
    </div>
  );
}

function AppInner() {
  const userName = useComputed<string>('auth', 'userName');
  const userAvatar = useComputed<string>('auth', 'userAvatar');
  const theme = useValue<Theme>('settings', 'theme');

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
    logActivity('user_logout', `${userName} logged out`, userName);
    logout();
  }, [userName]);

  // Theme styles
  const themeStyles = useMemo(
    () => ({
      backgroundColor: theme === 'dark' ? '#111827' : '#ffffff',
      color: theme === 'dark' ? '#f9fafb' : '#111827',
      minHeight: '100vh',
    }),
    [theme]
  );

  return (
    <div style={themeStyles}>
      {/* Gated component replaces ProtectedRoute — declarative auth gate */}
      <Gated store="auth" gate="isAuthenticated" fallback={<LoginPage />}>
        {/* Top nav */}
        <header
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '12px 24px',
            borderBottom: `1px solid ${theme === 'dark' ? '#374151' : '#e5e7eb'}`,
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
                        ? theme === 'dark'
                          ? '#374151'
                          : '#eff6ff'
                        : 'transparent',
                    color:
                      currentTab === tab.id && !showTaskBoard
                        ? '#3b82f6'
                        : theme === 'dark'
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
              {userAvatar} {userName}
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
      </Gated>

      <NotificationLayer />
    </div>
  );
}

// Single MultiStoreProvider replaces 5 nested context providers
export default function App() {
  return (
    <AppStoreProvider>
      <AppInner />
    </AppStoreProvider>
  );
}
