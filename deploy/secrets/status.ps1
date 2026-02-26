param(
  [string]$BaseDir = "C:\ProgramData\SummitAgent"
)

$ErrorActionPreference = "Stop"
$here = Split-Path -Parent $MyInvocation.MyCommand.Path
Import-Module (Join-Path $here "secret-store.psm1") -Force

$root = Get-SummitSecretsRoot -BaseDir $BaseDir
Write-Host ("Secrets root: {0}" -f $root)

if (-not (Test-Path -LiteralPath $root)) {
  Write-Host "No secrets directory."
  exit 0
}

$dpapi = @(Get-ChildItem -LiteralPath $root -File -Filter "*.dpapi.txt" -ErrorAction SilentlyContinue)
$revoked = @(Get-ChildItem -LiteralPath $root -File -Filter "*.revoked" -ErrorAction SilentlyContinue)

Write-Host ("Stored secrets: {0}" -f $dpapi.Count)
foreach ($f in $dpapi) { Write-Host ("- {0}" -f $f.Name) }

Write-Host ("Revoked markers: {0}" -f $revoked.Count)
foreach ($f in $revoked) { Write-Host ("- {0}" -f $f.Name) }
