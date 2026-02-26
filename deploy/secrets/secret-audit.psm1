# deploy/secrets/secret-audit.psm1
Set-StrictMode -Version 2.0

function Get-SummitSecretAuditLogPath {
    [CmdletBinding()]
    param([string]$BaseDir = "C:\ProgramData\SummitAgent")

    $root = Join-Path $BaseDir "secrets"
    if (-not (Test-Path -LiteralPath $root)) {
        New-Item -ItemType Directory -Path $root -Force | Out-Null
    }
    return (Join-Path $root "audit.log")
}

function Write-SummitSecretAuditEvent {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)][string]$Action,       # ROTATE | REVOKE
        [Parameter(Mandatory)][string]$SecretName,
        [string]$Reason = "",
        [string]$KeyId = "",
        [string]$BaseDir = "C:\ProgramData\SummitAgent"
    )

    $ts = (Get-Date).ToUniversalTime().ToString("o")
    $hostName = $env:COMPUTERNAME
    $user = $env:USERNAME
    $log = Get-SummitSecretAuditLogPath -BaseDir $BaseDir

    # Never log secret values.
    $line = "{0} action={1} secret={2} host={3} user={4} key_id={5} reason={6}" -f `
        $ts,
        ($Action.ToUpperInvariant()),
        $SecretName,
        $hostName,
        $user,
        $KeyId,
        ($Reason -replace '\s+', ' ').Trim()

    Add-Content -LiteralPath $log -Value $line -Encoding UTF8
    return $log
}

Export-ModuleMember -Function Get-SummitSecretAuditLogPath, Write-SummitSecretAuditEvent
