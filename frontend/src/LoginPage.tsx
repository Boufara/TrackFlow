import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { login, setAuth } from './api';

interface Props {
  onLogin: () => void;
}

export function LoginPage({ onLogin }: Props) {
  const { t } = useTranslation();
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
      setError(t('loginError'));
    }
  };

  return (
    <div className="login-page">
      <form className="login-form" onSubmit={handleSubmit}>
        <h1>TrackFlow</h1>
        {error && <div className="login-error">{error}</div>}
        <input placeholder={t('username')} value={username} onChange={e => setUsername(e.target.value)} autoFocus />
        <input type="password" placeholder={t('password')} value={password} onChange={e => setPassword(e.target.value)} />
        <button className="btn primary" type="submit">{t('loginButton')}</button>
      </form>
    </div>
  );
}
