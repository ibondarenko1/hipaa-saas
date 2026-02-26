# Restore PostgreSQL database from a backup file (Docker Compose).
# Run from repo root. Requires: docker compose running (postgres container).
# Usage: .\restore-db.ps1 -BackupFile "backups\hipaa-backup-2026-02-25T12-00-00.sql"

param(
    [Parameter(Mandatory=$true)]
    [string]$BackupFile
)

Set-StrictMode -Version 2.0
$ErrorActionPreference = "Stop"

$FullPath = $BackupFile
if (-not [System.IO.Path]::IsPathRooted($BackupFile)) {
    $FullPath = Join-Path $PSScriptRoot $BackupFile
}
if (-not (Test-Path $FullPath)) {
    Write-Error "Backup file not found: $FullPath"
    exit 1
}

Write-Host "WARNING: This will REPLACE the current database with the backup."
Write-Host "Backup file: $FullPath"
$confirm = Read-Host "Type 'yes' to continue"
if ($confirm -ne "yes") {
    Write-Host "Aborted."
    exit 0
}

Write-Host "Restoring ..."
Get-Content $FullPath -Raw | docker compose exec -T postgres psql -U hipaa hipaa
if ($LASTEXITCODE -ne 0) {
    Write-Error "Restore failed (exit code $LASTEXITCODE)."
    exit 1
}
Write-Host "Done. Restart backend if needed: docker compose restart backend"
