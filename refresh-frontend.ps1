# Force frontend to reload with latest code (no cache).
# Run from project root: .\refresh-frontend.ps1

Write-Host "Stopping frontend container..." -ForegroundColor Yellow
docker compose stop frontend 2>$null

Write-Host "Removing frontend container so it starts fresh..." -ForegroundColor Yellow
docker compose rm -f frontend 2>$null

Write-Host "Starting frontend (npm install + dev server)..." -ForegroundColor Green
docker compose up -d frontend

Write-Host ""
Write-Host "Wait ~30 seconds, then:" -ForegroundColor Cyan
Write-Host "  1. Open http://localhost:5173 in a NEW INCOGNITO window (Ctrl+Shift+N)" -ForegroundColor White
Write-Host "  2. Or hard refresh: Ctrl+Shift+R" -ForegroundColor White
Write-Host ""
Write-Host "You should see:" -ForegroundColor Cyan
Write-Host "  - Tab title: 'HIPAA Platform — Pipeline: Assessment → Gap → Remediation → Report'" -ForegroundColor White
Write-Host "  - Top bar: 'Compliance pipeline · Client data → Gap analysis → Remediation → Report'" -ForegroundColor White
Write-Host "  - Dashboard table with columns: 1. Assessment | 2. Gap analysis | 3. Remediation | 4. Report" -ForegroundColor White
