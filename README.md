# TrackFlow

Gestionnaire de tâches multi-projet avec suivi du temps et intégration Git.

## Fonctionnalités

- Gestion multi-projets avec membres
- Tâches avec statuts (À discuter, À faire, En cours, À tester, Validé, Rejeté)
- Suivi du temps par tâche et par utilisateur
- Liaison branche/commit Git
- Filtres et tri (priorité, statut, assignation, heures)
- Thème dark/light
- i18n Français/English
- Authentification JWT

## Stack technique

- **Frontend** : React + Vite + TypeScript
- **Backend** : .NET 10 Minimal API + EF Core
- **Base de données** : PostgreSQL

## Développement

```bash
# Prérequis : Node.js, .NET 10 SDK, PostgreSQL

# Installer les dépendances frontend
cd frontend && npm install

# Lancer (backend + frontend)
powershell -ExecutionPolicy Bypass -File start.ps1
```

- Frontend : http://localhost:5200
- Backend : http://localhost:5201
- Connexion par défaut : `admin` / `admin`

## Déploiement

Voir [DEPLOY.md](DEPLOY.md) pour le guide complet.

```bash
powershell -ExecutionPolicy Bypass -File deploy.ps1
```
