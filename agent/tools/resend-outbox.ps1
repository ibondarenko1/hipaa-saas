# agent/tools/resend-outbox.ps1
# Outbox resend worker: upload packages, update queue state, archive terminal/success.
# When upload returns CONFIG_* (local validation failure) -> TERMINAL_REJECTED + archive to rejected.
param(
    [string]$ConfigPath = "C:\ProgramData\SummitAgent\agent.config.json",
    [string]$LogFilePath = $null
)

Set-StrictMode -Version 2.0
$ErrorActionPreference = "Stop"

$script:RepoRoot = $PSScriptRoot | Split-Path -Parent | Split-Path -Parent

function Write-AgentLog {
    param([string]$Level, [string]$Message, [string]$LogFilePath)
    $line = "[{0}] [{1}] {2}" -f (Get-Date).ToUniversalTime().ToString("o"), $Level, $Message
    if ($LogFilePath) {
        $dir = Split-Path -Parent $LogFilePath
        if ($dir -and -not (Test-Path -LiteralPath $dir)) { New-Item -ItemType Directory -Path $dir -Force | Out-Null }
        Add-Content -LiteralPath $LogFilePath -Value $line -Encoding UTF8 -ErrorAction SilentlyContinue
    }
    Write-Host $line
}

function Get-SummitArchivalConfig {
    param($RuntimeCfg)
    $enabled = $true
    $archiveRoot = "C:\ProgramData\SummitAgent\archive"
    $archiveAccepted = $true
    $archiveRejected = $true
    try {
        if ($RuntimeCfg.archival) {
            try { if ($null -ne $RuntimeCfg.archival.enabled) { $enabled = [bool]$RuntimeCfg.archival.enabled } } catch { }
            try { if ($RuntimeCfg.archival.archive_root) { $archiveRoot = [string]$RuntimeCfg.archival.archive_root } } catch { }
            try { if ($null -ne $RuntimeCfg.archival.archive_accepted) { $archiveAccepted = [bool]$RuntimeCfg.archival.archive_accepted } } catch { }
            try { if ($null -ne $RuntimeCfg.archival.archive_rejected) { $archiveRejected = [bool]$RuntimeCfg.archival.archive_rejected } } catch { }
        }
    } catch { }
    $o = [pscustomobject]@{ enabled = [bool]$enabled; archive_root = $archiveRoot; archive_accepted = [bool]$archiveAccepted; archive_rejected = [bool]$archiveRejected }
    return $o
}

function Get-SummitArchiveBucketForState {
    param([string]$QueueState)
    $s = ([string]$QueueState).ToUpperInvariant()
    switch ($s) {
        "ACCEPTED" { return "accepted" }
        "DUPLICATE_ACCEPTED" { return "accepted" }
        "TERMINAL_REJECTED" { return "rejected" }
        default { return $null }
    }
}

function Get-SummitArchiveMonthFolderName {
    return (Get-Date).ToUniversalTime().ToString("yyyy-MM")
}

function Ensure-SummitDirectory {
    param([string]$Path)
    if (-not (Test-Path -LiteralPath $Path)) { New-Item -ItemType Directory -Path $Path -Force | Out-Null }
    return $Path
}

function Get-SummitPackageSidecarFiles {
    param([string]$PackageZipPath)
    $dir = Split-Path -Parent $PackageZipPath
    $base = [System.IO.Path]::GetFileNameWithoutExtension($PackageZipPath)
    $zipName = [System.IO.Path]::GetFileName($PackageZipPath)
    $result = [System.Collections.ArrayList]::new()
    $zipFull = Join-Path $dir $zipName
    if (Test-Path -LiteralPath $zipFull) { [void]$result.Add($zipFull) }
    foreach ($ext in @("queue.json", "receipt.json", "run.json", "meta.json")) {
        $p = Join-Path $dir ($base + "." + $ext)
        if (Test-Path -LiteralPath $p) { [void]$result.Add($p) }
    }
    try {
        Get-ChildItem -LiteralPath $dir -File -ErrorAction Stop | Where-Object { $_.Name -like "$base.*" } | ForEach-Object {
            if ($result -notcontains $_.FullName) { [void]$result.Add($_.FullName) }
        }
    } catch { }
    return ,@($result)
}

function Move-SummitFilesToArchive {
    param($RuntimeCfg, [string]$PackageZipPath, [string]$QueueState, [string]$Reason = $null, [string]$LogFilePath = $null)
    $cfg = Get-SummitArchivalConfig -RuntimeCfg $RuntimeCfg
    if (-not $cfg.enabled) { return $null }
    $bucket = Get-SummitArchiveBucketForState -QueueState $QueueState
    if ([string]::IsNullOrWhiteSpace($bucket)) { return $null }
    if ($bucket -eq "accepted" -and -not $cfg.archive_accepted) { return $null }
    if ($bucket -eq "rejected" -and -not $cfg.archive_rejected) { return $null }
    $monthFolder = Get-SummitArchiveMonthFolderName
    $destDir = Join-Path (Join-Path $cfg.archive_root $bucket) $monthFolder
    Ensure-SummitDirectory -Path $destDir | Out-Null
    $files = Get-SummitPackageSidecarFiles -PackageZipPath $PackageZipPath
    if (-not $files -or $files.Count -eq 0) { return $null }
    $moved = [System.Collections.ArrayList]::new()
    foreach ($src in $files) {
        try {
            if (-not (Test-Path -LiteralPath $src)) { continue }
            $name = [System.IO.Path]::GetFileName($src)
            $dst = Join-Path $destDir $name
            if (Test-Path -LiteralPath $dst) {
                $stamp = (Get-Date).ToUniversalTime().ToString("yyyyMMddTHHmmssZ")
                $n = [System.IO.Path]::GetFileNameWithoutExtension($name)
                $e = [System.IO.Path]::GetExtension($name)
                if ($name -match '\.queue\.json$') { $dst = Join-Path $destDir ($n + "." + $stamp + ".queue.json") }
                elseif ($name -match '\.receipt\.json$') { $dst = Join-Path $destDir ($n + "." + $stamp + ".receipt.json") }
                else { $dst = Join-Path $destDir ($n + "." + $stamp + $e) }
            }
            Move-Item -LiteralPath $src -Destination $dst -Force
            [void]$moved.Add($dst)
        } catch {
            if ($LogFilePath) { Write-AgentLog -Level WARN -Message ("Archival move failed: src={0}; error={1}" -f $src, $_.Exception.Message) -LogFilePath $LogFilePath }
        }
    }
    return [pscustomobject]@{ bucket = $bucket; destination_dir = $destDir; moved_files = @($moved); reason = $Reason }
}

# Load config
if (-not (Test-Path -LiteralPath $ConfigPath)) {
    Write-AgentLog -Level WARN -Message ("Config not found: {0}" -f $ConfigPath) -LogFilePath $LogFilePath
    exit 0
}
$runtimeCfg = Get-Content -LiteralPath $ConfigPath -Raw | ConvertFrom-Json
$outboxDir = [string]$runtimeCfg.paths.outbox_dir
if (-not (Test-Path -LiteralPath $outboxDir)) {
    Write-AgentLog -Level INFO -Message ("Outbox not found: {0}" -f $outboxDir) -LogFilePath $LogFilePath
    exit 0
}

$uploadEnabled = $false
try { $uploadEnabled = [bool]$runtimeCfg.upload.enabled } catch { }
if (-not $uploadEnabled) {
    Write-AgentLog -Level INFO -Message "Upload disabled in config. Exiting." -LogFilePath $LogFilePath
    exit 0
}

$ctx = [pscustomobject]@{
    RuntimeCfg   = $runtimeCfg
    RepoRoot     = $script:RepoRoot
    LogFilePath  = $LogFilePath
}

Import-Module (Join-Path $script:RepoRoot "agent\modules\upload\uploader.psm1") -Force

$zips = Get-ChildItem -LiteralPath $outboxDir -File -Filter "*.zip" -ErrorAction SilentlyContinue
foreach ($pkg in $zips) {
    $queuePath = Join-Path $outboxDir ($pkg.BaseName + ".queue.json")
    if (-not (Test-Path -LiteralPath $queuePath)) { continue }

    $queue = Get-Content -LiteralPath $queuePath -Raw | ConvertFrom-Json
    $state = [string]$queue.state
    if ($state -notin @("PENDING", "RETRY_SCHEDULED")) { continue }

    $idempotencyKey = $pkg.BaseName
    $hash = ""
    try { $hash = [string]$queue.package_hash_sha256 } catch { }

    try {
        $result = Invoke-SummitUpload -Context $ctx -IdempotencyKey $idempotencyKey -PackageHashSha256 $hash -PackagePath $pkg.FullName
    } catch {
        Write-AgentLog -Level WARN -Message ("Upload threw: file={0}; error={1}" -f $pkg.Name, $_.Exception.Message) -LogFilePath $LogFilePath
        continue
    }

    if ($null -eq $result) { continue }

    # CONFIG_* or other non-retryable REJECTED -> TERMINAL_REJECTED and archive
    $isConfigError = [string]$result.ErrorCode -like "CONFIG_*"
    $isTerminalReject = ($result.Retryable -eq $false -and ([string]$result.Status -eq "REJECTED" -or $isConfigError))

    if ($isTerminalReject) {
        $queue.state = "TERMINAL_REJECTED"
        $queue.last_error_code = [string]$result.ErrorCode
        $queue.last_result_at_utc = (Get-Date).ToUniversalTime().ToString("o")
        if ($result.Message) { $queue.last_error_message = [string]$result.Message }
        if ($result.RawResponse -and $result.RawResponse.errors) {
            $queue.last_errors = @($result.RawResponse.errors)
        }
        $queue | ConvertTo-Json -Depth 10 | Set-Content -LiteralPath $queuePath -Encoding UTF8

        $receiptPath = Join-Path $outboxDir ($pkg.BaseName + ".receipt.json")
        $receipt = [pscustomobject]@{
            at_utc       = (Get-Date).ToUniversalTime().ToString("o")
            state        = "TERMINAL_REJECTED"
            upload       = [pscustomobject]@{ mode = [string]$result.Mode; error_code = [string]$result.ErrorCode; message = [string]$result.Message }
            idempotency  = $idempotencyKey
        }
        $receipt | ConvertTo-Json -Depth 5 | Set-Content -LiteralPath $receiptPath -Encoding UTF8

        Write-AgentLog -Level INFO -Message ("Terminal rejected (config/local): file={0}; error_code={1}" -f $pkg.Name, $queue.last_error_code) -LogFilePath $LogFilePath

        $archiveInfo = $null
        try {
            $archiveInfo = Move-SummitFilesToArchive -RuntimeCfg $runtimeCfg -PackageZipPath $pkg.FullName -QueueState "TERMINAL_REJECTED" -Reason ("upload_result:CONFIG_*") -LogFilePath $LogFilePath
            if ($archiveInfo -and $archiveInfo.moved_files -and $archiveInfo.moved_files.Count -gt 0) {
                Write-AgentLog -Level INFO -Message ("Archived package set: file={0}; state=TERMINAL_REJECTED; bucket={1}; dir={2}; moved_count={3}" -f `
                    $pkg.Name, $archiveInfo.bucket, $archiveInfo.destination_dir, $archiveInfo.moved_files.Count) -LogFilePath $LogFilePath
            }
        } catch {
            Write-AgentLog -Level WARN -Message ("Archival failed: file={0}; error={1}" -f $pkg.Name, $_.Exception.Message) -LogFilePath $LogFilePath
        }
        continue
    }

    # TODO: handle ACCEPTED, DUPLICATE_ACCEPTED, retryable failures (update queue, receipt, archive accepted)
}

Write-AgentLog -Level INFO -Message "Resend pass completed." -LogFilePath $LogFilePath
