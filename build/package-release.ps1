param(
    [string]$Version = "0.1.0-mvp",
    [string]$RepoRoot = ($PSScriptRoot | Split-Path -Parent),
    [string]$OutputDir = "",
    [switch]$CleanOutput,

    # Manifest signing (publisher integrity)
    [switch]$SignManifest,
    [string]$PublisherKeyPath = "",
    [string]$PublisherKeyId = "publisher-dev-01"
)

Set-StrictMode -Version 2.0
$ErrorActionPreference = "Stop"

function Ensure-Dir {
    param([Parameter(Mandatory)][string]$Path)
    if (-not (Test-Path -LiteralPath $Path)) {
        New-Item -ItemType Directory -Path $Path -Force | Out-Null
    }
    return $Path
}

function Remove-DirSafe {
    param([Parameter(Mandatory)][string]$Path)
    if (Test-Path -LiteralPath $Path) {
        Remove-Item -LiteralPath $Path -Recurse -Force
    }
}

function Copy-IfExists {
    param(
        [Parameter(Mandatory)][string]$Source,
        [Parameter(Mandatory)][string]$Destination
    )
    if (Test-Path -LiteralPath $Source) {
        $destParent = Split-Path -Parent $Destination
        if ($destParent) { Ensure-Dir -Path $destParent | Out-Null }
        Copy-Item -LiteralPath $Source -Destination $Destination -Force
        return $true
    }
    return $false
}

function Copy-DirIfExists {
    param(
        [Parameter(Mandatory)][string]$SourceDir,
        [Parameter(Mandatory)][string]$DestDir
    )
    if (Test-Path -LiteralPath $SourceDir) {
        Ensure-Dir -Path $DestDir | Out-Null
        Copy-Item -LiteralPath (Join-Path $SourceDir '*') -Destination $DestDir -Recurse -Force
        return $true
    }
    return $false
}

function Get-FileSha256Hex {
    param([Parameter(Mandatory)][string]$Path)
    $h = Get-FileHash -LiteralPath $Path -Algorithm SHA256
    return ([string]$h.Hash).ToUpperInvariant()
}

function Get-Utf8Bytes {
    param([Parameter(Mandatory)][string]$Text)
    return [System.Text.Encoding]::UTF8.GetBytes($Text)
}

function Get-HmacSha256Hex {
    param(
        [Parameter(Mandatory)][string]$Text,
        [Parameter(Mandatory)][string]$Secret
    )

    $keyBytes = Get-Utf8Bytes -Text $Secret
    $msgBytes = Get-Utf8Bytes -Text $Text

    $hmac = New-Object System.Security.Cryptography.HMACSHA256($keyBytes)
    try {
        $hashBytes = $hmac.ComputeHash($msgBytes)
        return ([System.BitConverter]::ToString($hashBytes)).Replace("-", "").ToUpperInvariant()
    }
    finally {
        $hmac.Dispose()
    }
}

function Read-SecretTextFile {
    param([Parameter(Mandatory)][string]$Path)

    if (-not (Test-Path -LiteralPath $Path)) {
        throw "Secret file not found: $Path"
    }

    $raw = Get-Content -LiteralPath $Path -Raw -ErrorAction Stop
    if ($null -eq $raw) { throw "Secret file is empty: $Path" }

    $secret = ([string]$raw).Trim()
    if ([string]::IsNullOrWhiteSpace($secret)) {
        throw "Secret file contains blank secret: $Path"
    }

    if ($secret.Length -lt 32) {
        throw "Secret too short (<32 chars). Use a longer random secret."
    }

    return $secret
}

function Convert-ReleaseManifestToCanonicalPayload {
    param([Parameter(Mandatory)]$Manifest)

    # Stable payload for signing. IMPORTANT: exclude signature block itself.
    # included_items sorted for deterministic output.
    $included = @()
    try {
        if ($Manifest.included_items) {
            $included = @($Manifest.included_items | ForEach-Object { [string]$_ } | Sort-Object)
        }
    } catch { }

    $payload = [ordered]@{
        manifest_schema_version = [string]$Manifest.manifest_schema_version
        package_name            = [string]$Manifest.package_name
        version                 = [string]$Manifest.version
        created_at_utc          = [string]$Manifest.created_at_utc
        zip_file                = [string]$Manifest.zip_file
        zip_sha256              = [string]$Manifest.zip_sha256
        included_items          = @($included)
    }

    # Compress JSON for stable one-line serialization
    return (($payload | ConvertTo-Json -Depth 5 -Compress))
}

# Resolve paths
if ([string]::IsNullOrWhiteSpace($OutputDir)) {
    $OutputDir = Join-Path $RepoRoot "release"
}

$buildTmp = Join-Path $RepoRoot "build\tmp"
$stageRoot = Join-Path $buildTmp ("summit-local-agent-v" + $Version)
$packageRoot = Join-Path $stageRoot "summit-local-agent"

if ([string]::IsNullOrWhiteSpace($PublisherKeyPath)) {
    $PublisherKeyPath = Join-Path $RepoRoot "build\publisher-signing.key.txt"
}

if ($CleanOutput) {
    Remove-DirSafe -Path $OutputDir
}
Ensure-Dir -Path $OutputDir | Out-Null
Remove-DirSafe -Path $stageRoot
Ensure-Dir -Path $packageRoot | Out-Null

Write-Host ("RepoRoot:  {0}" -f $RepoRoot)
Write-Host ("OutputDir: {0}" -f $OutputDir)
Write-Host ("Version:   {0}" -f $Version)

# Copy required directories
$copied = @()

if (Copy-DirIfExists -SourceDir (Join-Path $RepoRoot "agent") -DestDir (Join-Path $packageRoot "agent")) {
    $copied += "agent/"
} else {
    throw "Required folder missing: agent"
}

if (Copy-DirIfExists -SourceDir (Join-Path $RepoRoot "install") -DestDir (Join-Path $packageRoot "install")) {
    $copied += "install/"
} else {
    throw "Required folder missing: install"
}

if (Copy-DirIfExists -SourceDir (Join-Path $RepoRoot "deploy") -DestDir (Join-Path $packageRoot "deploy")) {
    $copied += "deploy/"
}

# Config folder (rename template to shipped name if needed)
$cfgDestDir = Join-Path $packageRoot "config"
Ensure-Dir -Path $cfgDestDir | Out-Null

$cfgCandidates = @(
    (Join-Path $RepoRoot "config\agent.config.template.json"),
    (Join-Path $RepoRoot "config\agent.config.json"),
    (Join-Path $RepoRoot "config\agent.config.template.sample.json")
)

$cfgCopied = $false
foreach ($c in $cfgCandidates) {
    if (Test-Path -LiteralPath $c) {
        Copy-Item -LiteralPath $c -Destination (Join-Path $cfgDestDir "agent.config.template.json") -Force
        $cfgCopied = $true
        break
    }
}
if (-not $cfgCopied) {
    throw "No config template found in config\"
}
$copied += "config/agent.config.template.json"

# Optional docs folder
$docsDir = Join-Path $packageRoot "docs"
Ensure-Dir -Path $docsDir | Out-Null

if (Test-Path -LiteralPath (Join-Path $RepoRoot "RELEASE_NOTES.md")) {
    Copy-Item -LiteralPath (Join-Path $RepoRoot "RELEASE_NOTES.md") -Destination (Join-Path $docsDir "RELEASE_NOTES.md") -Force
    $copied += "docs/RELEASE_NOTES.md"
}

# Top-level docs/files
foreach ($f in @("README.md","LICENSE")) {
    $src = Join-Path $RepoRoot $f
    $dst = Join-Path $packageRoot $f
    if (Copy-IfExists -Source $src -Destination $dst) {
        $copied += $f
    }
}

# Build ZIP
$zipName = "summit-local-agent-v{0}.zip" -f $Version
$zipPath = Join-Path $OutputDir $zipName
if (Test-Path -LiteralPath $zipPath) {
    Remove-Item -LiteralPath $zipPath -Force
}

Compress-Archive -Path $packageRoot -DestinationPath $zipPath -Force
Write-Host ("Created ZIP: {0}" -f $zipPath)

# SHA256 file
$shaHex = Get-FileSha256Hex -Path $zipPath
$shaFile = Join-Path $OutputDir ("summit-local-agent-v{0}.sha256.txt" -f $Version)
$shaLine = "{0} *{1}" -f $shaHex, $zipName
[System.IO.File]::WriteAllText($shaFile, $shaLine, [System.Text.Encoding]::UTF8)
Write-Host ("Created SHA256: {0}" -f $shaFile)

# Manifest JSON (v2 + optional signature)
$manifest = New-Object PSObject
Add-Member -InputObject $manifest -MemberType NoteProperty -Name manifest_schema_version -Value "release_manifest_v2"
Add-Member -InputObject $manifest -MemberType NoteProperty -Name package_name -Value "summit-local-agent"
Add-Member -InputObject $manifest -MemberType NoteProperty -Name version -Value $Version
Add-Member -InputObject $manifest -MemberType NoteProperty -Name created_at_utc -Value ((Get-Date).ToUniversalTime().ToString("o"))
Add-Member -InputObject $manifest -MemberType NoteProperty -Name zip_file -Value $zipName
Add-Member -InputObject $manifest -MemberType NoteProperty -Name zip_sha256 -Value $shaHex
Add-Member -InputObject $manifest -MemberType NoteProperty -Name build_host -Value $env:COMPUTERNAME
Add-Member -InputObject $manifest -MemberType NoteProperty -Name included_items -Value @($copied)

# Optional publisher signature (HMAC-SHA256)
if ($SignManifest) {
    $publisherSecret = Read-SecretTextFile -Path $PublisherKeyPath
    $canonicalPayload = Convert-ReleaseManifestToCanonicalPayload -Manifest $manifest
    $sigHex = Get-HmacSha256Hex -Text $canonicalPayload -Secret $publisherSecret

    $sigObj = New-Object PSObject
    Add-Member -InputObject $sigObj -MemberType NoteProperty -Name algorithm -Value "HMAC-SHA256"
    Add-Member -InputObject $sigObj -MemberType NoteProperty -Name key_id -Value $PublisherKeyId
    Add-Member -InputObject $sigObj -MemberType NoteProperty -Name signed_fields -Value @(
        "manifest_schema_version",
        "package_name",
        "version",
        "created_at_utc",
        "zip_file",
        "zip_sha256",
        "included_items"
    )
    Add-Member -InputObject $sigObj -MemberType NoteProperty -Name signature_hex -Value $sigHex

    Add-Member -InputObject $manifest -MemberType NoteProperty -Name signature -Value $sigObj

    Write-Host ("Manifest signed with HMAC-SHA256 (key_id={0})" -f $PublisherKeyId)
} else {
    Write-Host "Manifest signing skipped (-SignManifest not set)."
}

$manifestFile = Join-Path $OutputDir ("summit-local-agent-v{0}.manifest.json" -f $Version)
$manifest | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath $manifestFile -Encoding UTF8
Write-Host ("Created manifest: {0}" -f $manifestFile)

# Cleanup temp stage
Remove-DirSafe -Path $stageRoot

Write-Host ""
Write-Host "Release bundle created successfully:"
Write-Host ("- {0}" -f $zipPath)
Write-Host ("- {0}" -f $shaFile)
Write-Host ("- {0}" -f $manifestFile)
