Write-Host "=== TrackFlow (Dev) ===" -ForegroundColor Cyan

$devPort = 5202
$frontPort = 5200

# Backend on dev port
Write-Host "Demarrage backend (port $devPort)..." -ForegroundColor Yellow
$backend = Start-Process -FilePath "dotnet" -ArgumentList "run --project `"$PSScriptRoot\backend\src\TrackFlow.csproj`" --urls `"http://localhost:$devPort`"" -PassThru -NoNewWindow

# Frontend with proxy to dev backend
Write-Host "Demarrage frontend (port $frontPort -> backend $devPort)..." -ForegroundColor Yellow
$env:VITE_API_PORT = $devPort
$frontend = Start-Process -FilePath "cmd.exe" -ArgumentList "/c npm run dev" -WorkingDirectory "$PSScriptRoot\frontend" -PassThru -NoNewWindow

Write-Host ""
Write-Host "TrackFlow (Dev) demarre!" -ForegroundColor Green
Write-Host "  Frontend: http://localhost:$frontPort" -ForegroundColor Cyan
Write-Host "  Backend:  http://localhost:$devPort" -ForegroundColor Cyan
Write-Host "  Prod:     http://0.0.0.0:5201 (non touche)" -ForegroundColor DarkGray
Write-Host ""
Write-Host "Appuyez sur Ctrl+C pour arreter." -ForegroundColor Gray

function Stop-All {
    if ($backend -and !$backend.HasExited) {
        taskkill /PID $backend.Id /T /F 2>$null | Out-Null
    }
    if ($frontend -and !$frontend.HasExited) {
        taskkill /PID $frontend.Id /T /F 2>$null | Out-Null
    }
    Write-Host "TrackFlow (Dev) arrete." -ForegroundColor Yellow
}

try {
    Wait-Process -Id $backend.Id
} finally {
    Stop-All
}
