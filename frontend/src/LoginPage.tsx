import { useState } from 'react';
import { login, setAuth } from './api';

interface Props {
  onLogin: () => void;
}

export function LoginPage({ onLogin }: Props) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      const result = await login(username, password);
      setAuth(result.token, result.user);
      onLogin();
    } catch {
      setError('Identifiants invalides');
    }
  };

  return (
    <div className="login-page">
      <form className="login-form" onSubmit={handleSubmit}>
        <h1>TrackFlow</h1>
        {error && <div className="login-error">{error}</div>}
        <input
          placeholder="Nom d'utilisateur"
          value={username}
          onChange={e => setUsername(e.target.value)}
          autoFocus
        />
        <input
          type="password"
          placeholder="Mot de passe"
          value={password}
          onChange={e => setPassword(e.target.value)}
        />
        <button className="btn primary" type="submit">Se connecter</button>
      </form>
    </div>
  );
}
