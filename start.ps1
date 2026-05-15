Write-Host "=== TrackFlow ===" -ForegroundColor Cyan

# Backend
Write-Host "Demarrage backend (port 5201)..." -ForegroundColor Yellow
$backend = Start-Process -FilePath "dotnet" -ArgumentList "run --project `"$PSScriptRoot\backend\src\TrackFlow.csproj`"" -PassThru -NoNewWindow

# Frontend
Write-Host "Demarrage frontend (port 5200)..." -ForegroundColor Yellow
$frontend = Start-Process -FilePath "cmd.exe" -ArgumentList "/c npm run dev" -WorkingDirectory "$PSScriptRoot\frontend" -PassThru -NoNewWindow

Write-Host ""
Write-Host "TrackFlow demarre!" -ForegroundColor Green
Write-Host "  Frontend: http://localhost:5200" -ForegroundColor Cyan
Write-Host "  Backend:  http://localhost:5201" -ForegroundColor Cyan
Write-Host ""
Write-Host "Appuyez sur Ctrl+C pour arreter." -ForegroundColor Gray

function Stop-All {
    # Kill backend tree (dotnet + TrackFlow.exe)
    if ($backend -and !$backend.HasExited) {
        taskkill /PID $backend.Id /T /F 2>$null | Out-Null
    }
    # Kill frontend tree (cmd + node)
    if ($frontend -and !$frontend.HasExited) {
        taskkill /PID $frontend.Id /T /F 2>$null | Out-Null
    }
    # Safety net
    taskkill /IM TrackFlow.exe /F 2>$null | Out-Null
    Write-Host "TrackFlow arrete." -ForegroundColor Yellow
}

try {
    Wait-Process -Id $backend.Id
} finally {
    Stop-All
}
