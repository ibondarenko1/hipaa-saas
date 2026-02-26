param(
    [switch]$ListProfiles,

    [string]$Profile = "",
    [string]$RepoRoot = "",
    [string]$RegistryPath = "",

    # Runtime target
    [string]$BaseDir = "C:\ProgramData\SummitAgent",
    [string]$RuntimeConfigPath = "",

    # Required (for non-test-lab deployments)
    [string]$ClientOrgId = "",
    [string]$EndpointUrl = "",
    [string]$ApiKey = "",

    # Optional: resolve from DPAPI secret store (avoids passing secrets on CLI)
    [string]$ApiKeySecretName = "",
    [string]$SigningHmacSecretName = "",
    [switch]$UseDpapiSecretStore,

    # Optional signing (required if profile requires signing)
    [string]$SigningKeyId = "",
    [string]$SigningHmacKey = "",

    # Behavior flags
    [switch]$DisableUpload,
    [switch]$DisableSigning,
    [switch]$EnableSigning,
    [switch]$RequireSigning,

    # Actions
    [switch]$PreflightOnly,
    [switch]$Install,
    [switch]$RunDiagnostics,

    # Release verification passthrough (optional)
    [switch]$VerifyReleaseManifest,
    [string]$ReleaseManifestPath = "",
    [string]$PublisherKeyPath = ""
)

Set-StrictMode -Version 2.0
$ErrorActionPreference = "Stop"

function Ensure-Dir { param([string]$Path) if (-not (Test-Path -LiteralPath $Path)) { New-Item -ItemType Directory -Path $Path -Force | Out-Null } }
function Read-Json { param([string]$Path) (Get-Content -LiteralPath $Path -Raw) | ConvertFrom-Json }
function Write-Json { param($Obj,[string]$Path) ($Obj | ConvertTo-Json -Depth 20) | Set-Content -LiteralPath $Path -Encoding UTF8 }
function IsBlank { param([string]$s) return [string]::IsNullOrWhiteSpace([string]$s) }

function Resolve-RepoRoot {
    param([string]$ProvidedRepoRoot)

    if (-not (IsBlank $ProvidedRepoRoot)) {
        if (-not (Test-Path -LiteralPath $ProvidedRepoRoot)) { throw "RepoRoot not found: $ProvidedRepoRoot" }
        return (Resolve-Path -LiteralPath $ProvidedRepoRoot).Path
    }

    $here = Split-Path -Parent $MyInvocation.MyCommand.Path
    $root = (Resolve-Path (Join-Path $here "..")).Path
    return $root
}

function Load-Registry {
    param([string]$RepoRoot,[string]$RegistryPath)

    if (IsBlank $RegistryPath) {
        $RegistryPath = Join-Path $RepoRoot "deploy\profiles\PROFILE_REGISTRY.json"
    }
    if (-not (Test-Path -LiteralPath $RegistryPath)) { throw "Profile registry not found: $RegistryPath" }
    $r = Read-Json -Path $RegistryPath
    return @{ registry = $r; path = $RegistryPath }
}

function Print-Profiles {
    param($Registry,[string]$RegistryPath)
    Write-Host "Available profiles:"
    Write-Host ("Registry: {0}" -f $RegistryPath)
    foreach ($k in $Registry.profiles.PSObject.Properties.Name) {
        $p = $Registry.profiles.$k
        Write-Host ("- {0}: {1}" -f $k, [string]$p.description)
        Write-Host ("    path: {0}" -f [string]$p.path)
    }
}

function Load-ProfileConfig {
    param([string]$RepoRoot,$Registry,[string]$ProfileName)

    if (IsBlank $ProfileName) { throw "Profile is required. Use -ListProfiles." }
    if (-not $Registry.profiles.PSObject.Properties[$ProfileName]) {
        throw "Unknown profile: $ProfileName. Use -ListProfiles."
    }

    $rel = [string]$Registry.profiles.$ProfileName.path
    $abs = Join-Path $RepoRoot $rel
    if (-not (Test-Path -LiteralPath $abs)) { throw "Profile config not found: $abs" }

    $cfg = Read-Json -Path $abs
    return @{ cfg = $cfg; path = $abs }
}

function Apply-Overrides {
    param(
        $Cfg,
        [string]$ProfileName,
        [string]$ClientOrgId,
        [string]$EndpointUrl,
        [string]$ApiKey,
        [string]$SigningKeyId,
        [string]$SigningHmacKey,
        [switch]$DisableUpload,
        [switch]$DisableSigning,
        [switch]$EnableSigning,
        [switch]$RequireSigning
    )

    try { $Cfg.profile = $ProfileName } catch { }

    if ($DisableUpload) {
        $Cfg.upload.enabled = $false
        $Cfg.upload.endpoint_url = ""
        $Cfg.upload.api_key = ""
    }

    if (-not (IsBlank $ClientOrgId)) { $Cfg.client_org_id = $ClientOrgId }

    if (-not (IsBlank $EndpointUrl)) { $Cfg.upload.endpoint_url = $EndpointUrl }
    if (-not (IsBlank $ApiKey)) { $Cfg.upload.api_key = $ApiKey }

    if ($DisableSigning) {
        $Cfg.signing.enabled = $false
        $Cfg.signing.require_signing = $false
        $Cfg.signing.key_id = ""
        $Cfg.signing.hmac_key = ""
    }
    if ($EnableSigning) { $Cfg.signing.enabled = $true }
    if ($RequireSigning) { $Cfg.signing.require_signing = $true }

    if (-not (IsBlank $SigningKeyId)) { $Cfg.signing.key_id = $SigningKeyId }
    if (-not (IsBlank $SigningHmacKey)) { $Cfg.signing.hmac_key = $SigningHmacKey }

    return $Cfg
}

function Validate-ProfileConfig {
    param($Cfg)

    $errors = @()
    $warnings = @()

    try { if (IsBlank ([string]$Cfg.client_org_id)) { $errors += "client_org_id is blank" } } catch { $errors += "client_org_id missing" }

    $uploadEnabled = $false
    try { $uploadEnabled = [bool]$Cfg.upload.enabled } catch { $uploadEnabled = $false }

    if ($uploadEnabled) {
        try { if (IsBlank ([string]$Cfg.upload.endpoint_url)) { $errors += "upload.enabled=true but upload.endpoint_url is blank" } } catch { $errors += "upload.endpoint_url missing" }
        try { if (IsBlank ([string]$Cfg.upload.api_key)) { $errors += "upload.enabled=true but upload.api_key is blank" } } catch { $errors += "upload.api_key missing" }
    } else {
        $warnings += "upload.enabled=false (MOCK mode)."
    }

    $signingEnabled = $false
    $requireSigning = $false
    try { $signingEnabled = [bool]$Cfg.signing.enabled } catch { $signingEnabled = $false }
    try { $requireSigning = [bool]$Cfg.signing.require_signing } catch { $requireSigning = $false }

    if ($requireSigning -and -not $signingEnabled) {
        $errors += "signing.require_signing=true but signing.enabled=false"
    }

    if ($signingEnabled -or $requireSigning) {
        try { if (IsBlank ([string]$Cfg.signing.key_id)) { $errors += "signing enabled/required but signing.key_id is blank" } } catch { $errors += "signing.key_id missing" }
        try {
            $k = [string]$Cfg.signing.hmac_key
            if (IsBlank $k) { $errors += "signing enabled/required but signing.hmac_key is blank" }
            elseif ($k.Length -lt 32) { $warnings += "signing.hmac_key is <32 chars (consider stronger secret)" }
        } catch { $errors += "signing.hmac_key missing" }
    }

    try {
        if ($Cfg.archival -and $Cfg.archival.retention) {
            if ([int]$Cfg.archival.retention.accepted_days -lt 1) { $warnings += "archival.retention.accepted_days < 1" }
            if ([int]$Cfg.archival.retention.rejected_days -lt 1) { $warnings += "archival.retention.rejected_days < 1" }
        }
    } catch { }

    return @{ errors = $errors; warnings = $warnings }
}

# ---------------- Main ----------------
$repoRootResolved = Resolve-RepoRoot -ProvidedRepoRoot $RepoRoot
$regInfo = Load-Registry -RepoRoot $repoRootResolved -RegistryPath $RegistryPath
$registry = $regInfo.registry

if ($ListProfiles) {
    Print-Profiles -Registry $registry -RegistryPath $regInfo.path
    exit 0
}

if (IsBlank $RuntimeConfigPath) {
    $RuntimeConfigPath = Join-Path $BaseDir "agent.config.json"
}

$profInfo = Load-ProfileConfig -RepoRoot $repoRootResolved -Registry $registry -ProfileName $Profile
$cfg = $profInfo.cfg

# DPAPI secret store optional injection
if ($UseDpapiSecretStore -or -not (IsBlank $ApiKeySecretName) -or -not (IsBlank $SigningHmacSecretName)) {
    $secretMod = Join-Path $repoRootResolved "deploy\secrets\secret-store.psm1"
    if (-not (Test-Path -LiteralPath $secretMod)) { throw "Secret store module not found: $secretMod" }
    Import-Module $secretMod -Force

    if (-not (IsBlank $ApiKeySecretName)) {
        if (Test-SummitSecretRevoked -Name $ApiKeySecretName -BaseDir $BaseDir) {
            throw "API key secret is revoked: $ApiKeySecretName. Rotate it first."
        }
        $ApiKey = Get-SummitSecret -Name $ApiKeySecretName -BaseDir $BaseDir
    }
    if (-not (IsBlank $SigningHmacSecretName)) {
        if (Test-SummitSecretRevoked -Name $SigningHmacSecretName -BaseDir $BaseDir) {
            throw "Signing HMAC secret is revoked: $SigningHmacSecretName. Rotate it first."
        }
        $SigningHmacKey = Get-SummitSecret -Name $SigningHmacSecretName -BaseDir $BaseDir
    }
}

$cfg = Apply-Overrides `
    -Cfg $cfg `
    -ProfileName $Profile `
    -ClientOrgId $ClientOrgId `
    -EndpointUrl $EndpointUrl `
    -ApiKey $ApiKey `
    -SigningKeyId $SigningKeyId `
    -SigningHmacKey $SigningHmacKey `
    -DisableUpload:$DisableUpload `
    -DisableSigning:$DisableSigning `
    -EnableSigning:$EnableSigning `
    -RequireSigning:$RequireSigning

$val = Validate-ProfileConfig -Cfg $cfg
if ($val.warnings.Count -gt 0) {
    Write-Host "WARNINGS:"
    foreach ($w in $val.warnings) { Write-Host ("- {0}" -f $w) }
    Write-Host ""
}
if ($val.errors.Count -gt 0) {
    Write-Host "ERRORS:"
    foreach ($e in $val.errors) { Write-Host ("- {0}" -f $e) }
    throw "Profile validation failed. Fix errors and re-run."
}

Ensure-Dir -Path $BaseDir | Out-Null
Write-Json -Obj $cfg -Path $RuntimeConfigPath
Write-Host ("Runtime config written: {0}" -f $RuntimeConfigPath)

$preflight = Join-Path $repoRootResolved "install\preflight.ps1"
if (-not (Test-Path -LiteralPath $preflight)) { throw "preflight.ps1 not found: $preflight" }

$pfArgs = @(
    "-NoProfile",
    "-ExecutionPolicy", "Bypass",
    "-File", $preflight,
    "-BaseDir", $BaseDir,
    "-ConfigPath", $RuntimeConfigPath
)
if ($VerifyReleaseManifest) {
    $pfArgs += "-VerifyReleaseManifest"
    if (-not (IsBlank $ReleaseManifestPath)) { $pfArgs += @("-ReleaseManifestPath", $ReleaseManifestPath) }
    if (-not (IsBlank $PublisherKeyPath)) { $pfArgs += @("-PublisherKeyPath", $PublisherKeyPath) }
}

Write-Host "Running preflight..."
$p = Start-Process -FilePath "powershell.exe" -ArgumentList $pfArgs -Wait -PassThru -NoNewWindow
if ($p.ExitCode -ne 0) { throw ("Preflight failed (exit {0})." -f $p.ExitCode) }

if ($PreflightOnly -and -not $Install) {
    Write-Host "PreflightOnly requested. Exiting."
    exit 0
}

if ($Install) {
    $install = Join-Path $repoRootResolved "install\install.ps1"
    if (-not (Test-Path -LiteralPath $install)) { throw "install.ps1 not found: $install" }
    Write-Host "Running install..."
    & powershell.exe -NoProfile -ExecutionPolicy Bypass -File $install -ConfigPath $RuntimeConfigPath -BaseDir $BaseDir
}

if ($RunDiagnostics) {
    $diag = Join-Path $repoRootResolved "agent\tools\diagnostics.ps1"
    if (Test-Path -LiteralPath $diag) {
        Write-Host "Running diagnostics summary..."
        & powershell.exe -NoProfile -ExecutionPolicy Bypass -File $diag -SummaryOnly
    }
}

Write-Host "Profile apply completed."
exit 0
