import React from 'react';
import { useValue } from 'state-agent/react';
import { setTheme } from '../state/settings.store';
import type { Theme } from '../types';

export function ThemeToggle() {
  const theme = useValue<Theme>('settings', 'theme');

  return (
    <button
      onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
      style={{
        padding: '6px 12px',
        borderRadius: 6,
        border: '1px solid #d1d5db',
        backgroundColor: theme === 'dark' ? '#1f2937' : '#fff',
        color: theme === 'dark' ? '#f9fafb' : '#374151',
        cursor: 'pointer',
        fontSize: 13,
      }}
    >
      {theme === 'light' ? 'Dark Mode' : 'Light Mode'}
    </button>
  );
}
