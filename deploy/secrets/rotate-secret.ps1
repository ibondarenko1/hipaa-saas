param(
  [Parameter(Mandatory)][string]$Name,
  [Parameter(Mandatory)][string]$NewValue,
  [string]$BaseDir = "C:\ProgramData\SummitAgent",
  [string]$Reason = "",
  [string]$KeyId = ""
)

$ErrorActionPreference = "Stop"

$here = Split-Path -Parent $MyInvocation.MyCommand.Path
Import-Module (Join-Path $here "secret-store.psm1") -Force
Import-Module (Join-Path $here "secret-audit.psm1") -Force

# Rotate = overwrite secret file; remove revoked marker if exists
$path = Set-SummitSecret -Name $Name -PlainText $NewValue -BaseDir $BaseDir

# Remove revoked marker if present
try {
  $revoked = Get-SummitRevokedMarkerPath -Name $Name -BaseDir $BaseDir
  if (Test-Path -LiteralPath $revoked) { Remove-Item -LiteralPath $revoked -Force }
} catch { }

$log = Write-SummitSecretAuditEvent -Action "ROTATE" -SecretName $Name -Reason $Reason -KeyId $KeyId -BaseDir $BaseDir
Write-Host ("ROTATE OK: {0} (audit={1})" -f $path, $log)
