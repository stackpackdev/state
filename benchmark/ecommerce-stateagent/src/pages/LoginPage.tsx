import React from 'react';
import { useStore, useWhen } from 'state-agent/react';
import { auth, login } from '../state/auth.store';

export function LoginPage() {
  const state = useStore(auth.store);
  const isLoading = useWhen(auth.store, 'isLoading');
  const [username, setUsername] = React.useState('');
  const [password, setPassword] = React.useState('');

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
        <button type="submit" disabled={isLoading}>
          {isLoading ? 'Logging in...' : 'Login'}
        </button>
        {state.error && <p className="error">{state.error}</p>}
      </form>
    </div>
  );
}
