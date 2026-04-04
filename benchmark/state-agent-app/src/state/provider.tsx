import React from 'react';
import { MultiStoreProvider } from 'state-agent/react';
import { auth } from './auth.store';
import { projects } from './projects.store';
import { notifications } from './notifications.store';
import { settings } from './settings.store';
import { activity } from './activity.store';
import { onboarding } from './onboarding.flow';

// All stores provided at once — no nested provider boilerplate
const allStores = [
  auth.store,
  projects.store,
  notifications.store,
  settings.store,
  activity.store,
  onboarding.store,
];

export function AppStoreProvider({ children }: { children: React.ReactNode }) {
  return (
    // @ts-expect-error React 18/19 JSX type mismatch with state-agent built against React 19
    <MultiStoreProvider stores={allStores}>
      {children}
    </MultiStoreProvider>
  );
}
