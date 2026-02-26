param(
  [Parameter(Mandatory)][string]$Name,
  [string]$BaseDir = "C:\ProgramData\SummitAgent",
  [string]$Reason = "",
  [string]$KeyId = ""
)

$ErrorActionPreference = "Stop"

$here = Split-Path -Parent $MyInvocation.MyCommand.Path
Import-Module (Join-Path $here "secret-store.psm1") -Force
Import-Module (Join-Path $here "secret-audit.psm1") -Force

$r = Remove-SummitSecret -Name $Name -BaseDir $BaseDir -CreateRevokedMarker
$log = Write-SummitSecretAuditEvent -Action "REVOKE" -SecretName $Name -Reason $Reason -KeyId $KeyId -BaseDir $BaseDir

Write-Host ("REVOKE OK: name={0}; removed={1}; revoked_marker={2}; audit={3}" -f $Name, $r.removed, $r.revoked_marker, $log)
