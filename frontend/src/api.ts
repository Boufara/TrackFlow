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

export interface AppUser {
  id: number;
  username: string;
  displayName: string;
  isAdmin: boolean;
}

export interface ProjectMember {
  id: number;
  projectId: number;
  userId: number;
  userName: string;
}

// Token management
let token: string | null = localStorage.getItem('trackflow_token');
let currentUser: AppUser | null = null;
try {
  const u = localStorage.getItem('trackflow_user');
  if (u) currentUser = JSON.parse(u);
} catch { /* ignore */ }

export function getToken() { return token; }
export function getCurrentUser() { return currentUser; }
export function isLoggedIn() { return !!token; }

export function setAuth(t: string, user: AppUser) {
  token = t;
  currentUser = user;
  localStorage.setItem('trackflow_token', t);
  localStorage.setItem('trackflow_user', JSON.stringify(user));
}

export function logout() {
  token = null;
  currentUser = null;
  localStorage.removeItem('trackflow_token');
  localStorage.removeItem('trackflow_user');
}

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(url, { headers, ...options });
  if (res.status === 401) {
    logout();
    window.location.reload();
    throw new Error('Unauthorized');
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

// Auth
export const login = (username: string, password: string) =>
  request<{ token: string; user: AppUser }>(`${API}/auth/login`, { method: 'POST', body: JSON.stringify({ username, password }) });

// Users
export const getUsers = () => request<AppUser[]>(`${API}/users`);
export const createUser = (u: { username: string; password: string; displayName: string; isAdmin: boolean }) =>
  request<AppUser>(`${API}/users`, { method: 'POST', body: JSON.stringify(u) });
export const deleteUser = (id: number) => request<void>(`${API}/users/${id}`, { method: 'DELETE' });

// Projects
export const getProjects = () => request<Project[]>(`${API}/projects`);
export const createProject = (p: Partial<Project>) => request<Project>(`${API}/projects`, { method: 'POST', body: JSON.stringify(p) });
export const updateProject = (id: number, p: Partial<Project>) => request<Project>(`${API}/projects/${id}`, { method: 'PUT', body: JSON.stringify(p) });
export const deleteProject = (id: number) => request<void>(`${API}/projects/${id}`, { method: 'DELETE' });

// Members
export const getMembers = (projectId: number) => request<ProjectMember[]>(`${API}/projects/${projectId}/members`);
export const addMember = (projectId: number, userId: number) => request<ProjectMember>(`${API}/projects/${projectId}/members`, { method: 'POST', body: JSON.stringify({ userId }) });
export const removeMember = (id: number) => request<void>(`${API}/members/${id}`, { method: 'DELETE' });

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
