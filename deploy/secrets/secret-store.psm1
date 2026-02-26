# deploy/secrets/secret-store.psm1
# DPAPI LocalMachine store: secrets decryptable only on this machine (e.g. by SYSTEM).
Set-StrictMode -Version 2.0

function Get-SummitSecretsRoot {
    [CmdletBinding()]
    param(
        [string]$BaseDir = "C:\ProgramData\SummitAgent"
    )
    return (Join-Path $BaseDir "secrets")
}

function Ensure-Dir {
    [CmdletBinding()]
    param([Parameter(Mandatory)][string]$Path)

    if (-not (Test-Path -LiteralPath $Path)) {
        New-Item -ItemType Directory -Path $Path -Force | Out-Null
    }
}

function Get-SummitSecretPath {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)][string]$Name,
        [string]$BaseDir = "C:\ProgramData\SummitAgent"
    )

    $safe = ([string]$Name).Trim()
    if ([string]::IsNullOrWhiteSpace($safe)) { throw "Secret name is blank." }
    $safe = ($safe -replace '[^A-Za-z0-9._\-]','_')

    $root = Get-SummitSecretsRoot -BaseDir $BaseDir
    return (Join-Path $root ($safe + ".dpapi.txt"))
}

function Set-SummitSecret {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)][string]$Name,
        [Parameter(Mandatory)][string]$PlainText,
        [string]$BaseDir = "C:\ProgramData\SummitAgent"
    )

    if ([string]::IsNullOrWhiteSpace([string]$PlainText)) {
        throw "Secret value is blank."
    }

    $root = Get-SummitSecretsRoot -BaseDir $BaseDir
    Ensure-Dir -Path $root

    $path = Get-SummitSecretPath -Name $Name -BaseDir $BaseDir

    # DPAPI LocalMachine: any process on this machine (e.g. SYSTEM) can decrypt
    $bytes = [System.Text.Encoding]::UTF8.GetBytes($PlainText)
    $protected = [System.Security.Cryptography.ProtectedData]::Protect($bytes, $null, [System.Security.Cryptography.DataProtectionScope]::LocalMachine)
    [System.IO.File]::WriteAllBytes($path, $protected)

    return $path
}

function Get-SummitSecret {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)][string]$Name,
        [string]$BaseDir = "C:\ProgramData\SummitAgent"
    )

    $path = Get-SummitSecretPath -Name $Name -BaseDir $BaseDir
    if (-not (Test-Path -LiteralPath $path)) {
        throw "Secret not found: $Name ($path)"
    }

    $protected = [System.IO.File]::ReadAllBytes($path)
    if ($null -eq $protected -or $protected.Length -eq 0) {
        throw "Secret file is empty: $path"
    }

    $bytes = [System.Security.Cryptography.ProtectedData]::Unprotect($protected, $null, [System.Security.Cryptography.DataProtectionScope]::LocalMachine)
    return [System.Text.Encoding]::UTF8.GetString($bytes)
}

function Test-SummitSecretExists {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)][string]$Name,
        [string]$BaseDir = "C:\ProgramData\SummitAgent"
    )
    try {
        $path = Get-SummitSecretPath -Name $Name -BaseDir $BaseDir
        return (Test-Path -LiteralPath $path)
    } catch { return $false }
}

function Get-SummitRevokedMarkerPath {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)][string]$Name,
        [string]$BaseDir = "C:\ProgramData\SummitAgent"
    )
    $root = Get-SummitSecretsRoot -BaseDir $BaseDir
    $safe = ([string]$Name).Trim()
    $safe = ($safe -replace '[^A-Za-z0-9._\-]','_')
    return (Join-Path $root ($safe + ".revoked"))
}

function Remove-SummitSecret {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)][string]$Name,
        [string]$BaseDir = "C:\ProgramData\SummitAgent",
        [switch]$CreateRevokedMarker
    )

    $secretPath = Get-SummitSecretPath -Name $Name -BaseDir $BaseDir
    $revokedPath = Get-SummitRevokedMarkerPath -Name $Name -BaseDir $BaseDir

    if (Test-Path -LiteralPath $secretPath) {
        Remove-Item -LiteralPath $secretPath -Force
    }

    if ($CreateRevokedMarker) {
        $content = "revoked_at_utc={0}; host={1}; user={2}" -f `
            (Get-Date).ToUniversalTime().ToString("o"), $env:COMPUTERNAME, $env:USERNAME
        [System.IO.File]::WriteAllText($revokedPath, $content, [System.Text.Encoding]::UTF8)
    }

    return @{ removed = $true; secret_path = $secretPath; revoked_marker = (Test-Path -LiteralPath $revokedPath) }
}

function Test-SummitSecretRevoked {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)][string]$Name,
        [string]$BaseDir = "C:\ProgramData\SummitAgent"
    )
    $p = Get-SummitRevokedMarkerPath -Name $Name -BaseDir $BaseDir
    return (Test-Path -LiteralPath $p)
}

Export-ModuleMember -Function `
    Get-SummitSecretsRoot, Get-SummitSecretPath, Set-SummitSecret, Get-SummitSecret, Test-SummitSecretExists, `
    Remove-SummitSecret, Test-SummitSecretRevoked, Get-SummitRevokedMarkerPath
