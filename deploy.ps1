# TrackFlow - Script de deploiement
# Usage: powershell -ExecutionPolicy Bypass -File deploy.ps1
# Produit un dossier "deploy/" pret a copier sur le serveur cible

$ErrorActionPreference = "Stop"

Write-Host "=== TrackFlow Deploy ===" -ForegroundColor Cyan

# 1. Build frontend
Write-Host "`n[1/4] Build frontend..." -ForegroundColor Yellow
Set-Location "$PSScriptRoot\frontend"
npm run build
if ($LASTEXITCODE -ne 0) { throw "Frontend build failed" }

# 2. Build backend
Write-Host "`n[2/4] Build backend..." -ForegroundColor Yellow
Set-Location "$PSScriptRoot"
dotnet publish backend/src/TrackFlow.csproj -c Release -o deploy/

# 3. Copy frontend dist to wwwroot
Write-Host "`n[3/4] Copie frontend -> wwwroot..." -ForegroundColor Yellow
$wwwroot = "$PSScriptRoot\deploy\wwwroot"
if (Test-Path $wwwroot) { Remove-Item $wwwroot -Recurse -Force }
Copy-Item -Path "$PSScriptRoot\frontend\dist" -Destination $wwwroot -Recurse

# 4. Done
Write-Host "`n[4/4] Deploiement pret!" -ForegroundColor Green
Write-Host "Dossier: $PSScriptRoot\deploy\" -ForegroundColor Cyan
Write-Host ""
Write-Host "Pour lancer sur le serveur:" -ForegroundColor White
Write-Host "  cd deploy" -ForegroundColor Gray
Write-Host "  dotnet TrackFlow.dll --urls `"http://0.0.0.0:5201`"" -ForegroundColor Gray
Write-Host ""
Write-Host "N'oubliez pas de configurer appsettings.json (ConnectionStrings, Jwt:Key)" -ForegroundColor Yellow
