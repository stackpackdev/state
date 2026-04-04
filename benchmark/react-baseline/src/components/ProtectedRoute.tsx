import React from 'react';
import { useAuth } from '../state/AuthContext';

// ── Boilerplate counter: 1x useContext (via hook) ──

interface ProtectedRouteProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function ProtectedRoute({ children, fallback }: ProtectedRouteProps) {
  const { state } = useAuth();

  if (state.isLoading) {
    return <div style={{ padding: 40, textAlign: 'center' }}>Authenticating...</div>;
  }

  if (!state.isAuthenticated) {
    return fallback ? <>{fallback}</> : null;
  }

  return <>{children}</>;
}
