import React, { useState, useCallback } from 'react';
import { useWhen, useValue } from 'state-agent/react';
import { login } from '../state/auth.store';
import { logActivity } from '../state/activity.store';

export function LoginPage() {
  const { hasError } = useWhen('auth');
  const isLoading = useValue<boolean>('auth', 'isLoading');
  const error = useValue<string | null>('auth', 'error');

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      await login(username, password);
      // If login succeeds, auth state will update and the app will redirect
      // We log activity after a short delay to check auth state
      setTimeout(() => {
        logActivity('user_login', `User "${username}" logged in`, username);
      }, 600);
    },
    [username, password]
  );

  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '80vh',
      }}
    >
      <form
        onSubmit={handleSubmit}
        style={{
          width: 340,
          padding: 32,
          border: '1px solid #e5e7eb',
          borderRadius: 12,
          boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
        }}
      >
        <h2 style={{ marginBottom: 24, textAlign: 'center' }}>Sign In</h2>

        {hasError && error && (
          <div
            style={{
              padding: '8px 12px',
              marginBottom: 16,
              backgroundColor: '#fef2f2',
              color: '#ef4444',
              borderRadius: 6,
              fontSize: 13,
            }}
          >
            {error}
          </div>
        )}

        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'block', fontSize: 13, marginBottom: 4, color: '#374151' }}>
            Username
          </label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="admin or user"
            style={{
              width: '100%',
              padding: '8px 12px',
              border: '1px solid #d1d5db',
              borderRadius: 6,
              fontSize: 14,
            }}
          />
        </div>

        <div style={{ marginBottom: 24 }}>
          <label style={{ display: 'block', fontSize: 13, marginBottom: 4, color: '#374151' }}>
            Password
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="any value"
            style={{
              width: '100%',
              padding: '8px 12px',
              border: '1px solid #d1d5db',
              borderRadius: 6,
              fontSize: 14,
            }}
          />
        </div>

        <button
          type="submit"
          disabled={isLoading}
          style={{
            width: '100%',
            padding: '10px 0',
            backgroundColor: isLoading ? '#9ca3af' : '#3b82f6',
            color: '#fff',
            border: 'none',
            borderRadius: 6,
            fontSize: 14,
            fontWeight: 600,
            cursor: isLoading ? 'not-allowed' : 'pointer',
          }}
        >
          {isLoading ? 'Signing in...' : 'Sign In'}
        </button>

        <p style={{ marginTop: 16, fontSize: 12, color: '#9ca3af', textAlign: 'center' }}>
          Try username: "admin" or "user" (any password)
        </p>
      </form>
    </div>
  );
}
