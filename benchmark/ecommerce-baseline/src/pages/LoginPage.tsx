import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth';

export function LoginPage() {
  const { state, login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await login(username, password);
  };

  return (
    <div className="login-page">
      <h1>Login</h1>
      <form onSubmit={handleSubmit}>
        <input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Username" />
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" />
        <button type="submit" disabled={state.isLoading}>
          {state.isLoading ? 'Logging in...' : 'Login'}
        </button>
        {state.error && <p className="error">{state.error}</p>}
      </form>
    </div>
  );
}
