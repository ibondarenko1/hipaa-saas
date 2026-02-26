param(
  [Parameter(Mandatory)][string]$Name,
  [string]$BaseDir = "C:\ProgramData\SummitAgent"
)

$ErrorActionPreference = "Stop"

$here = Split-Path -Parent $MyInvocation.MyCommand.Path
Import-Module (Join-Path $here "secret-store.psm1") -Force

if (-not (Test-SummitSecretExists -Name $Name -BaseDir $BaseDir)) {
  throw "Secret missing: $Name"
}

$v = Get-SummitSecret -Name $Name -BaseDir $BaseDir
Write-Host ("PASS: Secret readable. Name={0}, Length={1}" -f $Name, $v.Length)
