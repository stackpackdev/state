import React, { createContext, useState, useCallback, useContext } from 'react';
import type { Settings, Theme } from '../types';

// ── Boilerplate counter: 1x createContext, 1x useState, 3x useCallback, 1x useContext ──

interface SettingsContextValue {
  settings: Settings;
  setTheme: (theme: Theme) => void;
  toggleShowCompleted: () => void;
  toggleNotifications: () => void;
}

const defaultSettings: Settings = {
  theme: 'light',
  showCompletedTasks: true,
  notificationsEnabled: true,
};

export const SettingsContext = createContext<SettingsContextValue | null>(null);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<Settings>(defaultSettings);

  const setTheme = useCallback((theme: Theme) => {
    setSettings((prev) => ({ ...prev, theme }));
  }, []);

  const toggleShowCompleted = useCallback(() => {
    setSettings((prev) => ({ ...prev, showCompletedTasks: !prev.showCompletedTasks }));
  }, []);

  const toggleNotifications = useCallback(() => {
    setSettings((prev) => ({ ...prev, notificationsEnabled: !prev.notificationsEnabled }));
  }, []);

  return (
    <SettingsContext.Provider value={{ settings, setTheme, toggleShowCompleted, toggleNotifications }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettingsContext(): SettingsContextValue {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettingsContext must be used within SettingsProvider');
  return ctx;
}
