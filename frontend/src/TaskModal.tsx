import { useState, useEffect } from 'react';
import type { TaskItem, TimeEntry, GitCommit, ProjectMember } from './api';
import {
  updateTask, getTimeEntries, createTimeEntry, deleteTimeEntry,
  getBranches, getCommits, getCurrentUser,
} from './api';

const STATUSES = ['todo', 'in_progress', 'to_review', 'validated', 'rejected'];
const STATUS_LABELS: Record<string, string> = {
  todo: 'A faire',
  in_progress: 'En cours',
  to_review: 'A tester',
  validated: 'Valide',
  rejected: 'Rejete',
};

interface Props {
  task: TaskItem;
  projectId: number;
  members: ProjectMember[];
  onClose: () => void;
}

export function TaskModal({ task, projectId, members, onClose }: Props) {
  const [form, setForm] = useState(task);
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const currentUser = getCurrentUser();
  const [newEntry, setNewEntry] = useState({ user: currentUser?.displayName || '', startTime: '', endTime: '', note: '' });
  const [branches, setBranches] = useState<string[]>([]);
  const [commits, setCommits] = useState<GitCommit[]>([]);
  const [selectedBranch, setSelectedBranch] = useState(task.branchName || '');
  const [showGit, setShowGit] = useState(task.status === 'validated' || task.status === 'to_review');

  useEffect(() => {
    getTimeEntries(task.id).then(setEntries);
    getBranches(projectId).then(setBranches);
  }, [task.id, projectId]);

  useEffect(() => {
    if (selectedBranch) {
      getCommits(projectId, selectedBranch).then(setCommits);
    }
  }, [selectedBranch, projectId]);

  const handleSave = async () => {
    await updateTask(task.id, form);
    onClose();
  };

  const handleAddEntry = async () => {
    if (!newEntry.startTime || !newEntry.endTime) return;
    await createTimeEntry(task.id, newEntry);
    setNewEntry({ user: '', startTime: '', endTime: '', note: '' });
    getTimeEntries(task.id).then(setEntries);
  };

  const handleDeleteEntry = async (id: number) => {
    await deleteTimeEntry(id);
    getTimeEntries(task.id).then(setEntries);
  };

  const totalMinutes = entries.reduce((sum, e) => {
    const diff = new Date(e.endTime).getTime() - new Date(e.startTime).getTime();
    return sum + Math.max(0, diff / 60000);
  }, 0);

  const formatDuration = (mins: number) => {
    const h = Math.floor(mins / 60);
    const m = Math.round(mins % 60);
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <h3>Tache #{task.id}</h3>

        <div className="field">
          <label>Titre</label>
          <input
            style={{ width: '100%', padding: '8px 12px', background: '#0d1117', border: '1px solid #3d444d', borderRadius: 6, color: '#e1e4e8', fontSize: 14 }}
            value={form.title}
            onChange={e => setForm({ ...form, title: e.target.value })}
          />
        </div>

        <div className="field">
          <label>Description</label>
          <textarea
            style={{ width: '100%', padding: '8px 12px', background: '#0d1117', border: '1px solid #3d444d', borderRadius: 6, color: '#e1e4e8', fontSize: 14, minHeight: 60, resize: 'vertical' }}
            value={form.description || ''}
            onChange={e => setForm({ ...form, description: e.target.value })}
          />
        </div>

        <div className="field">
          <label>Statut</label>
          <div className="status-select">
            {STATUSES.map(s => (
              <button
                key={s}
                className={`status-btn ${form.status === s ? 'active' : ''}`}
                onClick={() => {
                  setForm({ ...form, status: s });
                  if (s === 'validated' || s === 'to_review') setShowGit(true);
                }}
              >
                {STATUS_LABELS[s]}
              </button>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 12 }}>
          <div className="field" style={{ flex: 1 }}>
            <label>Priorite</label>
            <select
              style={{ width: '100%', padding: '8px 12px', background: '#0d1117', border: '1px solid #3d444d', borderRadius: 6, color: '#e1e4e8' }}
              value={form.priority}
              onChange={e => setForm({ ...form, priority: e.target.value })}
            >
              <option value="low">Basse</option>
              <option value="medium">Moyenne</option>
              <option value="high">Haute</option>
            </select>
          </div>
          <div className="field" style={{ flex: 1 }}>
            <label>Assigne a</label>
            <select
              style={{ width: '100%', padding: '8px 12px', background: '#0d1117', border: '1px solid #3d444d', borderRadius: 6, color: '#e1e4e8' }}
              value={form.assignedTo || ''}
              onChange={e => setForm({ ...form, assignedTo: e.target.value })}
            >
              <option value="">Non assigne</option>
              {members.map(m => <option key={m.id} value={m.userName}>{m.userName}</option>)}
            </select>
          </div>
        </div>

        {/* Git section */}
        {showGit && (
          <div className="git-section">
            <h4>Lier un commit</h4>
            <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
              <select
                style={{ flex: 1, padding: '6px 10px', background: '#0d1117', border: '1px solid #3d444d', borderRadius: 6, color: '#e1e4e8' }}
                value={selectedBranch}
                onChange={e => { setSelectedBranch(e.target.value); setForm({ ...form, branchName: e.target.value }); }}
              >
                <option value="">-- Branche --</option>
                {branches.map(b => <option key={b} value={b}>{b}</option>)}
              </select>
            </div>
            {selectedBranch && (
              <div className="commit-list">
                {commits.map(c => (
                  <div
                    key={c.hash}
                    className={`commit-item ${form.commitHash === c.hash ? 'selected' : ''}`}
                    onClick={() => setForm({ ...form, commitHash: c.hash })}
                  >
                    <span className="hash">{c.hash.substring(0, 7)}</span>
                    <span className="msg">{c.message}</span>
                    <span className="author">{c.author}</span>
                  </div>
                ))}
              </div>
            )}
            {form.commitHash && (
              <div style={{ marginTop: 6, fontSize: 12, color: '#3fb950' }}>
                Commit selectionne: {form.commitHash.substring(0, 7)} sur {form.branchName}
              </div>
            )}
          </div>
        )}

        {/* Time entries */}
        <div className="time-entries">
          <h4 style={{ color: '#58a6ff', marginBottom: 8 }}>
            Temps passe <span style={{ color: '#8b949e', fontWeight: 400 }}>— Total: {formatDuration(totalMinutes)}</span>
          </h4>

          {entries.map(e => {
            const diff = (new Date(e.endTime).getTime() - new Date(e.startTime).getTime()) / 60000;
            return (
              <div key={e.id} className="time-entry">
                <span className="duration">{formatDuration(diff)}</span>
                <span style={{ color: '#8b949e' }}>{e.user || '—'}</span>
                <span style={{ color: '#484f58', fontSize: 12 }}>
                  {new Date(e.startTime).toLocaleString('fr-CA')} → {new Date(e.endTime).toLocaleString('fr-CA')}
                </span>
                {e.note && <span style={{ color: '#8b949e', fontSize: 12 }}> | {e.note}</span>}
                <button className="btn danger small" style={{ marginLeft: 'auto' }} onClick={() => handleDeleteEntry(e.id)}>×</button>
              </div>
            );
          })}

          <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
            <input
              type="datetime-local"
              style={{ padding: '4px 8px', background: '#0d1117', border: '1px solid #3d444d', borderRadius: 4, color: '#e1e4e8', fontSize: 12 }}
              value={newEntry.startTime}
              onChange={e => setNewEntry({ ...newEntry, startTime: e.target.value })}
            />
            <input
              type="datetime-local"
              style={{ padding: '4px 8px', background: '#0d1117', border: '1px solid #3d444d', borderRadius: 4, color: '#e1e4e8', fontSize: 12 }}
              value={newEntry.endTime}
              onChange={e => setNewEntry({ ...newEntry, endTime: e.target.value })}
            />
            <input
              placeholder="Qui"
              style={{ padding: '4px 8px', background: '#0d1117', border: '1px solid #3d444d', borderRadius: 4, color: '#e1e4e8', fontSize: 12, width: 80 }}
              value={newEntry.user}
              onChange={e => setNewEntry({ ...newEntry, user: e.target.value })}
            />
            <input
              placeholder="Note"
              style={{ padding: '4px 8px', background: '#0d1117', border: '1px solid #3d444d', borderRadius: 4, color: '#e1e4e8', fontSize: 12, flex: 1 }}
              value={newEntry.note}
              onChange={e => setNewEntry({ ...newEntry, note: e.target.value })}
            />
            <button className="btn primary small" onClick={handleAddEntry}>+</button>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, marginTop: 20, justifyContent: 'flex-end' }}>
          <button className="btn" onClick={onClose}>Annuler</button>
          <button className="btn primary" onClick={handleSave}>Sauvegarder</button>
        </div>
      </div>
    </div>
  );
}
