import React from 'react';
import { useStore, useComputed } from 'state-agent/react';
import { setTheme, toggleShowCompleted, toggleNotifications } from '../state/settings.store';
import { logActivity } from '../state/activity.store';
import type { Settings, User } from '../types';

export function SettingsPage() {
  const { value: settingsVal } = useStore<Settings>('settings');
  const userName = useComputed<string>('auth', 'userName');
  const { value: authState } = useStore<{ user: User | null }>('auth');

  const handleThemeChange = () => {
    const newTheme = settingsVal.theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    logActivity('settings_changed', `Theme changed to ${newTheme}`, userName);
  };

  const handleToggleCompleted = () => {
    toggleShowCompleted();
    logActivity(
      'settings_changed',
      `Show completed tasks: ${!settingsVal.showCompletedTasks ? 'on' : 'off'}`,
      userName
    );
  };

  const handleToggleNotifications = () => {
    toggleNotifications();
    logActivity(
      'settings_changed',
      `Notifications: ${!settingsVal.notificationsEnabled ? 'on' : 'off'}`,
      userName
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
            Currently: {settingsVal.theme === 'dark' ? 'Dark' : 'Light'}
          </div>
        </div>
        <button onClick={handleThemeChange} style={toggleBtnStyle(settingsVal.theme === 'dark')}>
          <div style={toggleDotStyle(settingsVal.theme === 'dark')} />
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
        <button onClick={handleToggleCompleted} style={toggleBtnStyle(settingsVal.showCompletedTasks)}>
          <div style={toggleDotStyle(settingsVal.showCompletedTasks)} />
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
        <button onClick={handleToggleNotifications} style={toggleBtnStyle(settingsVal.notificationsEnabled)}>
          <div style={toggleDotStyle(settingsVal.notificationsEnabled)} />
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
