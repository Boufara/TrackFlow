import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import type { Project } from './api';
import { getProjects, createProject, deleteProject, isLoggedIn, getCurrentUser, logout } from './api';
import { ProjectView } from './ProjectView';
import { LoginPage } from './LoginPage';
import { UsersPage } from './UsersPage';
import './App.css';

type Page = 'projects' | 'users';

function App() {
  const { t, i18n } = useTranslation();
  const [loggedIn, setLoggedIn] = useState(isLoggedIn());
  const [projects, setProjects] = useState<Project[]>([]);
  const [selected, setSelected] = useState<Project | null>(null);
  const [page, setPage] = useState<Page>('projects');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', description: '', repoPath: '' });
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    return (localStorage.getItem('trackflow_theme') as 'dark' | 'light') || 'dark';
  });

  const user = getCurrentUser();
  const isAdmin = user?.isAdmin ?? false;

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('trackflow_theme', theme);
  }, [theme]);

  const toggleLang = () => {
    const next = i18n.language === 'fr' ? 'en' : 'fr';
    i18n.changeLanguage(next);
    localStorage.setItem('trackflow_lang', next);
  };

  const load = () => getProjects().then(setProjects);
  useEffect(() => { if (loggedIn) load(); }, [loggedIn]);

  const handleCreate = async () => {
    if (!form.name || !form.repoPath) return;
    await createProject(form);
    setForm({ name: '', description: '', repoPath: '' });
    setShowForm(false);
    load();
  };

  const handleDelete = async (id: number) => {
    if (!confirm(t('confirmDeleteProject'))) return;
    await deleteProject(id);
    if (selected?.id === id) setSelected(null);
    load();
  };

  if (!loggedIn) {
    return <LoginPage onLogin={() => setLoggedIn(true)} />;
  }

  return (
    <div>
      <header className="global-header">
        <div className="global-header-left">
          <h1 onClick={() => { setSelected(null); setPage('projects'); }} style={{ cursor: 'pointer' }}>TrackFlow</h1>
          {selected && <span className="global-header-project">{selected.name}</span>}
          {page === 'users' && <span className="global-header-project">{t('users')}</span>}
        </div>
        <div className="header-actions">
          <span style={{ color: 'var(--text-secondary)', fontSize: 14 }}>{user?.displayName}</span>
          {isAdmin && !selected && page === 'projects' && (
            <button className="btn small" onClick={() => setPage('users')}>{t('users')}</button>
          )}
          <button className="btn small" onClick={toggleLang}>{i18n.language === 'fr' ? 'EN' : 'FR'}</button>
          <button className="btn small" onClick={() => setTheme(t => t === 'dark' ? 'light' : 'dark')} title={t('changeTheme')}>
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>
          <button className="btn danger small" onClick={() => { logout(); setLoggedIn(false); setSelected(null); setPage('projects'); }}>{t('logout')}</button>
        </div>
      </header>

      {page === 'users' && isAdmin ? (
        <UsersPage onBack={() => setPage('projects')} />
      ) : selected ? (
        <ProjectView project={selected} onBack={() => setSelected(null)} />
      ) : (
        <div className="app">
          {isAdmin && (
            <div style={{ marginBottom: 16 }}>
              <button className="btn primary" onClick={() => setShowForm(!showForm)}>{t('newProject')}</button>
            </div>
          )}

          {showForm && isAdmin && (
            <div className="form-card">
              <input placeholder={t('projectName')} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
              <input placeholder={t('descriptionOptional')} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
              <input placeholder={t('repoPath')} value={form.repoPath} onChange={e => setForm({ ...form, repoPath: e.target.value })} />
              <div className="form-actions">
                <button className="btn primary" onClick={handleCreate}>{t('create')}</button>
                <button className="btn" onClick={() => setShowForm(false)}>{t('cancel')}</button>
              </div>
            </div>
          )}

          <div className="project-list">
            {projects.map(p => (
              <div key={p.id} className="project-card" onClick={() => setSelected(p)}>
                <div className="project-info">
                  <h3>{p.name}</h3>
                  {p.description && <p>{p.description}</p>}
                  <small>{p.repoPath}</small>
                </div>
                {isAdmin && <button className="btn danger small" onClick={e => { e.stopPropagation(); handleDelete(p.id); }}>{t('delete')}</button>}
              </div>
            ))}
            {projects.length === 0 && <p className="empty">{t('noProjects')}</p>}
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
