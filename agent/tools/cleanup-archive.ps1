param(
    [string]$ConfigPath = "C:\ProgramData\SummitAgent\agent.config.json",
    [switch]$DryRun,
    [switch]$RemoveEmptyFolders,
    [string]$LogFilePath = "C:\ProgramData\SummitAgent\logs\cleanup-archive.log"
)

Set-StrictMode -Version 2.0
$ErrorActionPreference = "Stop"

# ---------------------------
# Basic logging (self-contained)
# ---------------------------
function Write-CleanupLog {
    param(
        [Parameter(Mandatory)][string]$Level,
        [Parameter(Mandatory)][string]$Message,
        [string]$Path
    )

    $ts = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
    $line = "[{0}] [{1}] {2}" -f $ts, $Level.ToUpperInvariant(), $Message

    try {
        $dir = Split-Path -Parent $Path
        if ($dir -and -not (Test-Path -LiteralPath $dir)) {
            New-Item -ItemType Directory -Path $dir -Force | Out-Null
        }
        Add-Content -LiteralPath $Path -Value $line -Encoding UTF8
    } catch {
        # fallback to console only
    }

    Write-Host $line
}

# ---------------------------
# Helpers
# ---------------------------
function Read-JsonFileSafe {
    param([Parameter(Mandatory)][string]$Path)

    if (-not (Test-Path -LiteralPath $Path)) { return $null }
    try {
        $txt = Get-Content -LiteralPath $Path -Raw -ErrorAction Stop
        if ([string]::IsNullOrWhiteSpace($txt)) { return $null }
        return ($txt | ConvertFrom-Json)
    } catch {
        return $null
    }
}

function Get-ArchivalPolicyFromConfig {
    param([Parameter(Mandatory)]$Config)

    $archiveRoot = "C:\ProgramData\SummitAgent\archive"
    $acceptedDays = 90
    $rejectedDays = 180
    $enabled = $true

    try {
        if ($Config.archival) {
            try { if ($null -ne $Config.archival.enabled) { $enabled = [bool]$Config.archival.enabled } } catch { }
            try { if ($Config.archival.archive_root) { $archiveRoot = [string]$Config.archival.archive_root } } catch { }

            if ($Config.archival.retention) {
                try { if ($Config.archival.retention.accepted_days) { $acceptedDays = [int]$Config.archival.retention.accepted_days } } catch { }
                try { if ($Config.archival.retention.rejected_days) { $rejectedDays = [int]$Config.archival.retention.rejected_days } } catch { }
            }
        }
    } catch { }

    if ($acceptedDays -lt 1) { $acceptedDays = 90 }
    if ($rejectedDays -lt 1) { $rejectedDays = 180 }

    $o = New-Object PSObject
    Add-Member -InputObject $o -MemberType NoteProperty -Name enabled -Value ([bool]$enabled)
    Add-Member -InputObject $o -MemberType NoteProperty -Name archive_root -Value $archiveRoot
    Add-Member -InputObject $o -MemberType NoteProperty -Name accepted_days -Value ([int]$acceptedDays)
    Add-Member -InputObject $o -MemberType NoteProperty -Name rejected_days -Value ([int]$rejectedDays)
    return $o
}

function New-CleanupStats {
    $s = New-Object PSObject
    Add-Member -InputObject $s -MemberType NoteProperty -Name dry_run -Value $false
    Add-Member -InputObject $s -MemberType NoteProperty -Name accepted_files_scanned -Value 0
    Add-Member -InputObject $s -MemberType NoteProperty -Name accepted_files_deleted -Value 0
    Add-Member -InputObject $s -MemberType NoteProperty -Name rejected_files_scanned -Value 0
    Add-Member -InputObject $s -MemberType NoteProperty -Name rejected_files_deleted -Value 0
    Add-Member -InputObject $s -MemberType NoteProperty -Name errors -Value 0
    Add-Member -InputObject $s -MemberType NoteProperty -Name empty_dirs_removed -Value 0
    return $s
}

function Invoke-ArchiveBucketCleanup {
    param(
        [Parameter(Mandatory)][string]$BucketRoot,
        [Parameter(Mandatory)][int]$RetentionDays,
        [Parameter(Mandatory)][string]$BucketName,
        [Parameter(Mandatory)]$Stats,
        [switch]$DryRun,
        [string]$LogFilePath
    )

    if (-not (Test-Path -LiteralPath $BucketRoot)) {
        Write-CleanupLog -Level INFO -Message ("Bucket not found, skipping: {0}" -f $BucketRoot) -Path $LogFilePath
        return
    }

    $cutoffUtc = (Get-Date).ToUniversalTime().AddDays(-1 * [double]$RetentionDays)
    Write-CleanupLog -Level INFO -Message ("Cleanup bucket={0}; root={1}; retention_days={2}; cutoff_utc={3}; dry_run={4}" -f `
        $BucketName, $BucketRoot, $RetentionDays, $cutoffUtc.ToString("o"), [bool]$DryRun) -Path $LogFilePath

    $files = @()
    try {
        $files = Get-ChildItem -LiteralPath $BucketRoot -Recurse -File -ErrorAction Stop
    } catch {
        Write-CleanupLog -Level WARN -Message ("Failed listing files in {0}: {1}" -f $BucketRoot, $_.Exception.Message) -Path $LogFilePath
        $Stats.errors = [int]$Stats.errors + 1
        return
    }

    foreach ($f in $files) {
        try {
            $lastWriteUtc = $f.LastWriteTimeUtc

            if ($BucketName -eq "accepted") {
                $Stats.accepted_files_scanned = [int]$Stats.accepted_files_scanned + 1
            } elseif ($BucketName -eq "rejected") {
                $Stats.rejected_files_scanned = [int]$Stats.rejected_files_scanned + 1
            }

            if ($lastWriteUtc -gt $cutoffUtc) {
                continue
            }

            if ($DryRun) {
                Write-CleanupLog -Level INFO -Message ("[DRY-RUN] Would delete: {0} (LastWriteTimeUtc={1})" -f `
                    $f.FullName, $lastWriteUtc.ToString("o")) -Path $LogFilePath
            }
            else {
                Remove-Item -LiteralPath $f.FullName -Force -ErrorAction Stop
                Write-CleanupLog -Level INFO -Message ("Deleted: {0}" -f $f.FullName) -Path $LogFilePath
            }

            if ($BucketName -eq "accepted") {
                $Stats.accepted_files_deleted = [int]$Stats.accepted_files_deleted + 1
            } elseif ($BucketName -eq "rejected") {
                $Stats.rejected_files_deleted = [int]$Stats.rejected_files_deleted + 1
            }
        }
        catch {
            $Stats.errors = [int]$Stats.errors + 1
            Write-CleanupLog -Level WARN -Message ("Delete failed: {0}; error={1}" -f $f.FullName, $_.Exception.Message) -Path $LogFilePath
        }
    }
}

function Remove-EmptyArchiveFolders {
    param(
        [Parameter(Mandatory)][string]$ArchiveRoot,
        [Parameter(Mandatory)]$Stats,
        [switch]$DryRun,
        [string]$LogFilePath
    )

    if (-not (Test-Path -LiteralPath $ArchiveRoot)) { return }

    # Deepest-first deletion to avoid parent-not-empty issues
    $dirs = @()
    try {
        $dirs = Get-ChildItem -LiteralPath $ArchiveRoot -Recurse -Directory -ErrorAction Stop |
            Sort-Object { $_.FullName.Length } -Descending
    } catch {
        $Stats.errors = [int]$Stats.errors + 1
        Write-CleanupLog -Level WARN -Message ("Failed listing directories for empty-folder cleanup: {0}" -f $_.Exception.Message) -Path $LogFilePath
        return
    }

    foreach ($d in $dirs) {
        try {
            $entries = Get-ChildItem -LiteralPath $d.FullName -Force -ErrorAction Stop
            if ($entries.Count -gt 0) { continue }

            if ($DryRun) {
                Write-CleanupLog -Level INFO -Message ("[DRY-RUN] Would remove empty dir: {0}" -f $d.FullName) -Path $LogFilePath
            } else {
                Remove-Item -LiteralPath $d.FullName -Force -ErrorAction Stop
                Write-CleanupLog -Level INFO -Message ("Removed empty dir: {0}" -f $d.FullName) -Path $LogFilePath
            }

            $Stats.empty_dirs_removed = [int]$Stats.empty_dirs_removed + 1
        }
        catch {
            $Stats.errors = [int]$Stats.errors + 1
            Write-CleanupLog -Level WARN -Message ("Empty-dir cleanup failed: {0}; error={1}" -f $d.FullName, $_.Exception.Message) -Path $LogFilePath
        }
    }
}

# ---------------------------
# Main
# ---------------------------
$stats = New-CleanupStats
$stats.dry_run = [bool]$DryRun

Write-CleanupLog -Level INFO -Message ("Cleanup job start. config={0}; dry_run={1}; remove_empty_folders={2}" -f `
    $ConfigPath, [bool]$DryRun, [bool]$RemoveEmptyFolders) -Path $LogFilePath

$config = Read-JsonFileSafe -Path $ConfigPath
if ($null -eq $config) {
    Write-CleanupLog -Level WARN -Message ("Config not found or invalid JSON. Using defaults. path={0}" -f $ConfigPath) -Path $LogFilePath
    $config = New-Object PSObject
}

$policy = Get-ArchivalPolicyFromConfig -Config $config

if (-not $policy.enabled) {
    Write-CleanupLog -Level INFO -Message "Archival is disabled in config. Cleanup job exiting." -Path $LogFilePath
    exit 0
}

$acceptedRoot = Join-Path $policy.archive_root "accepted"
$rejectedRoot = Join-Path $policy.archive_root "rejected"

Invoke-ArchiveBucketCleanup `
    -BucketRoot $acceptedRoot `
    -RetentionDays ([int]$policy.accepted_days) `
    -BucketName "accepted" `
    -Stats $stats `
    -DryRun:$DryRun `
    -LogFilePath $LogFilePath

Invoke-ArchiveBucketCleanup `
    -BucketRoot $rejectedRoot `
    -RetentionDays ([int]$policy.rejected_days) `
    -BucketName "rejected" `
    -Stats $stats `
    -DryRun:$DryRun `
    -LogFilePath $LogFilePath

if ($RemoveEmptyFolders) {
    Remove-EmptyArchiveFolders `
        -ArchiveRoot $policy.archive_root `
        -Stats $stats `
        -DryRun:$DryRun `
        -LogFilePath $LogFilePath
}

Write-CleanupLog -Level INFO -Message ("Cleanup summary: dry_run={0}; accepted_scanned={1}; accepted_deleted={2}; rejected_scanned={3}; rejected_deleted={4}; empty_dirs_removed={5}; errors={6}" -f `
    $stats.dry_run,
    $stats.accepted_files_scanned,
    $stats.accepted_files_deleted,
    $stats.rejected_files_scanned,
    $stats.rejected_files_deleted,
    $stats.empty_dirs_removed,
    $stats.errors) -Path $LogFilePath

if ([int]$stats.errors -gt 0) { exit 1 } else { exit 0 }
