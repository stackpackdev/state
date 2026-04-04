import React from 'react';
import { useComputed } from 'state-agent/react';
import { StatsPanel } from '../components/StatsPanel';
import { ActivityFeed } from '../components/ActivityFeed';

export function DashboardPage() {
  const userName = useComputed<string>('auth', 'userName');

  return (
    <div>
      <h2 style={{ marginBottom: 8 }}>Dashboard</h2>
      <p style={{ color: '#6b7280', marginBottom: 24, fontSize: 14 }}>
        Welcome back, {userName}
      </p>

      <h3 style={{ marginBottom: 12, fontSize: 16 }}>Project Statistics</h3>
      <StatsPanel />

      <h3 style={{ marginTop: 32, marginBottom: 12, fontSize: 16 }}>Recent Activity</h3>
      <ActivityFeed />
    </div>
  );
}
