import React from 'react';
import { useSettingsContext } from '../state/SettingsContext';
import { useActivityContext } from '../state/ActivityContext';
import { useAuth } from '../state/AuthContext';

// ── Boilerplate counter: 3x useContext (via hooks) ──

export function SettingsPage() {
  const { settings, setTheme, toggleShowCompleted, toggleNotifications } = useSettingsContext();
  const { logActivity } = useActivityContext();
  const { state: authState } = useAuth();

  const actorName = authState.user?.name ?? 'Unknown';

  const handleThemeChange = () => {
    const newTheme = settings.theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    logActivity('settings_changed', `Theme changed to ${newTheme}`, actorName);
  };

  const handleToggleCompleted = () => {
    toggleShowCompleted();
    logActivity(
      'settings_changed',
      `Show completed tasks: ${!settings.showCompletedTasks ? 'on' : 'off'}`,
      actorName
    );
  };

  const handleToggleNotifications = () => {
    toggleNotifications();
    logActivity(
      'settings_changed',
      `Notifications: ${!settings.notificationsEnabled ? 'on' : 'off'}`,
      actorName
    );
  };

  const toggleRowStyle: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px 0',
    borderBottom: '1px solid #e5e7eb',
  };

  const toggleBtnStyle = (active: boolean): React.CSSProperties => ({
    width: 48,
    height: 26,
    borderRadius: 13,
    border: 'none',
    backgroundColor: active ? '#3b82f6' : '#d1d5db',
    position: 'relative',
    cursor: 'pointer',
    transition: 'background-color 0.2s',
  });

  const toggleDotStyle = (active: boolean): React.CSSProperties => ({
    position: 'absolute',
    top: 3,
    left: active ? 24 : 3,
    width: 20,
    height: 20,
    borderRadius: '50%',
    backgroundColor: '#fff',
    transition: 'left 0.2s',
  });

  return (
    <div style={{ maxWidth: 500 }}>
      <h2 style={{ marginBottom: 24 }}>Settings</h2>

      {/* Theme */}
      <div style={toggleRowStyle}>
        <div>
          <div style={{ fontWeight: 600, fontSize: 14 }}>Dark Mode</div>
          <div style={{ fontSize: 12, color: '#6b7280' }}>
            Currently: {settings.theme === 'dark' ? 'Dark' : 'Light'}
          </div>
        </div>
        <button onClick={handleThemeChange} style={toggleBtnStyle(settings.theme === 'dark')}>
          <div style={toggleDotStyle(settings.theme === 'dark')} />
        </button>
      </div>

      {/* Show completed tasks */}
      <div style={toggleRowStyle}>
        <div>
          <div style={{ fontWeight: 600, fontSize: 14 }}>Show Completed Tasks</div>
          <div style={{ fontSize: 12, color: '#6b7280' }}>
            Display tasks marked as done on the board
          </div>
        </div>
        <button onClick={handleToggleCompleted} style={toggleBtnStyle(settings.showCompletedTasks)}>
          <div style={toggleDotStyle(settings.showCompletedTasks)} />
        </button>
      </div>

      {/* Notifications */}
      <div style={toggleRowStyle}>
        <div>
          <div style={{ fontWeight: 600, fontSize: 14 }}>Notifications</div>
          <div style={{ fontSize: 12, color: '#6b7280' }}>
            Show toast notifications for actions
          </div>
        </div>
        <button onClick={handleToggleNotifications} style={toggleBtnStyle(settings.notificationsEnabled)}>
          <div style={toggleDotStyle(settings.notificationsEnabled)} />
        </button>
      </div>

      {/* User info */}
      <div style={{ marginTop: 32, padding: 16, backgroundColor: '#f9fafb', borderRadius: 8 }}>
        <h3 style={{ fontSize: 14, marginBottom: 8 }}>Account</h3>
        <div style={{ fontSize: 13, color: '#6b7280' }}>
          <div>Name: {authState.user?.name ?? 'N/A'}</div>
          <div>Email: {authState.user?.email ?? 'N/A'}</div>
          <div>ID: {authState.user?.id ?? 'N/A'}</div>
        </div>
      </div>
    </div>
  );
}
