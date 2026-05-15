import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import type { TaskItem, TimeEntry, GitCommit, ProjectMember } from './api';
import {
  updateTask, getTimeEntries, createTimeEntry, deleteTimeEntry,
  getBranches, getCommits, getCurrentUser,
} from './api';

const STATUSES = ['a_discuter', 'todo', 'in_progress', 'to_review', 'validated', 'rejected'];

interface Props {
  task: TaskItem;
  projectId: number;
  members: ProjectMember[];
  onClose: () => void;
}

export function TaskModal({ task, projectId, members, onClose }: Props) {
  const { t } = useTranslation();
  const [form, setForm] = useState(task);
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const currentUser = getCurrentUser();
  const [newEntry, setNewEntry] = useState({ startTime: '', endTime: '', note: '' });
  const [branches, setBranches] = useState<string[]>([]);
  const [currentBranch, setCurrentBranch] = useState('');
  const [commits, setCommits] = useState<GitCommit[]>([]);
  const [selectedBranch, setSelectedBranch] = useState(task.branchName || '');
  const [showCommits, setShowCommits] = useState(!task.commitHash);
  const [showGit] = useState(true);

  useEffect(() => {
    getTimeEntries(task.id).then(setEntries);
    getBranches(projectId).then(res => { setBranches(res.branches); setCurrentBranch(res.currentBranch); });
  }, [task.id, projectId]);

  useEffect(() => {
    if (selectedBranch) {
      getCommits(projectId, selectedBranch).then(c => {
        setCommits(c);
        if (c.length > 0 && !form.commitHash) {
          setForm(f => ({ ...f, commitHash: c[0].hash, branchName: selectedBranch }));
        }
      });
    }
  }, [selectedBranch, projectId]);

  const handleSave = async () => {
    await updateTask(task.id, form);
    onClose();
  };

  const handleAddEntry = async () => {
    if (!newEntry.startTime || !newEntry.endTime) return;
    if (newEntry.endTime <= newEntry.startTime) return;
    await createTimeEntry(task.id, { ...newEntry, user: currentUser?.displayName || '' });
    const nextStart = newEntry.endTime;
    const [date, time] = nextStart.split('T');
    const [h, m] = time.split(':').map(Number);
    const totalMin = h * 60 + m + 15;
    const eh = String(Math.floor(totalMin / 60) % 24).padStart(2, '0');
    const em = String(totalMin % 60).padStart(2, '0');
    setNewEntry({ ...newEntry, startTime: nextStart, endTime: `${date}T${eh}:${em}` });
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

  const inputStyle = { width: '100%', padding: '8px 12px', background: 'var(--bg-input)', border: '1px solid var(--border-input)', borderRadius: 6, color: 'var(--text-primary)', fontSize: 14 };
  const smallInputStyle = { padding: '4px 8px', background: 'var(--bg-input)', border: '1px solid var(--border-input)', borderRadius: 4, color: 'var(--text-primary)', fontSize: 12 };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <h3>{t('task')} #{task.id}</h3>

        <div className="field">
          <label>{t('title')}</label>
          <input style={inputStyle} value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
        </div>

        <div className="field">
          <label>{t('description')}</label>
          <textarea
            style={{ ...inputStyle, minHeight: 60, resize: 'vertical' as const }}
            value={form.description || ''}
            onChange={e => setForm({ ...form, description: e.target.value })}
          />
        </div>

        <div className="field">
          <label>{t('status')}</label>
          <div className="status-select">
            {STATUSES.map(s => (
              <button
                key={s}
                className={`status-btn ${form.status === s ? 'active' : ''}`}
                onClick={() => {
                  setForm({ ...form, status: s });
                }}
              >
                {t(`status.${s}`)}
              </button>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 12 }}>
          <div className="field" style={{ flex: 1 }}>
            <label>{t('priority')}</label>
            <select style={inputStyle} value={form.priority} onChange={e => setForm({ ...form, priority: e.target.value })}>
              <option value="low">{t('low')}</option>
              <option value="medium">{t('medium')}</option>
              <option value="high">{t('high')}</option>
            </select>
          </div>
          <div className="field" style={{ flex: 1 }}>
            <label>{t('assignedTo')}</label>
            <select style={inputStyle} value={form.assignedTo || ''} onChange={e => setForm({ ...form, assignedTo: e.target.value })}>
              <option value="">{t('notAssigned')}</option>
              {members.map(m => <option key={m.id} value={m.userName}>{m.userName}</option>)}
            </select>
          </div>
        </div>

        {showGit && (
          <div className="git-section">
            <h4>{t('linkCommit')}</h4>
            <div style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'center' }}>
              <select
                style={{ flex: 1, ...smallInputStyle, padding: '6px 10px', borderRadius: 6 }}
                value={selectedBranch}
                onChange={e => { setSelectedBranch(e.target.value); setShowCommits(true); setForm({ ...form, branchName: e.target.value, commitHash: e.target.value ? form.commitHash : '' }); }}
              >
                <option value="">{t('branch')}</option>
                {[...branches].sort((a, b) => {
                  if (a === currentBranch) return -1;
                  if (b === currentBranch) return 1;
                  return 0;
                }).map(b => <option key={b} value={b}>{b === currentBranch ? `★ ${b}` : b}</option>)}
              </select>
              {currentBranch && selectedBranch === currentBranch && (
                <span style={{ fontSize: 11, color: 'var(--green)', background: 'var(--green-bg)', padding: '2px 8px', borderRadius: 10, whiteSpace: 'nowrap' }}>✓ {t('currentBranch')}</span>
              )}
            </div>
            {selectedBranch && showCommits && (
              <div className="commit-list">
                {commits.map(c => (
                  <div
                    key={c.hash}
                    className={`commit-item ${form.commitHash === c.hash ? 'selected' : ''}`}
                    onClick={() => { setForm({ ...form, commitHash: c.hash }); setShowCommits(false); }}
                  >
                    <span className="hash">{c.hash.substring(0, 7)}</span>
                    <span className="msg">{c.message}</span>
                    <span className="author">{c.author}</span>
                  </div>
                ))}
              </div>
            )}
            {form.commitHash && (
              <div style={{ marginTop: 6, fontSize: 12, color: 'var(--green)', display: 'flex', alignItems: 'center', gap: 8 }}>
                <span>{t('selectedCommit')}: <span style={{ fontFamily: 'monospace' }}>{form.commitHash.substring(0, 7)}</span> {t('on')} {form.branchName}</span>
                <button className="btn small" onClick={() => { setForm({ ...form, commitHash: '' }); setShowCommits(true); }} style={{ fontSize: 10, padding: '1px 6px' }}>✕</button>
              </div>
            )}
          </div>
        )}

        <div className="time-entries">
          <h4 style={{ color: 'var(--accent)', marginBottom: 8 }}>
            {t('timeSpent')} <span style={{ color: 'var(--text-secondary)', fontWeight: 400 }}>— {t('total')}: {formatDuration(totalMinutes)}</span>
          </h4>

          {entries.map(e => {
            const diff = (new Date(e.endTime).getTime() - new Date(e.startTime).getTime()) / 60000;
            return (
              <div key={e.id} className="time-entry">
                <span className="duration">{formatDuration(diff)}</span>
                <span style={{ color: 'var(--text-secondary)' }}>{e.user || '—'}</span>
                <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>
                  {new Date(e.startTime).toLocaleString('fr-CA')} → {new Date(e.endTime).toLocaleString('fr-CA')}
                </span>
                {e.note && <span style={{ color: 'var(--text-secondary)', fontSize: 12 }}> | {e.note}</span>}
                <button className="btn danger small" style={{ marginLeft: 'auto' }} onClick={() => handleDeleteEntry(e.id)}>×</button>
              </div>
            );
          })}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 8 }}>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <span style={{ color: 'var(--text-secondary)', fontSize: 12 }}>{t('from')}</span>
              <input
                type="datetime-local"
                style={smallInputStyle}
                value={newEntry.startTime}
                onChange={e => {
                  const start = e.target.value;
                  if (!start) { setNewEntry({ ...newEntry, startTime: '' }); return; }
                  if (newEntry.endTime) {
                    setNewEntry({ ...newEntry, startTime: start });
                  } else {
                    const [date, time] = start.split('T');
                    const [h, m] = time.split(':').map(Number);
                    const totalMin = h * 60 + m + 15;
                    const eh = String(Math.floor(totalMin / 60) % 24).padStart(2, '0');
                    const em = String(totalMin % 60).padStart(2, '0');
                    setNewEntry({ ...newEntry, startTime: start, endTime: `${date}T${eh}:${em}` });
                  }
                }}
              />
              <span style={{ color: 'var(--text-secondary)', fontSize: 12 }}>{t('to')}</span>
              <input
                type="datetime-local"
                style={smallInputStyle}
                value={newEntry.endTime}
                min={newEntry.startTime}
                onChange={e => {
                  if (newEntry.startTime && e.target.value < newEntry.startTime) return;
                  setNewEntry({ ...newEntry, endTime: e.target.value });
                }}
              />
              <button className="btn primary small" onClick={handleAddEntry}>+</button>
            </div>
            <textarea
              placeholder={t('descriptionOptional')}
              style={{ ...smallInputStyle, padding: '6px 8px', width: '100%', minHeight: 32, resize: 'vertical' as const }}
              value={newEntry.note}
              onChange={e => setNewEntry({ ...newEntry, note: e.target.value })}
            />
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, marginTop: 20, justifyContent: 'flex-end' }}>
          <button className="btn" onClick={onClose}>{t('cancel')}</button>
          <button className="btn primary" onClick={handleSave}>{t('save')}</button>
        </div>
      </div>
    </div>
  );
}
