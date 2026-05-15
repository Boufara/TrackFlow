import { useState, useEffect } from 'react';
import type { Project } from './api';
import { getProjects, createProject, deleteProject } from './api';
import { ProjectView } from './ProjectView';
import './App.css';

function App() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [selected, setSelected] = useState<Project | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', description: '', repoPath: '' });

  const load = () => getProjects().then(setProjects);
  useEffect(() => { load(); }, []);

  const handleCreate = async () => {
    if (!form.name || !form.repoPath) return;
    await createProject(form);
    setForm({ name: '', description: '', repoPath: '' });
    setShowForm(false);
    load();
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Supprimer ce projet ?')) return;
    await deleteProject(id);
    if (selected?.id === id) setSelected(null);
    load();
  };

  if (selected) {
    return <ProjectView project={selected} onBack={() => setSelected(null)} />;
  }

  return (
    <div className="app">
      <header>
        <h1>TrackFlow</h1>
        <button className="btn primary" onClick={() => setShowForm(!showForm)}>+ Nouveau projet</button>
      </header>

      {showForm && (
        <div className="form-card">
          <input placeholder="Nom du projet" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
          <input placeholder="Description (optionnel)" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
          <input placeholder="Chemin du repo git" value={form.repoPath} onChange={e => setForm({ ...form, repoPath: e.target.value })} />
          <div className="form-actions">
            <button className="btn primary" onClick={handleCreate}>Creer</button>
            <button className="btn" onClick={() => setShowForm(false)}>Annuler</button>
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
            <button className="btn danger small" onClick={e => { e.stopPropagation(); handleDelete(p.id); }}>Supprimer</button>
          </div>
        ))}
        {projects.length === 0 && <p className="empty">Aucun projet. Creez-en un pour commencer.</p>}
      </div>
    </div>
  );
}

export default App;
