param(
  [string]$BaseDir = "C:\ProgramData\SummitAgent",
  [switch]$SkipReleaseVerify
)

$ErrorActionPreference = "Stop"

$here = Split-Path -Parent $MyInvocation.MyCommand.Path
$repoRoot = (Resolve-Path (Join-Path $here "..\..\..")).Path

# Load ENV overrides (secrets)
$envFile = Join-Path $here "ENV.ps1"
if (-not (Test-Path -LiteralPath $envFile)) {
  throw "ENV.ps1 not found. Copy ENV.template.ps1 -> ENV.ps1 and fill secrets."
}
. $envFile

# Read profile config
$profileCfgPath = Join-Path $here "agent.config.json"
$cfg = Get-Content $profileCfgPath -Raw | ConvertFrom-Json

# Apply ENV values
$cfg.client_org_id = $Env:SUMMIT_CLIENT_ORG_ID
$cfg.upload.endpoint_url = $Env:SUMMIT_UPLOAD_ENDPOINT
$cfg.upload.api_key = $Env:SUMMIT_UPLOAD_API_KEY
$cfg.signing.key_id = $Env:SUMMIT_SIGNING_KEY_ID
$cfg.signing.hmac_key = $Env:SUMMIT_SIGNING_HMAC_KEY

# Write runtime config
$cfgDir = Join-Path $BaseDir "config"
if (-not (Test-Path -LiteralPath $cfgDir)) { New-Item -ItemType Directory -Path $cfgDir -Force | Out-Null }
$runtimeCfgPath = Join-Path $BaseDir "agent.config.json"
($cfg | ConvertTo-Json -Depth 10) | Set-Content -LiteralPath $runtimeCfgPath -Encoding UTF8

Write-Host "Runtime config written: $runtimeCfgPath"

# Preflight
$preflight = Join-Path $repoRoot "install\preflight.ps1"
$pfResult = & powershell.exe -NoProfile -ExecutionPolicy Bypass -File $preflight -BaseDir $BaseDir -ConfigPath $runtimeCfgPath
if ($LASTEXITCODE -ne 0) { throw "Preflight failed (exit code $LASTEXITCODE). Fix issues before installing." }

# Install
$install = Join-Path $repoRoot "install\install.ps1"
& powershell.exe -NoProfile -ExecutionPolicy Bypass -File $install -ConfigPath $runtimeCfgPath -BaseDir $BaseDir

# Diagnostics summary
$diag = Join-Path $repoRoot "agent\tools\diagnostics.ps1"
& powershell.exe -NoProfile -ExecutionPolicy Bypass -File $diag -SummaryOnly
