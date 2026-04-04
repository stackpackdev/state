import React from 'react';
import { useSettingsContext } from '../state/SettingsContext';

// ── Boilerplate counter: 1x useContext (via hook) ──

export function ThemeToggle() {
  const { settings, setTheme } = useSettingsContext();

  return (
    <button
      onClick={() => setTheme(settings.theme === 'light' ? 'dark' : 'light')}
      style={{
        padding: '6px 12px',
        borderRadius: 6,
        border: '1px solid #d1d5db',
        backgroundColor: settings.theme === 'dark' ? '#1f2937' : '#fff',
        color: settings.theme === 'dark' ? '#f9fafb' : '#374151',
        cursor: 'pointer',
        fontSize: 13,
      }}
    >
      {settings.theme === 'light' ? 'Dark Mode' : 'Light Mode'}
    </button>
  );
}
