import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import type { Project, TaskItem, ProjectMember, AppUser, TimeStats } from './api';
import { getTasks, createTask, deleteTask, updateTask, getMembers, addMember, removeMember, getUsers, getCurrentUser, getTimeStats } from './api';
import { TaskModal } from './TaskModal';

const STATUSES = ['a_discuter', 'todo', 'in_progress', 'to_review', 'validated', 'rejected'];
const STATUS_COLORS: Record<string, string> = {
  todo: '#9ca3af',
  in_progress: '#58a6ff',
  to_review: '#d29922',
  validated: '#3fb950',
  rejected: '#f85149',
  a_discuter: '#bc8cff',
};

type SortKey = 'id' | 'priority' | 'status' | 'hours';
type SortDir = 'asc' | 'desc';

const PRIORITY_ORDER: Record<string, number> = { high: 3, medium: 2, low: 1 };
const STATUS_ORDER: Record<string, number> = { a_discuter: 0, todo: 1, in_progress: 2, to_review: 3, validated: 4, rejected: 5 };

function formatDuration(mins: number) {
  if (mins <= 0) return '';
  const h = Math.floor(mins / 60);
  const m = Math.round(mins % 60);
  return h > 0 ? `${h}h${m > 0 ? ` ${m}m` : ''}` : `${m}m`;
}

interface Props {
  project: Project;
  onBack: () => void;
}

export function ProjectView({ project, onBack }: Props) {
  const { t } = useTranslation();
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
  const [timeStats, setTimeStats] = useState<Record<number, TimeStats>>({});
  const [sortKey, setSortKey] = useState<SortKey>('priority');
  const [sortDir, setSortDir] = useState<SortDir>('desc');


  const currentUser = getCurrentUser();
  const isAdmin = currentUser?.isAdmin ?? false;
  const load = () => { getTasks(project.id).then(setTasks); getTimeStats(project.id).then(setTimeStats); };
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
    if (!confirm(t('confirmDeleteTask'))) return;
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
    if (newStatus === 'todo' && task.assignedTo && (!timeStats[task.id] || timeStats[task.id].users.length === 0)) {
      update.assignedTo = '';
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

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('desc'); }
  };

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

  const sorted = [...filtered].sort((a, b) => {
    let cmp = 0;
    switch (sortKey) {
      case 'id': cmp = a.id - b.id; break;
      case 'priority': cmp = (PRIORITY_ORDER[a.priority] || 0) - (PRIORITY_ORDER[b.priority] || 0); break;
      case 'status': cmp = (STATUS_ORDER[a.status] || 0) - (STATUS_ORDER[b.status] || 0); break;
      case 'hours': cmp = (timeStats[a.id]?.totalMinutes || 0) - (timeStats[b.id]?.totalMinutes || 0); break;
    }
    return sortDir === 'asc' ? cmp : -cmp;
  });

  const totalAllMinutes = Object.values(timeStats).reduce((sum, s) => sum + s.totalMinutes, 0);
  const nonMembers = allUsers.filter(u => !members.some(m => m.userId === u.id));
  const sortArrow = (key: SortKey) => sortKey === key ? (sortDir === 'asc' ? ' ▲' : ' ▼') : '';

  return (
    <div className="app wide">
      <div className="project-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button className="btn small" onClick={onBack}>{t('back')}</button>
          <h2>{project.name}</h2>
        </div>
        <div className="header-actions">
          <button className="btn small" onClick={load} title={t('refresh')}>↻</button>
          {isAdmin && <button className="btn small" onClick={() => setShowMembers(!showMembers)}>{t('members')} ({members.length}) {showMembers ? '▲' : '▼'}</button>}
          <button className="btn primary small" onClick={() => setShowForm(!showForm)}>{t('newTask')}</button>
        </div>
      </div>



      {showMembers && isAdmin && (
        <div className="form-card">
          <h4 style={{ color: 'var(--accent)', marginBottom: 8 }}>{t('projectMembers')}</h4>
          {members.map(m => (
            <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0', borderBottom: '1px solid var(--border)' }}>
              <span style={{ flex: 1 }}>{m.userName}</span>
              <button className="btn danger small" onClick={() => handleRemoveMember(m.id)}>x</button>
            </div>
          ))}
          {nonMembers.length > 0 && (
            <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
              <select value={addUserId} onChange={e => setAddUserId(e.target.value)}
                style={{ flex: 1, padding: '6px 10px', background: 'var(--bg-input)', border: '1px solid var(--border-input)', borderRadius: 6, color: 'var(--text-primary)' }}>
                <option value="">{t('addMember')}</option>
                {nonMembers.map(u => <option key={u.id} value={u.id}>{u.displayName}</option>)}
              </select>
              <button className="btn primary small" onClick={handleAddMember}>+</button>
            </div>
          )}
        </div>
      )}

      {showForm && (
        <div className="form-card">
          <input placeholder={t('taskTitle')} value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
          <textarea placeholder={t('descriptionOptional')} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
          <div style={{ display: 'flex', gap: 10 }}>
            <select value={form.priority} onChange={e => setForm({ ...form, priority: e.target.value })}>
              <option value="low">{t('low')}</option>
              <option value="medium">{t('medium')}</option>
              <option value="high">{t('high')}</option>
            </select>
            <select value={form.assignedTo} onChange={e => setForm({ ...form, assignedTo: e.target.value })}
              style={{ flex: 1, padding: '8px 12px', background: 'var(--bg-input)', border: '1px solid var(--border-input)', borderRadius: 6, color: 'var(--text-primary)' }}>
              <option value="">{t('notAssigned')}</option>
              {members.map(m => <option key={m.id} value={m.userName}>{m.userName}</option>)}
            </select>
          </div>
          <div className="form-actions">
            <button className="btn primary" onClick={handleCreate}>{t('create')}</button>
            <button className="btn" onClick={() => setShowForm(false)}>{t('cancel')}</button>
          </div>
        </div>
      )}

      <div className="filter-bar">
        <input placeholder={t('search')} value={filterSearch} onChange={e => setFilterSearch(e.target.value)} className="filter-input" />
        <select value={filterPriority} onChange={e => setFilterPriority(e.target.value)} className="filter-select">
          <option value="">{t('allPriorities')}</option>
          <option value="high">{t('high')}</option>
          <option value="medium">{t('medium')}</option>
          <option value="low">{t('low')}</option>
        </select>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="filter-select">
          <option value="">{t('allStatuses')}</option>
          {STATUSES.map(s => <option key={s} value={s}>{t(`status.${s}`)}</option>)}
        </select>
        <select value={filterAssigned} onChange={e => setFilterAssigned(e.target.value)} className="filter-select">
          <option value="">{t('all')}</option>
          <option value="_none">{t('notAssigned')}</option>
          {assigneeNames.map(name => <option key={name} value={name}>{name}</option>)}
        </select>
        {(filterSearch || filterPriority || filterAssigned || filterStatus) && (
          <button className="btn small" onClick={() => { setFilterSearch(''); setFilterPriority(''); setFilterAssigned(''); setFilterStatus(''); }}>{t('reset')}</button>
        )}
        <span style={{ color: 'var(--text-muted)', fontSize: 12, marginLeft: 'auto' }}>{filtered.length}/{tasks.length} {t('tasks')}</span>
      </div>

      <div className="task-table">
        <div className="task-table-header">
          <div className="task-col-info sort-header" onClick={() => toggleSort('id')}>
            {t('task')}{sortArrow('id')}
          </div>
          {STATUSES.map(s => (
            <div key={s} className="task-col-status sort-header" style={{ color: STATUS_COLORS[s] }} onClick={() => toggleSort('status')}>
              {t(`status.${s}`)}
            </div>
          ))}
          <div className="task-col-hours sort-header" onClick={() => toggleSort('hours')}>
            {t('hours')}{sortArrow('hours')}
          </div>
          <div className="task-col-actions"></div>
        </div>
        {sorted.map(task => {
          const stats = timeStats[task.id];
          return (
            <div key={task.id} className={`task-table-row priority-${task.priority}`}>
              <div className="task-col-info" onClick={() => setSelectedTask(task)}>
                <span className="task-title"><span className="task-id">#{task.id}</span> {task.title}</span>
                {task.description && <span className="task-desc">{task.description}</span>}
                {(task.branchName || task.commitHash) && (
                  <span style={{ fontSize: 11, color: 'var(--accent)', fontFamily: 'monospace', opacity: 0.7 }}>
                    ⎇ {task.branchName || ''}{task.branchName && task.commitHash ? ' : ' : ''}{task.commitHash ? task.commitHash.substring(0, 7) : ''}
                  </span>
                )}
                {(task.assignedTo || (stats && stats.users.length > 0)) && (
                  <span className="task-meta">
                    {task.assignedTo && <span className="task-tag">{task.assignedTo}</span>}
                    {stats?.users.filter(u => u !== task.assignedTo).map(u => (
                      <span key={u} className="task-tag time-tag">{u}</span>
                    ))}
                  </span>
                )}
              </div>
              {STATUSES.map(s => (
                <div key={s} className="task-col-status">
                  {task.status === s ? (
                    <span className="status-dot active" style={{ background: STATUS_COLORS[s] }} title={t(`status.${s}`)} />
                  ) : (
                    <button
                      className="status-dot clickable"
                      title={`${t('moveToStatus')} ${t(`status.${s}`)}`}
                      onClick={() => handleStatusChange(task, s)}
                    />
                  )}
                </div>
              ))}
              <div className="task-col-hours">
                {stats && stats.totalMinutes > 0 && (
                  <span className="hours-badge">{formatDuration(stats.totalMinutes)}</span>
                )}
              </div>
              <div className="task-col-actions">
                <button onClick={() => handleDelete(task.id)} style={{ fontSize: 18, background: 'none', border: 'none', cursor: 'pointer', padding: '4px 6px', color: 'var(--red)' }}>✕</button>
              </div>
            </div>
          );
        })}
        {filtered.length === 0 && <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-muted)' }}>{t('noTasks')}</div>}
        {totalAllMinutes > 0 && (
          <div className="task-table-footer">
            <div className="task-col-info" />
            {STATUSES.map(s => <div key={s} className="task-col-status" />)}
            <div className="task-col-hours"><span className="hours-badge total">{formatDuration(totalAllMinutes)}</span></div>
            <div className="task-col-actions" />
          </div>
        )}
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
