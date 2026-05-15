import { useState, useEffect } from 'react';
import type { Project, TaskItem, ProjectMember, AppUser } from './api';
import { getTasks, createTask, deleteTask, updateTask, getMembers, addMember, removeMember, getUsers, getCurrentUser } from './api';
import { TaskModal } from './TaskModal';

const STATUSES = ['todo', 'in_progress', 'to_review', 'validated', 'rejected', 'a_discuter'];
const STATUS_LABELS: Record<string, string> = {
  todo: 'A faire',
  in_progress: 'En cours',
  to_review: 'A tester',
  validated: 'Valide',
  rejected: 'Rejete',
  a_discuter: 'A discuter',
};
const STATUS_COLORS: Record<string, string> = {
  todo: '#9ca3af',
  in_progress: '#58a6ff',
  to_review: '#d29922',
  validated: '#3fb950',
  rejected: '#f85149',
  a_discuter: '#bc8cff',
};

interface Props {
  project: Project;
  onBack: () => void;
}

export function ProjectView({ project, onBack }: Props) {
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [members, setMembers] = useState<ProjectMember[]>([]);
  const [allUsers, setAllUsers] = useState<AppUser[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [showMembers, setShowMembers] = useState(false);
  const [selectedTask, setSelectedTask] = useState<TaskItem | null>(null);
  const [form, setForm] = useState({ title: '', description: '', priority: 'medium', assignedTo: '' });
  const [addUserId, setAddUserId] = useState('');
  const [filterSearch, setFilterSearch] = useState('');
  const [filterPriority, setFilterPriority] = useState('');
  const [filterAssigned, setFilterAssigned] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  const currentUser = getCurrentUser();
  const isAdmin = currentUser?.isAdmin ?? false;

  const load = () => getTasks(project.id).then(setTasks);
  const loadMembers = () => getMembers(project.id).then(setMembers);

  useEffect(() => { load(); loadMembers(); }, [project.id]);
  useEffect(() => { if (showMembers) getUsers().then(setAllUsers); }, [showMembers]);

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
    const update = { ...task, status: newStatus };
    if (newStatus === 'in_progress' && !task.assignedTo && currentUser) {
      update.assignedTo = currentUser.displayName;
    }
    await updateTask(task.id, update);
    load();
  };

  const handleAddMember = async () => {
    if (!addUserId) return;
    await addMember(project.id, parseInt(addUserId));
    setAddUserId('');
    loadMembers();
  };

  const handleRemoveMember = async (id: number) => {
    await removeMember(id);
    loadMembers();
  };

  // Build assignee list from members + any assigned names in tasks
  const assigneeNames = Array.from(new Set([
    ...members.map(m => m.userName),
    ...tasks.map(t => t.assignedTo).filter(Boolean)
  ])).sort();

  const filtered = tasks.filter(t => {
    if (filterSearch && !t.title.toLowerCase().includes(filterSearch.toLowerCase()) && !t.description?.toLowerCase().includes(filterSearch.toLowerCase()) && !String(t.id).includes(filterSearch)) return false;
    if (filterPriority && t.priority !== filterPriority) return false;
    if (filterStatus && t.status !== filterStatus) return false;
    if (filterAssigned === '_none' && t.assignedTo) return false;
    if (filterAssigned && filterAssigned !== '_none' && t.assignedTo !== filterAssigned) return false;
    return true;
  });
  const nonMembers = allUsers.filter(u => !members.some(m => m.userId === u.id));

  return (
    <div className="app wide">
      <div className="project-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button className="btn" onClick={onBack}>← Retour</button>
          <h2>{project.name}</h2>
        </div>
        <div className="header-actions">
          <button className="btn small" onClick={load} title="Rafraichir">↻</button>
          {isAdmin && <button className="btn small" onClick={() => setShowMembers(!showMembers)}>Membres ({members.length})</button>}
          <button className="btn primary" onClick={() => setShowForm(!showForm)}>+ Nouvelle tache</button>
        </div>
      </div>

      {showMembers && isAdmin && (
        <div className="form-card">
          <h4 style={{ color: '#58a6ff', marginBottom: 8 }}>Membres du projet</h4>
          {members.map(m => (
            <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0', borderBottom: '1px solid #2d333b' }}>
              <span style={{ flex: 1 }}>{m.userName}</span>
              <button className="btn danger small" onClick={() => handleRemoveMember(m.id)}>x</button>
            </div>
          ))}
          {nonMembers.length > 0 && (
            <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
              <select value={addUserId} onChange={e => setAddUserId(e.target.value)}
                style={{ flex: 1, padding: '6px 10px', background: '#0d1117', border: '1px solid #3d444d', borderRadius: 6, color: '#e1e4e8' }}>
                <option value="">-- Ajouter un membre --</option>
                {nonMembers.map(u => <option key={u.id} value={u.id}>{u.displayName}</option>)}
              </select>
              <button className="btn primary small" onClick={handleAddMember}>+</button>
            </div>
          )}
        </div>
      )}

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
            <select value={form.assignedTo} onChange={e => setForm({ ...form, assignedTo: e.target.value })}
              style={{ flex: 1, padding: '8px 12px', background: '#0d1117', border: '1px solid #3d444d', borderRadius: 6, color: '#e1e4e8' }}>
              <option value="">Non assigne</option>
              {members.map(m => <option key={m.id} value={m.userName}>{m.userName}</option>)}
            </select>
          </div>
          <div className="form-actions">
            <button className="btn primary" onClick={handleCreate}>Creer</button>
            <button className="btn" onClick={() => setShowForm(false)}>Annuler</button>
          </div>
        </div>
      )}

      <div className="filter-bar">
        <input placeholder="Rechercher..." value={filterSearch} onChange={e => setFilterSearch(e.target.value)} className="filter-input" />
        <select value={filterPriority} onChange={e => setFilterPriority(e.target.value)} className="filter-select">
          <option value="">Toutes priorites</option>
          <option value="high">Haute</option>
          <option value="medium">Moyenne</option>
          <option value="low">Basse</option>
        </select>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="filter-select">
          <option value="">Tous statuts</option>
          {STATUSES.map(s => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
        </select>
        <select value={filterAssigned} onChange={e => setFilterAssigned(e.target.value)} className="filter-select">
          <option value="">Tous</option>
          <option value="_none">Non assigne</option>
          {assigneeNames.map(name => <option key={name} value={name}>{name}</option>)}
        </select>
        {(filterSearch || filterPriority || filterAssigned || filterStatus) && (
          <button className="btn small" onClick={() => { setFilterSearch(''); setFilterPriority(''); setFilterAssigned(''); setFilterStatus(''); }}>Reinitialiser</button>
        )}
        <span style={{ color: '#484f58', fontSize: 12, marginLeft: 'auto' }}>{filtered.length}/{tasks.length} taches</span>
      </div>

      <div className="task-table">
        <div className="task-table-header">
          <div className="task-col-info">Tache</div>
          {STATUSES.map(s => (
            <div key={s} className="task-col-status" style={{ color: STATUS_COLORS[s] }}>{STATUS_LABELS[s]}</div>
          ))}
          <div className="task-col-actions"></div>
        </div>
        {filtered.map(task => (
          <div key={task.id} className={`task-table-row priority-${task.priority}`}>
            <div className="task-col-info" onClick={() => setSelectedTask(task)}>
              <span className="task-title"><span className="task-id">#{task.id}</span> {task.title}</span>
              {task.description && <span className="task-desc">{task.description}</span>}
              {task.assignedTo && (
                <span className="task-meta">
                  <span className="task-tag">{task.assignedTo}</span>
                </span>
              )}
            </div>
            {STATUSES.map(s => (
              <div key={s} className="task-col-status">
                {task.status === s ? (
                  <span className="status-dot active" style={{ background: STATUS_COLORS[s] }} title={STATUS_LABELS[s]} />
                ) : (
                  <button
                    className="status-dot clickable"
                    title={`Deplacer vers ${STATUS_LABELS[s]}`}
                    onClick={() => handleStatusChange(task, s)}
                  />
                )}
              </div>
            ))}
            <div className="task-col-actions">
              <button className="btn danger small" onClick={() => handleDelete(task.id)} style={{ fontSize: 10, padding: '2px 6px' }}>x</button>
            </div>
          </div>
        ))}
        {filtered.length === 0 && <div style={{ padding: 20, textAlign: 'center', color: '#484f58' }}>Aucune tache</div>}
      </div>

      {selectedTask && (
        <TaskModal
          task={selectedTask}
          projectId={project.id}
          members={members}
          onClose={() => { setSelectedTask(null); load(); }}
        />
      )}
    </div>
  );
}
