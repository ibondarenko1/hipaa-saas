param(
    [Parameter(Mandatory)][string]$ManifestPath,
    [string]$ReleaseDir = "",
    [switch]$VerifySignature,
    [string]$PublisherKeyPath = ""
)

Set-StrictMode -Version 2.0
$ErrorActionPreference = "Stop"

function Read-JsonFile {
    param([Parameter(Mandatory)][string]$Path)
    if (-not (Test-Path -LiteralPath $Path)) { throw "JSON file not found: $Path" }
    $txt = Get-Content -LiteralPath $Path -Raw -ErrorAction Stop
    if ([string]::IsNullOrWhiteSpace($txt)) { throw "JSON file empty: $Path" }
    return ($txt | ConvertFrom-Json)
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
    if (-not (Test-Path -LiteralPath $Path)) { throw "Secret file not found: $Path" }
    $raw = Get-Content -LiteralPath $Path -Raw -ErrorAction Stop
    $secret = ([string]$raw).Trim()
    if ([string]::IsNullOrWhiteSpace($secret)) { throw "Secret is blank in: $Path" }
    return $secret
}

function Convert-ReleaseManifestToCanonicalPayload {
    param([Parameter(Mandatory)]$Manifest)

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

    return (($payload | ConvertTo-Json -Depth 5 -Compress))
}

# Main
$manifest = Read-JsonFile -Path $ManifestPath
$manifestDir = Split-Path -Parent $ManifestPath

if ([string]::IsNullOrWhiteSpace($ReleaseDir)) {
    $ReleaseDir = $manifestDir
}
if ([string]::IsNullOrWhiteSpace($PublisherKeyPath)) {
    $PublisherKeyPath = Join-Path $PSScriptRoot "publisher-signing.key.txt"
}

Write-Host ("Manifest:   {0}" -f $ManifestPath)
Write-Host ("ReleaseDir: {0}" -f $ReleaseDir)

if (-not $manifest.zip_file) { throw "Manifest missing zip_file" }
if (-not $manifest.zip_sha256) { throw "Manifest missing zip_sha256" }

$zipPath = Join-Path $ReleaseDir ([string]$manifest.zip_file)
if (-not (Test-Path -LiteralPath $zipPath)) {
    throw "ZIP file referenced by manifest not found: $zipPath"
}

$actualZipHash = Get-FileSha256Hex -Path $zipPath
$expectedZipHash = ([string]$manifest.zip_sha256).ToUpperInvariant()

if ($actualZipHash -ne $expectedZipHash) {
    throw ("ZIP SHA256 mismatch. expected={0}; actual={1}" -f $expectedZipHash, $actualZipHash)
}
Write-Host ("ZIP SHA256 OK: {0}" -f $actualZipHash)

if ($VerifySignature) {
    if (-not $manifest.signature) { throw "Manifest has no signature block" }

    $alg = ""
    try { $alg = [string]$manifest.signature.algorithm } catch { }
    if ($alg -ne "HMAC-SHA256") {
        throw ("Unsupported signature algorithm: {0}" -f $alg)
    }

    $sigHexExpected = ""
    try { $sigHexExpected = ([string]$manifest.signature.signature_hex).ToUpperInvariant() } catch { }
    if ([string]::IsNullOrWhiteSpace($sigHexExpected)) {
        throw "Manifest signature.signature_hex missing"
    }

    $secret = Read-SecretTextFile -Path $PublisherKeyPath
    $canonicalPayload = Convert-ReleaseManifestToCanonicalPayload -Manifest $manifest
    $sigHexActual = Get-HmacSha256Hex -Text $canonicalPayload -Secret $secret

    if ($sigHexActual -ne $sigHexExpected) {
        throw ("Manifest signature mismatch. expected={0}; actual={1}" -f $sigHexExpected, $sigHexActual)
    }

    Write-Host ("Manifest signature OK ({0}, key_id={1})" -f $alg, [string]$manifest.signature.key_id)
}
else {
    Write-Host "Signature verification skipped (-VerifySignature not set)."
}

Write-Host "Release verification PASSED."
exit 0
