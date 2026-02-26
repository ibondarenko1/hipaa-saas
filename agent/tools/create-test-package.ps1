# Create a test package simulating collected + anonymized data from a client machine.
# Puts ZIP + queue.json into the configured outbox for resend-outbox to send.
# Usage: .\create-test-package.ps1 -ConfigPath "path\to\agent.config.json" [-IdempotencyKey "optional-id"]

param(
    [string]$ConfigPath = "C:\ProgramData\SummitAgent\agent.config.json",
    [string]$IdempotencyKey = ("test-pkg-" + (Get-Date).ToUniversalTime().ToString("yyyyMMddTHHmmssZ"))
)

Set-StrictMode -Version 2.0
$ErrorActionPreference = "Stop"

$RepoRoot = $PSScriptRoot | Split-Path -Parent | Split-Path -Parent
if (-not (Test-Path -LiteralPath $ConfigPath)) {
    Write-Error "Config not found: $ConfigPath"
    exit 1
}
$cfg = Get-Content -LiteralPath $ConfigPath -Raw | ConvertFrom-Json
$outboxDir = [string]$cfg.paths.outbox_dir
$clientOrgId = [string]$cfg.client_org_id
$agentVersion = [string]$cfg.agent_version
if ([string]::IsNullOrWhiteSpace($agentVersion)) { $agentVersion = "0.1.0-mvp" }

$outboxDir = $outboxDir.TrimEnd('\', '/')
if (-not (Test-Path -LiteralPath $outboxDir)) {
    New-Item -ItemType Directory -Path $outboxDir -Force | Out-Null
}

$tempDir = Join-Path ([System.IO.Path]::GetTempPath()) ("SummitAgentTestPkg_" + [guid]::NewGuid().ToString("N").Substring(0, 8))
New-Item -ItemType Directory -Path $tempDir -Force | Out-Null
try {
    # manifest.json — required by Ingest (compliance = data was sanitized)
    $manifest = @{
        schema_version     = "1.0"
        client_org_id     = $clientOrgId
        idempotency_key   = $IdempotencyKey
        agent_version     = $agentVersion
        compliance        = @{
            sanitized          = $true
            raw_logs_included   = $false
        }
    }
    $utf8NoBom = New-Object System.Text.UTF8Encoding $false
    $manifestJson = $manifest | ConvertTo-Json -Depth 5 -Compress
    [System.IO.File]::WriteAllText((Join-Path $tempDir "manifest.json"), $manifestJson, $utf8NoBom)

    # Simulated anonymized payload: "collected from machine" then sanitized (no hostname, no IP, no PII)
    $anonymized = @{
        collected_at_utc   = (Get-Date).ToUniversalTime().ToString("o")
        source             = "summit-local-agent-test"
        anonymization      = @{
            applied    = $true
            hostname   = "REDACTED"
            ip_removed = $true
        }
        summary            = @{
            device_count_range = "1-5"
            os_family          = "Windows"
            report_type        = "readiness_snapshot"
        }
    }
    $anonymizedJson = $anonymized | ConvertTo-Json -Depth 5 -Compress
    [System.IO.File]::WriteAllText((Join-Path $tempDir "anonymized_snapshot.json"), $anonymizedJson, $utf8NoBom)

    $zipPath = Join-Path $tempDir ($IdempotencyKey + ".zip")
    Compress-Archive -Path (Join-Path $tempDir "manifest.json"), (Join-Path $tempDir "anonymized_snapshot.json") -DestinationPath $zipPath -Force
    $zipBytes = [System.IO.File]::ReadAllBytes($zipPath)
    $sha = [System.Security.Cryptography.SHA256]::Create()
    $hashHex = [BitConverter]::ToString($sha.ComputeHash($zipBytes)).Replace("-", "").ToLowerInvariant()

    $destZip = Join-Path $outboxDir ($IdempotencyKey + ".zip")
    Copy-Item -LiteralPath $zipPath -Destination $destZip -Force

    $queue = @{
        idempotency_key     = $IdempotencyKey
        package_hash_sha256 = $hashHex
        state               = "PENDING"
        created_at_utc      = (Get-Date).ToUniversalTime().ToString("o")
    }
    $queuePath = Join-Path $outboxDir ($IdempotencyKey + ".queue.json")
    $queue | ConvertTo-Json -Depth 5 | Set-Content -LiteralPath $queuePath -Encoding UTF8

    Write-Host "Created test package: $IdempotencyKey"
    Write-Host "  Outbox: $outboxDir"
    Write-Host "  SHA256: $hashHex"
    Write-Host "  manifest: compliance.sanitized=true, raw_logs_included=false"
    Write-Host "  Next: run resend-outbox.ps1 to send to Ingest."
} finally {
    if (Test-Path -LiteralPath $tempDir) { Remove-Item -LiteralPath $tempDir -Recurse -Force -ErrorAction SilentlyContinue }
}
