# TrackFlow — Guide de déploiement

## Machine cible

**172.16.120.11** (public: 204.225.113.11) — PostgreSQL déjà installé.

## Prérequis

- .NET 10 Runtime
- Git for Windows (`C:\Program Files\Git\cmd\git.exe`)
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
  },
  "Urls": "http://0.0.0.0:5201"
}
```

> **Important** : `0.0.0.0` permet l'accès depuis d'autres machines. `localhost` ne serait accessible que localement.

### Étape 5 — Ouvrir le port 5201

```powershell
netsh advfirewall firewall add rule name="TrackFlow" dir=in action=allow protocol=TCP localport=5201
```

### Étape 6 — Créer la tâche planifiée (démarrage auto)

```powershell
schtasks /create /tn "TrackFlow" /tr "cmd /c \"C:\Program Files\dotnet\dotnet.exe\" C:\TrackFlow\TrackFlow.dll" /sc onstart /ru SYSTEM /rl HIGHEST
schtasks /run /tn "TrackFlow"
```

### Étape 7 — Accéder

`http://172.16.120.11:5201`

Connexion par défaut : `admin` / `admin`

## Mise à jour (redéploiement)

```powershell
# 1. Build sur la machine de dev
powershell -ExecutionPolicy Bypass -File deploy.ps1

# 2. Arrêter TrackFlow sur le serveur (PowerShell admin)
schtasks /end /tn "TrackFlow"
taskkill /IM TrackFlow.exe /F   # si le process reste actif

# 3. Copier deploy/ → C:\TrackFlow\ (écraser les fichiers)
#    IMPORTANT: ne pas écraser appsettings.json si déjà configuré
robocopy deploy C:\TrackFlow /E /XF appsettings.json

# 4. Relancer
schtasks /run /tn "TrackFlow"
```

## Développement local (sans toucher à la prod)

```powershell
powershell -ExecutionPolicy Bypass -File start.ps1
```

Lance le backend sur le port **5202** et le frontend sur **5200**.
La prod sur le port 5201 n'est pas affectée.

## Notes

- Git doit être installé sur le serveur (`C:\Program Files\Git\cmd\git.exe`)
- Les migrations DB s'appliquent automatiquement au démarrage
- Le repo git du projet doit être accessible depuis le chemin configuré dans "Repo path"
