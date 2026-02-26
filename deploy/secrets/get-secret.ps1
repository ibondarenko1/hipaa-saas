param(
  [Parameter(Mandatory)][string]$Name,
  [string]$BaseDir = "C:\ProgramData\SummitAgent",
  [switch]$ShowLengthOnly
)

$ErrorActionPreference = "Stop"

$here = Split-Path -Parent $MyInvocation.MyCommand.Path
Import-Module (Join-Path $here "secret-store.psm1") -Force

$v = Get-SummitSecret -Name $Name -BaseDir $BaseDir

if ($ShowLengthOnly) {
  Write-Host ("Secret OK. Length={0}" -f $v.Length)
} else {
  Write-Host $v
}
