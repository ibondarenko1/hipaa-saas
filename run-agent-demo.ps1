# Run agent demo: create test package (simulated anonymized data) and send to Ingest.
# Prerequisites: docker compose up (postgres, backend, ingest). Ingest listens on http://localhost:8080.
# This script: sets tenant client_org_id for Valley Creek, creates .agent-demo config + outbox, builds package, sends.

Set-StrictMode -Version 2.0
$ErrorActionPreference = "Stop"

$RepoRoot = $PSScriptRoot
$DemoDir = Join-Path $RepoRoot ".agent-demo"
$OutboxDir = Join-Path $DemoDir "outbox"
$ConfigPath = Join-Path $DemoDir "agent.config.json"

$ClientOrgId = "valley-creek-demo"
$IngestApiKey = "demo-ingest-key"
$IngestUrl = "http://localhost:8080"

# Ensure demo dir and outbox
if (-not (Test-Path $DemoDir)) { New-Item -ItemType Directory -Path $DemoDir -Force | Out-Null }
if (-not (Test-Path $OutboxDir)) { New-Item -ItemType Directory -Path $OutboxDir -Force | Out-Null }

# Agent config for demo (outbox inside repo, endpoint = local Ingest)
$config = @{
    agent_id      = "demo-agent-01"
    client_org_id = $ClientOrgId
    agent_version = "0.1.0-mvp"
    paths         = @{
        base_dir   = $DemoDir
        outbox_dir = $OutboxDir
        logs_dir   = (Join-Path $DemoDir "logs")
        archive_root = (Join-Path $DemoDir "archive")
    }
    upload        = @{
        enabled      = $true
        endpoint_url = $IngestUrl
        api_key      = $IngestApiKey
    }
    signing       = @{ enabled = $false }
    archival      = @{ enabled = $true; archive_root = (Join-Path $DemoDir "archive"); archive_accepted = $true; archive_rejected = $true }
} | ConvertTo-Json -Depth 5
Set-Content -LiteralPath $ConfigPath -Value $config -Encoding UTF8
Write-Host "Config: $ConfigPath (client_org_id=$ClientOrgId, endpoint=$IngestUrl)"

# Set tenant client_org_id so platform can map clinic -> receipts
Write-Host "Setting tenant client_org_id for Valley Creek to '$ClientOrgId'..."
$sql = "UPDATE tenants SET client_org_id = '$ClientOrgId' WHERE name = 'Valley Creek Family Practice';"
docker compose exec -T postgres psql -U hipaa hipaa -c $sql 2>$null
if ($LASTEXITCODE -ne 0) {
    Write-Warning "Could not update tenant (is docker compose up?). You can set client_org_id manually in DB."
}

# Create test package (simulated collected + anonymized data)
Write-Host "Creating test package..."
& (Join-Path $RepoRoot "agent\tools\create-test-package.ps1") -ConfigPath $ConfigPath
if ($LASTEXITCODE -ne 0) { exit 1 }

# Send to Ingest
Write-Host "Sending to Ingest..."
& (Join-Path $RepoRoot "agent\tools\resend-outbox.ps1") -ConfigPath $ConfigPath -LogFilePath (Join-Path $DemoDir "logs\resend.log")
if ($LASTEXITCODE -ne 0) { exit 1 }

Write-Host ""
Write-Host "Demo done. Check:"
Write-Host "  - Ingest receipts: curl -s -H 'X-API-Key: $IngestApiKey' '$IngestUrl/api/v1/ingest/receipts?client_org_id=$ClientOrgId&limit=5'"
Write-Host "  - Backend proxy (internal): GET /api/v1/internal/clinics/{clinicId}/ingest/receipts (clinicId = tenant id of Valley Creek)"
