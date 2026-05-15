# TrackFlow — Guide de déploiement

## Machine cible

**172.16.120.11** (public: 204.225.113.11) — PostgreSQL déjà installé.

## Prérequis

- .NET 10 Runtime
- Port 5201 ouvert dans le firewall (TCP, entrant)

## Premier déploiement

### Étape 1 — Build (sur la machine de dev)

```powershell
powershell -ExecutionPolicy Bypass -File deploy.ps1
```

Produit un dossier `deploy/`.

### Étape 2 — Créer la base de données

Sur 172.16.120.11 :

```sql
CREATE DATABASE trackflow;
```

Les tables et le user admin sont créés automatiquement au premier lancement.

### Étape 3 — Copier sur le serveur

Copier le contenu de `deploy/` vers `C:\TrackFlow\` sur 172.16.120.11.

### Étape 4 — Configurer

Modifier `C:\TrackFlow\appsettings.json` :

```json
{
  "ConnectionStrings": {
    "DefaultConnection": "Host=localhost;Database=trackflow;Username=postgres;Password=Aout4455"
  },
  "Jwt": {
    "Key": "UneCleSuperSecrete-Production-2026!"
  }
}
```

### Étape 5 — Ouvrir le port 5201

```powershell
netsh advfirewall firewall add rule name="TrackFlow" dir=in action=allow protocol=TCP localport=5201
```

### Étape 6 — Créer la tâche planifiée (démarrage auto)

```powershell
schtasks /create /tn "TrackFlow" /tr "cmd /c \"C:\Program Files\dotnet\dotnet.exe\" C:\TrackFlow\TrackFlow.dll --urls http://0.0.0.0:5201" /sc onstart /ru SYSTEM /rl HIGHEST
schtasks /run /tn "TrackFlow"
```

### Étape 7 — Accéder

`http://172.16.120.11:5201`

Connexion par défaut : `admin` / `admin`

## Mise à jour (redéploiement)

```powershell
# 1. Build sur la machine de dev
powershell -ExecutionPolicy Bypass -File deploy.ps1

# 2. Arrêter TrackFlow sur le serveur
schtasks /end /tn "TrackFlow"

# 3. Copier deploy/ → C:\TrackFlow\ (écraser les fichiers)
#    IMPORTANT: ne pas écraser appsettings.json si déjà configuré

# 4. Relancer
schtasks /run /tn "TrackFlow"
```

## Notes

- Chaque utilisateur peut configurer son propre chemin de repo git dans le projet (champ "Mon dossier git")
- Les migrations DB s'appliquent automatiquement au démarrage
