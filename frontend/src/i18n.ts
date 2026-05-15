import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

const fr = {
  // App
  trackflow: 'TrackFlow',
  users: 'Utilisateurs',
  logout: 'Déconnexion',
  newProject: '+ Nouveau projet',
  projectName: 'Nom du projet',
  descriptionOptional: 'Description (optionnel)',
  repoPath: 'Chemin du repo git',
  create: 'Créer',
  cancel: 'Annuler',
  delete: 'Supprimer',
  noProjects: 'Aucun projet. Créez-en un pour commencer.',
  confirmDeleteProject: 'Supprimer ce projet ?',
  changeTheme: 'Changer le thème',

  // Login
  login: 'Connexion',
  username: "Nom d'utilisateur",
  password: 'Mot de passe',
  loginButton: 'Se connecter',
  loginError: 'Identifiants invalides',

  // Users
  userManagement: 'Gestion des utilisateurs',
  addUser: 'Ajouter un utilisateur',
  fullName: 'Nom complet',
  admin: 'Admin',
  add: 'Ajouter',
  administrator: 'Administrateur',
  confirmDeleteUser: 'Supprimer cet utilisateur ?',
  back: '← Retour',

  // ProjectView
  refresh: 'Rafraîchir',
  members: 'Membres',
  newTask: '+ Nouvelle tâche',
  taskTitle: 'Titre de la tâche',
  notAssigned: 'Non assigné',
  search: 'Rechercher...',
  allPriorities: 'Toutes priorités',
  high: 'Haute',
  medium: 'Moyenne',
  low: 'Basse',
  allStatuses: 'Tous statuts',
  all: 'Tous',
  reset: 'Réinitialiser',
  tasks: 'tâches',
  task: 'Tâche',
  hours: 'Heures',
  noTasks: 'Aucune tâche',
  confirmDeleteTask: 'Supprimer cette tâche ?',
  moveToStatus: 'Déplacer vers',
  projectMembers: 'Membres du projet',
  addMember: '-- Ajouter un membre --',

  // Statuses
  'status.a_discuter': 'À discuter',
  'status.todo': 'À faire',
  'status.in_progress': 'En cours',
  'status.to_review': 'À tester',
  'status.validated': 'Validé',
  'status.rejected': 'Rejeté',

  // TaskModal
  title: 'Titre',
  description: 'Description',
  status: 'Statut',
  priority: 'Priorité',
  assignedTo: 'Assigné à',
  linkCommit: 'Lier un commit',
  branch: '-- Branche --',
  selectedCommit: 'Commit sélectionné',
  on: 'sur',
  timeSpent: 'Temps passé',
  total: 'Total',
  from: 'De',
  to: 'À',
  save: 'Sauvegarder',
  currentBranch: 'Branche actuelle',
};

const en: typeof fr = {
  // App
  trackflow: 'TrackFlow',
  users: 'Users',
  logout: 'Logout',
  newProject: '+ New project',
  projectName: 'Project name',
  descriptionOptional: 'Description (optional)',
  repoPath: 'Git repo path',
  create: 'Create',
  cancel: 'Cancel',
  delete: 'Delete',
  noProjects: 'No projects. Create one to get started.',
  confirmDeleteProject: 'Delete this project?',
  changeTheme: 'Change theme',

  // Login
  login: 'Login',
  username: 'Username',
  password: 'Password',
  loginButton: 'Sign in',
  loginError: 'Invalid credentials',

  // Users
  userManagement: 'User management',
  addUser: 'Add a user',
  fullName: 'Full name',
  admin: 'Admin',
  add: 'Add',
  administrator: 'Administrator',
  confirmDeleteUser: 'Delete this user?',
  back: '← Back',

  // ProjectView
  refresh: 'Refresh',
  members: 'Members',
  newTask: '+ New task',
  taskTitle: 'Task title',
  notAssigned: 'Not assigned',
  search: 'Search...',
  allPriorities: 'All priorities',
  high: 'High',
  medium: 'Medium',
  low: 'Low',
  allStatuses: 'All statuses',
  all: 'All',
  reset: 'Reset',
  tasks: 'tasks',
  task: 'Task',
  hours: 'Hours',
  noTasks: 'No tasks',
  confirmDeleteTask: 'Delete this task?',
  moveToStatus: 'Move to',
  projectMembers: 'Project members',
  addMember: '-- Add a member --',

  // Statuses
  'status.a_discuter': 'To discuss',
  'status.todo': 'To do',
  'status.in_progress': 'In progress',
  'status.to_review': 'To review',
  'status.validated': 'Validated',
  'status.rejected': 'Rejected',

  // TaskModal
  title: 'Title',
  description: 'Description',
  status: 'Status',
  priority: 'Priority',
  assignedTo: 'Assigned to',
  linkCommit: 'Link a commit',
  branch: '-- Branch --',
  selectedCommit: 'Selected commit',
  on: 'on',
  timeSpent: 'Time spent',
  total: 'Total',
  from: 'From',
  to: 'To',
  save: 'Save',
  currentBranch: 'Current branch',
};

i18n.use(initReactI18next).init({
  resources: {
    fr: { translation: fr },
    en: { translation: en },
  },
  lng: localStorage.getItem('trackflow_lang') || 'fr',
  fallbackLng: 'fr',
  interpolation: { escapeValue: false },
});

export default i18n;
