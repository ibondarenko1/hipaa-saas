# Backup PostgreSQL database (Docker Compose).
# Run from repo root. Creates backups/hipaa-backup-<timestamp>.sql
# Requires: docker compose running (postgres container).

Set-StrictMode -Version 2.0
$ErrorActionPreference = "Stop"

$BackupDir = Join-Path $PSScriptRoot "backups"
$Timestamp = Get-Date -Format "yyyy-MM-ddTHH-mm-ss"
$FileName = "hipaa-backup-$Timestamp.sql"
$BackupPath = Join-Path $BackupDir $FileName

if (-not (Test-Path $BackupDir)) {
    New-Item -ItemType Directory -Path $BackupDir -Force | Out-Null
}

Write-Host "Backing up database to $BackupPath ..."
try {
    docker compose exec -T postgres pg_dump -U hipaa hipaa > $BackupPath
    if ($LASTEXITCODE -ne 0) {
        throw "pg_dump failed (exit code $LASTEXITCODE). Is 'docker compose up' running?"
    }
    $size = (Get-Item $BackupPath).Length
    Write-Host "Done. Size: $([math]::Round($size/1KB, 1)) KB"
    Write-Host "To restore: .\restore-db.ps1 -BackupFile `"$BackupPath`""
} catch {
    if (Test-Path $BackupPath) { Remove-Item $BackupPath -Force -ErrorAction SilentlyContinue }
    Write-Error $_.Exception.Message
    exit 1
}
