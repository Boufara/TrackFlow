import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import type { Project, ProjectStats } from './api';
import { getProjects, createProject, deleteProject, isLoggedIn, getCurrentUser, logout, getProjectsStats } from './api';
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

  const [stats, setStats] = useState<Record<number, ProjectStats>>({});
  const [deleteConfirm, setDeleteConfirm] = useState<{ project: Project; name: string; password: string } | null>(null);
  const [deleteError, setDeleteError] = useState('');

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

  const load = () => { getProjects().then(setProjects); getProjectsStats().then(setStats); };
  useEffect(() => { if (loggedIn) load(); }, [loggedIn]);

  const handleCreate = async () => {
    if (!form.name || !form.repoPath) return;
    await createProject(form);
    setForm({ name: '', description: '', repoPath: '' });
    setShowForm(false);
    load();
  };

  const handleDeleteConfirm = async () => {
    if (!deleteConfirm) return;
    if (deleteConfirm.name !== deleteConfirm.project.name) {
      setDeleteError(t('projectNameMismatch'));
      return;
    }
    if (deleteConfirm.password !== 'admin') {
      setDeleteError(t('wrongPassword'));
      return;
    }
    await deleteProject(deleteConfirm.project.id);
    if (selected?.id === deleteConfirm.project.id) setSelected(null);
    setDeleteConfirm(null);
    setDeleteError('');
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
        <ProjectView project={selected} onBack={() => setSelected(null)} onProjectUpdate={(p) => { setSelected(p); setProjects(prev => prev.map(pr => pr.id === p.id ? p : pr)); }} />
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
            {projects.map(p => {
              const s = stats[p.id];
              const totalH = s ? Math.floor(s.totalMinutes / 60) : 0;
              const totalM = s ? Math.round(s.totalMinutes % 60) : 0;
              return (
                <div key={p.id} className="project-card" onClick={() => setSelected(p)}>
                  <div className="project-card-row">
                    <div className="project-info">
                      <h3>{p.name}</h3>
                      {p.description && <p>{p.description}</p>}
                    </div>
                    <div className="project-actions">
                      <span className={`project-status-badge ps-${p.status || 'active'}`}>{t(`projectStatus.${p.status || 'active'}`)}</span>
                      {isAdmin && (
                        <button className="btn danger small" onClick={e => { e.stopPropagation(); setDeleteConfirm({ project: p, name: '', password: '' }); setDeleteError(''); }}>
                          {t('delete')}
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="project-card-row">
                    <small>{p.repoPath}</small>
                    {s && s.total > 0 && (
                      <div className="project-stats-inline">
                        <div className="stat-chip total-card">{s.total} {t('tasks')}</div>
                        {(['validated', 'in_progress', 'to_review', 'a_discuter', 'todo', 'rejected'] as const).map(status => {
                          const count = s.statusCounts[status] || 0;
                          const cls: Record<string, string> = { validated: 'validated', in_progress: 'progress', to_review: 'review', rejected: 'rejected', a_discuter: 'discuss', todo: 'todo' };
                          return <div key={status} className={`stat-chip ${cls[status]}`}>{count} {t(`status.${status}`)}</div>;
                        })}
                        {s.totalMinutes > 0 && <div className="stat-chip hours">⏱ {totalH > 0 ? `${totalH}h${totalM > 0 ? `${totalM}m` : ''}` : `${totalM}m`}</div>}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
            {projects.length === 0 && <p className="empty">{t('noProjects')}</p>}
          </div>
        </div>
      )}

      {deleteConfirm && (
        <div className="modal-overlay" onClick={() => setDeleteConfirm(null)}>
          <div className="modal" style={{ width: 420 }} onClick={e => e.stopPropagation()}>
            <h3 style={{ color: 'var(--red)' }}>{t('confirmDeleteProject')}</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginBottom: 16 }}>
              {t('typeProjectName')} <strong style={{ color: 'var(--text-primary)' }}>{deleteConfirm.project.name}</strong>
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <input
                placeholder={t('projectName')}
                value={deleteConfirm.name}
                onChange={e => setDeleteConfirm({ ...deleteConfirm, name: e.target.value })}
                style={{ padding: '8px 12px', background: 'var(--bg-input)', border: '1px solid var(--border-input)', borderRadius: 6, color: 'var(--text-primary)', fontSize: 14 }}
              />
              <input
                type="password"
                placeholder={t('password')}
                value={deleteConfirm.password}
                onChange={e => setDeleteConfirm({ ...deleteConfirm, password: e.target.value })}
                onKeyDown={e => { if (e.key === 'Enter') handleDeleteConfirm(); }}
                style={{ padding: '8px 12px', background: 'var(--bg-input)', border: '1px solid var(--border-input)', borderRadius: 6, color: 'var(--text-primary)', fontSize: 14 }}
              />
              {deleteError && <span style={{ color: 'var(--red)', fontSize: 13 }}>{deleteError}</span>}
              <div className="form-actions">
                <button className="btn danger" onClick={handleDeleteConfirm}>{t('delete')}</button>
                <button className="btn" onClick={() => setDeleteConfirm(null)}>{t('cancel')}</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
