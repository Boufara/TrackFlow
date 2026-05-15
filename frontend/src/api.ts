const API = '/api';

export interface Project {
  id: number;
  name: string;
  description?: string;
  repoPath: string;
  createdAt: string;
}

export interface TaskItem {
  id: number;
  projectId: number;
  title: string;
  description?: string;
  status: string;
  priority: string;
  assignedTo?: string;
  commitHash?: string;
  branchName?: string;
  createdAt: string;
  updatedAt: string;
  validatedAt?: string;
}

export interface TimeEntry {
  id: number;
  taskId: number;
  user?: string;
  startTime: string;
  endTime: string;
  note?: string;
}

export interface GitCommit {
  hash: string;
  message: string;
  author: string;
  date: string;
}

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (res.status === 204) return undefined as T;
  return res.json();
}

// Projects
export const getProjects = () => request<Project[]>(`${API}/projects`);
export const createProject = (p: Partial<Project>) => request<Project>(`${API}/projects`, { method: 'POST', body: JSON.stringify(p) });
export const updateProject = (id: number, p: Partial<Project>) => request<Project>(`${API}/projects/${id}`, { method: 'PUT', body: JSON.stringify(p) });
export const deleteProject = (id: number) => request<void>(`${API}/projects/${id}`, { method: 'DELETE' });

// Tasks
export const getTasks = (projectId: number) => request<TaskItem[]>(`${API}/projects/${projectId}/tasks`);
export const createTask = (projectId: number, t: Partial<TaskItem>) => request<TaskItem>(`${API}/projects/${projectId}/tasks`, { method: 'POST', body: JSON.stringify(t) });
export const updateTask = (id: number, t: Partial<TaskItem>) => request<TaskItem>(`${API}/tasks/${id}`, { method: 'PUT', body: JSON.stringify(t) });
export const deleteTask = (id: number) => request<void>(`${API}/tasks/${id}`, { method: 'DELETE' });

// Time Entries
export const getTimeEntries = (taskId: number) => request<TimeEntry[]>(`${API}/tasks/${taskId}/time-entries`);
export const createTimeEntry = (taskId: number, t: Partial<TimeEntry>) => request<TimeEntry>(`${API}/tasks/${taskId}/time-entries`, { method: 'POST', body: JSON.stringify(t) });
export const updateTimeEntry = (id: number, t: Partial<TimeEntry>) => request<TimeEntry>(`${API}/time-entries/${id}`, { method: 'PUT', body: JSON.stringify(t) });
export const deleteTimeEntry = (id: number) => request<void>(`${API}/time-entries/${id}`, { method: 'DELETE' });

// Git
export const getBranches = (projectId: number) => request<string[]>(`${API}/projects/${projectId}/git/branches`);
export const getCommits = (projectId: number, branch?: string) => request<GitCommit[]>(`${API}/projects/${projectId}/git/commits${branch ? `?branch=${encodeURIComponent(branch)}` : ''}`);
