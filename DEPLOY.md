# TrackFlow — Guide de déploiement

## Prérequis serveur cible

- .NET 10 Runtime
- PostgreSQL
- Port 5201 ouvert dans le firewall

## Étape 1 — Build (sur la machine de dev)

```powershell
powershell -ExecutionPolicy Bypass -File deploy.ps1
```

Produit un dossier `deploy/` contenant le backend + le frontend.

## Étape 2 — Copier sur le serveur

Copier le dossier `deploy/` sur le serveur cible (partage réseau, clé USB, SCP, etc.).

## Étape 3 — Créer la base de données

```sql
CREATE DATABASE trackflow;
```

Les tables et le user admin sont créés automatiquement au premier lancement.

## Étape 4 — Configurer

Modifier `deploy/appsettings.json` :

```json
{
  "ConnectionStrings": {
    "DefaultConnection": "Host=localhost;Database=trackflow;Username=postgres;Password=MOT_DE_PASSE"
  },
  "Jwt": {
    "Key": "UneCleSuperSecrete-Production-2026!"
  }
}
```

## Étape 5 — Lancer

```bash
cd deploy
dotnet TrackFlow.dll --urls "http://0.0.0.0:5201"
```

## Étape 6 — Accéder

Ouvrir `http://IP_SERVEUR:5201` dans le navigateur.

Connexion par défaut : `admin` / `admin`

## Optionnel — Service Windows

Pour lancer TrackFlow au démarrage du serveur :

```powershell
sc.exe create TrackFlow binPath="dotnet C:\chemin\deploy\TrackFlow.dll --urls http://0.0.0.0:5201" start=auto
sc.exe start TrackFlow
```
