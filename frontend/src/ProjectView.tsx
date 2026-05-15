import { useState, useEffect } from 'react';
import type { Project, TaskItem } from './api';
import { getTasks, createTask, deleteTask, updateTask } from './api';
import { TaskModal } from './TaskModal';

const STATUSES = ['todo', 'in_progress', 'to_review', 'validated', 'rejected'];
const STATUS_LABELS: Record<string, string> = {
  todo: 'A faire',
  in_progress: 'En cours',
  to_review: 'A tester',
  validated: 'Valide',
  rejected: 'Rejete',
};

interface Props {
  project: Project;
  onBack: () => void;
}

export function ProjectView({ project, onBack }: Props) {
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [selectedTask, setSelectedTask] = useState<TaskItem | null>(null);
  const [form, setForm] = useState({ title: '', description: '', priority: 'medium', assignedTo: '' });

  const load = () => getTasks(project.id).then(setTasks);
  useEffect(() => { load(); }, [project.id]);

  const handleCreate = async () => {
    if (!form.title) return;
    await createTask(project.id, form);
    setForm({ title: '', description: '', priority: 'medium', assignedTo: '' });
    setShowForm(false);
    load();
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Supprimer cette tache ?')) return;
    await deleteTask(id);
    load();
  };

  const handleStatusChange = async (task: TaskItem, newStatus: string) => {
    if (newStatus === 'validated') {
      setSelectedTask({ ...task, status: newStatus });
      return;
    }
    await updateTask(task.id, { ...task, status: newStatus });
    load();
  };

  const tasksByStatus = (status: string) => tasks.filter(t => t.status === status);

  return (
    <div className="app">
      <div className="project-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button className="btn" onClick={onBack}>← Retour</button>
          <h2>{project.name}</h2>
        </div>
        <div className="header-actions">
          <button className="btn primary" onClick={() => setShowForm(!showForm)}>+ Nouvelle tache</button>
        </div>
      </div>

      {showForm && (
        <div className="form-card">
          <input placeholder="Titre de la tache" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
          <textarea placeholder="Description (optionnel)" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
          <div style={{ display: 'flex', gap: 10 }}>
            <select value={form.priority} onChange={e => setForm({ ...form, priority: e.target.value })}>
              <option value="low">Basse</option>
              <option value="medium">Moyenne</option>
              <option value="high">Haute</option>
            </select>
            <input placeholder="Assigne a" value={form.assignedTo} onChange={e => setForm({ ...form, assignedTo: e.target.value })} />
          </div>
          <div className="form-actions">
            <button className="btn primary" onClick={handleCreate}>Creer</button>
            <button className="btn" onClick={() => setShowForm(false)}>Annuler</button>
          </div>
        </div>
      )}

      <div className="status-columns">
        {STATUSES.map(status => (
          <div key={status} className={`status-column col-${status}`}>
            <h4>{STATUS_LABELS[status]} <span className="count-badge">{tasksByStatus(status).length}</span></h4>
            {tasksByStatus(status).map(task => (
              <div
                key={task.id}
                className={`task-card priority-${task.priority}`}
                onClick={() => setSelectedTask(task)}
              >
                <div className="title">{task.title}</div>
                <div className="meta">
                  <span>{task.assignedTo || '—'}</span>
                  <span>{new Date(task.createdAt).toLocaleDateString('fr-CA')}</span>
                </div>
                <div style={{ display: 'flex', gap: 4, marginTop: 6, flexWrap: 'wrap' }}>
                  {STATUSES.filter(s => s !== task.status).map(s => (
                    <button
                      key={s}
                      className="btn small"
                      onClick={e => { e.stopPropagation(); handleStatusChange(task, s); }}
                      style={{ fontSize: 10, padding: '2px 6px' }}
                    >
                      → {STATUS_LABELS[s]}
                    </button>
                  ))}
                  <button
                    className="btn danger small"
                    onClick={e => { e.stopPropagation(); handleDelete(task.id); }}
                    style={{ fontSize: 10, padding: '2px 6px' }}
                  >
                    ×
                  </button>
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>

      {selectedTask && (
        <TaskModal
          task={selectedTask}
          projectId={project.id}
          onClose={() => { setSelectedTask(null); load(); }}
        />
      )}
    </div>
  );
}
