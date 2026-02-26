param(
  [Parameter(Mandatory)][string]$Name,
  [Parameter(Mandatory)][string]$Value,
  [string]$BaseDir = "C:\ProgramData\SummitAgent"
)

$ErrorActionPreference = "Stop"

$here = Split-Path -Parent $MyInvocation.MyCommand.Path
Import-Module (Join-Path $here "secret-store.psm1") -Force

$path = Set-SummitSecret -Name $Name -PlainText $Value -BaseDir $BaseDir
Write-Host ("Secret stored: {0}" -f $path)
