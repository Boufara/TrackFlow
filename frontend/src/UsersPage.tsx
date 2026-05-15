import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import type { AppUser } from './api';
import { getUsers, createUser, deleteUser, getCurrentUser } from './api';

interface Props {
  onBack: () => void;
}

export function UsersPage({ onBack }: Props) {
  const { t } = useTranslation();
  const [users, setUsers] = useState<AppUser[]>([]);
  const [form, setForm] = useState({ username: '', password: '', displayName: '', isAdmin: false });
  const currentUser = getCurrentUser();

  const load = () => getUsers().then(setUsers);
  useEffect(() => { load(); }, []);

  const handleCreate = async () => {
    if (!form.username || !form.password || !form.displayName) return;
    await createUser(form);
    setForm({ username: '', password: '', displayName: '', isAdmin: false });
    load();
  };

  const handleDelete = async (id: number) => {
    if (!confirm(t('confirmDeleteUser'))) return;
    await deleteUser(id);
    load();
  };

  return (
    <div className="app">
      <div className="project-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button className="btn small" onClick={onBack}>{t('back')}</button>
          <h2>{t('userManagement')}</h2>
        </div>
      </div>

      <div className="form-card">
        <h4 style={{ color: 'var(--accent)', marginBottom: 8 }}>{t('addUser')}</h4>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <input placeholder={t('username')} value={form.username} onChange={e => setForm({ ...form, username: e.target.value })} style={{ flex: 1 }} />
          <input type="password" placeholder={t('password')} value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} style={{ flex: 1 }} />
          <input placeholder={t('fullName')} value={form.displayName} onChange={e => setForm({ ...form, displayName: e.target.value })} style={{ flex: 1 }} />
          <label style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--text-secondary)', fontSize: 13 }}>
            <input type="checkbox" checked={form.isAdmin} onChange={e => setForm({ ...form, isAdmin: e.target.checked })} /> {t('admin')}
          </label>
          <button className="btn primary small" onClick={handleCreate}>{t('add')}</button>
        </div>
      </div>

      <div className="project-list" style={{ marginTop: 16 }}>
        {users.map(u => (
          <div key={u.id} className="project-card" style={{ cursor: 'default' }}>
            <div className="project-info">
              <h3>{u.displayName}</h3>
              <p>@{u.username}</p>
              {u.isAdmin && <small style={{ color: 'var(--yellow)' }}>{t('administrator')}</small>}
            </div>
            {u.id !== currentUser?.id && (
              <button className="btn danger small" onClick={(e) => { e.stopPropagation(); handleDelete(u.id); }}>{t('delete')}</button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
