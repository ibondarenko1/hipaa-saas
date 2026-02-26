param(
    [string]$BaseDir = "C:\ProgramData\SummitAgent",
    [string]$ConfigPath = "C:\ProgramData\SummitAgent\agent.config.json",
    [switch]$AsJson,
    [switch]$SummaryOnly,
    [int]$RecentCount = 10
)

Set-StrictMode -Version 2.0
$ErrorActionPreference = "Stop"

# ---------------------------
# Helpers
# ---------------------------
function Read-JsonFileSafe {
    param([Parameter(Mandatory)][string]$Path)
    try {
        if (-not (Test-Path -LiteralPath $Path)) { return $null }
        $txt = Get-Content -LiteralPath $Path -Raw -ErrorAction Stop
        if ([string]::IsNullOrWhiteSpace($txt)) { return $null }
        return ($txt | ConvertFrom-Json)
    } catch {
        return $null
    }
}

function New-DiagObject {
    $o = New-Object PSObject
    Add-Member -InputObject $o -MemberType NoteProperty -Name generated_at_utc -Value ((Get-Date).ToUniversalTime().ToString("o"))
    Add-Member -InputObject $o -MemberType NoteProperty -Name host -Value $env:COMPUTERNAME
    Add-Member -InputObject $o -MemberType NoteProperty -Name base_dir -Value $null
    Add-Member -InputObject $o -MemberType NoteProperty -Name config_path -Value $null
    Add-Member -InputObject $o -MemberType NoteProperty -Name config -Value $null
    Add-Member -InputObject $o -MemberType NoteProperty -Name paths -Value $null
    Add-Member -InputObject $o -MemberType NoteProperty -Name outbox -Value $null
    Add-Member -InputObject $o -MemberType NoteProperty -Name queue_states -Value $null
    Add-Member -InputObject $o -MemberType NoteProperty -Name recent_archive -Value $null
    Add-Member -InputObject $o -MemberType NoteProperty -Name scheduled_tasks -Value $null
    Add-Member -InputObject $o -MemberType NoteProperty -Name logs -Value $null
    return $o
}

function Test-Dir {
    param([string]$Path)
    try { return (Test-Path -LiteralPath $Path) } catch { return $false }
}

function Get-ConfigSummary {
    param($Config)

    $o = New-Object PSObject
    Add-Member -InputObject $o -MemberType NoteProperty -Name loaded -Value ($null -ne $Config)
    Add-Member -InputObject $o -MemberType NoteProperty -Name client_org_id -Value $null
    Add-Member -InputObject $o -MemberType NoteProperty -Name agent_version -Value $null
    Add-Member -InputObject $o -MemberType NoteProperty -Name upload_enabled -Value $false
    Add-Member -InputObject $o -MemberType NoteProperty -Name upload_endpoint_url -Value $null
    Add-Member -InputObject $o -MemberType NoteProperty -Name archival_enabled -Value $true
    Add-Member -InputObject $o -MemberType NoteProperty -Name archive_root -Value $null
    Add-Member -InputObject $o -MemberType NoteProperty -Name retention_accepted_days -Value 90
    Add-Member -InputObject $o -MemberType NoteProperty -Name retention_rejected_days -Value 180
    Add-Member -InputObject $o -MemberType NoteProperty -Name signing_enabled -Value $false
    Add-Member -InputObject $o -MemberType NoteProperty -Name signing_key_id -Value $null

    if ($null -eq $Config) { return $o }

    try { if ($Config.client_org_id) { $o.client_org_id = [string]$Config.client_org_id } } catch { }
    try { if ($Config.agent_version) { $o.agent_version = [string]$Config.agent_version } } catch { }

    try { if ($null -ne $Config.upload.enabled) { $o.upload_enabled = [bool]$Config.upload.enabled } } catch { }
    try { if ($Config.upload.endpoint_url) { $o.upload_endpoint_url = [string]$Config.upload.endpoint_url } } catch { }

    try { if ($null -ne $Config.archival.enabled) { $o.archival_enabled = [bool]$Config.archival.enabled } } catch { }
    try { if ($Config.archival.archive_root) { $o.archive_root = [string]$Config.archival.archive_root } } catch { }
    try { if ($Config.archival.retention.accepted_days) { $o.retention_accepted_days = [int]$Config.archival.retention.accepted_days } } catch { }
    try { if ($Config.archival.retention.rejected_days) { $o.retention_rejected_days = [int]$Config.archival.retention.rejected_days } } catch { }

    try { if ($null -ne $Config.signing.enabled) { $o.signing_enabled = [bool]$Config.signing.enabled } } catch { }
    try { if ($Config.signing.key_id) { $o.signing_key_id = [string]$Config.signing.key_id } } catch { }

    return $o
}

function Get-PathSummary {
    param(
        [Parameter(Mandatory)][string]$BaseDir,
        [string]$ArchiveRoot = $null
    )

    $outbox = Join-Path $BaseDir "outbox"
    $logs   = Join-Path $BaseDir "logs"
    if ([string]::IsNullOrWhiteSpace([string]$ArchiveRoot)) {
        $archive = Join-Path $BaseDir "archive"
    } else {
        $archive = $ArchiveRoot
    }

    $o = New-Object PSObject
    Add-Member -InputObject $o -MemberType NoteProperty -Name base_dir -Value $BaseDir
    Add-Member -InputObject $o -MemberType NoteProperty -Name outbox -Value $outbox
    Add-Member -InputObject $o -MemberType NoteProperty -Name archive -Value $archive
    Add-Member -InputObject $o -MemberType NoteProperty -Name logs -Value $logs
    Add-Member -InputObject $o -MemberType NoteProperty -Name outbox_exists -Value (Test-Dir $outbox)
    Add-Member -InputObject $o -MemberType NoteProperty -Name archive_exists -Value (Test-Dir $archive)
    Add-Member -InputObject $o -MemberType NoteProperty -Name logs_exists -Value (Test-Dir $logs)

    return $o
}

function Get-OutboxDiagnostics {
    param(
        [Parameter(Mandatory)][string]$OutboxPath,
        [int]$RecentCount = 10
    )

    $o = New-Object PSObject
    Add-Member -InputObject $o -MemberType NoteProperty -Name exists -Value (Test-Dir $OutboxPath)
    Add-Member -InputObject $o -MemberType NoteProperty -Name zip_count -Value 0
    Add-Member -InputObject $o -MemberType NoteProperty -Name queue_count -Value 0
    Add-Member -InputObject $o -MemberType NoteProperty -Name receipt_count -Value 0
    Add-Member -InputObject $o -MemberType NoteProperty -Name recent_packages -Value @()

    if (-not $o.exists) { return $o }

    try {
        $zips = Get-ChildItem -LiteralPath $OutboxPath -File -Filter "*.zip" -ErrorAction Stop
        $queues = Get-ChildItem -LiteralPath $OutboxPath -File -Filter "*.queue.json" -ErrorAction Stop
        $receipts = Get-ChildItem -LiteralPath $OutboxPath -File -Filter "*.receipt.json" -ErrorAction Stop

        $o.zip_count = @($zips).Count
        $o.queue_count = @($queues).Count
        $o.receipt_count = @($receipts).Count

        $recent = $zips | Sort-Object LastWriteTimeUtc -Descending | Select-Object -First $RecentCount
        $rows = @()
        foreach ($f in $recent) {
            $r = New-Object PSObject
            Add-Member -InputObject $r -MemberType NoteProperty -Name name -Value $f.Name
            Add-Member -InputObject $r -MemberType NoteProperty -Name size_bytes -Value ([int64]$f.Length)
            Add-Member -InputObject $r -MemberType NoteProperty -Name last_write_utc -Value ($f.LastWriteTimeUtc.ToString("o"))
            $rows += $r
        }
        $o.recent_packages = $rows
    } catch { }

    return $o
}

function Get-QueueStateSummary {
    param(
        [Parameter(Mandatory)][string]$OutboxPath,
        [int]$RecentCount = 10
    )

    $summary = New-Object PSObject
    Add-Member -InputObject $summary -MemberType NoteProperty -Name exists -Value (Test-Dir $OutboxPath)
    Add-Member -InputObject $summary -MemberType NoteProperty -Name counts -Value $null
    Add-Member -InputObject $summary -MemberType NoteProperty -Name recent -Value @()
    Add-Member -InputObject $summary -MemberType NoteProperty -Name due_now_count -Value 0
    Add-Member -InputObject $summary -MemberType NoteProperty -Name terminal_count -Value 0
    Add-Member -InputObject $summary -MemberType NoteProperty -Name top_error_codes -Value @()

    $counts = @{
        PENDING = 0
        RETRY_SCHEDULED = 0
        FAILED_RETRY_EXHAUSTED = 0
        ACCEPTED = 0
        DUPLICATE_ACCEPTED = 0
        TERMINAL_REJECTED = 0
        QUARANTINED = 0
        UNKNOWN = 0
    }

    $errorCodeCounts = @{}

    if (-not $summary.exists) {
        $summary.counts = [pscustomobject]$counts
        return $summary
    }

    $items = @()
    try {
        $qfiles = Get-ChildItem -LiteralPath $OutboxPath -File -Filter "*.queue.json" -ErrorAction Stop
        foreach ($qf in $qfiles) {
            $q = Read-JsonFileSafe -Path $qf.FullName
            if ($null -eq $q) { continue }

            $state = "UNKNOWN"
            try {
                if ($q.state) { $state = ([string]$q.state).ToUpperInvariant() }
            } catch { }

            if (-not $counts.ContainsKey($state)) { $state = "UNKNOWN" }
            $counts[$state] = [int]$counts[$state] + 1

            $code = $null
            try { $code = [string]$q.last_error_code } catch { }
            if (-not [string]::IsNullOrWhiteSpace($code)) {
                if (-not $errorCodeCounts.ContainsKey($code)) { $errorCodeCounts[$code] = 0 }
                $errorCodeCounts[$code] = [int]$errorCodeCounts[$code] + 1
            }

            $isTerminal = ($state -in @("ACCEPTED","DUPLICATE_ACCEPTED","TERMINAL_REJECTED","QUARANTINED"))
            if ($isTerminal) { $summary.terminal_count = [int]$summary.terminal_count + 1 }

            $dueNow = $false
            if ($state -eq "PENDING" -or $state -eq "FAILED_RETRY_EXHAUSTED") {
                $dueNow = $true
            }
            elseif ($state -eq "RETRY_SCHEDULED") {
                try {
                    if (-not $q.next_attempt_at_utc) {
                        $dueNow = $true
                    } else {
                        $nextAt = [datetime]::Parse([string]$q.next_attempt_at_utc).ToUniversalTime()
                        $dueNow = ((Get-Date).ToUniversalTime() -ge $nextAt)
                    }
                } catch {
                    $dueNow = $true
                }
            }
            if ($dueNow) { $summary.due_now_count = [int]$summary.due_now_count + 1 }

            $row = New-Object PSObject
            Add-Member -InputObject $row -MemberType NoteProperty -Name file -Value $qf.Name
            Add-Member -InputObject $row -MemberType NoteProperty -Name state -Value $state
            Add-Member -InputObject $row -MemberType NoteProperty -Name attempt_count -Value $(try { [int]$q.attempt_count } catch { 0 })
            Add-Member -InputObject $row -MemberType NoteProperty -Name last_http_status -Value $(try { $q.last_http_status } catch { $null })
            Add-Member -InputObject $row -MemberType NoteProperty -Name last_error_code -Value $(try { [string]$q.last_error_code } catch { $null })
            Add-Member -InputObject $row -MemberType NoteProperty -Name receipt_id -Value $(try { [string]$q.receipt_id } catch { $null })
            Add-Member -InputObject $row -MemberType NoteProperty -Name next_attempt_at_utc -Value $(try { [string]$q.next_attempt_at_utc } catch { $null })
            Add-Member -InputObject $row -MemberType NoteProperty -Name last_result_at_utc -Value $(try { [string]$q.last_result_at_utc } catch { $null })
            $items += $row
        }
    } catch { }

    $summary.counts = [pscustomobject]$counts

    $topErrors = @()
    foreach ($e in ($errorCodeCounts.GetEnumerator() | Sort-Object Value -Descending | Select-Object -First 5)) {
        $topErrors += [pscustomobject]@{ code = $e.Key; count = $e.Value }
    }
    $summary.top_error_codes = $topErrors

    $summary.recent = @($items | Sort-Object `
        @{ Expression = { try { [datetime]::Parse($_.last_result_at_utc) } catch { [datetime]::MinValue } }; Descending = $true } `
        | Select-Object -First $RecentCount)

    return $summary
}

function Get-RecentArchiveItems {
    param(
        [Parameter(Mandatory)][string]$ArchiveRoot,
        [int]$RecentCount = 10
    )

    $o = New-Object PSObject
    Add-Member -InputObject $o -MemberType NoteProperty -Name archive_root -Value $ArchiveRoot
    Add-Member -InputObject $o -MemberType NoteProperty -Name accepted_exists -Value (Test-Dir (Join-Path $ArchiveRoot "accepted"))
    Add-Member -InputObject $o -MemberType NoteProperty -Name rejected_exists -Value (Test-Dir (Join-Path $ArchiveRoot "rejected"))
    Add-Member -InputObject $o -MemberType NoteProperty -Name recent_accepted -Value @()
    Add-Member -InputObject $o -MemberType NoteProperty -Name recent_rejected -Value @()

    foreach ($bucket in @("accepted","rejected")) {
        $root = Join-Path $ArchiveRoot $bucket
        if (-not (Test-Dir $root)) { continue }

        try {
            $files = Get-ChildItem -LiteralPath $root -Recurse -File -ErrorAction Stop |
                Sort-Object LastWriteTimeUtc -Descending |
                Select-Object -First $RecentCount

            $rows = @()
            foreach ($f in $files) {
                $r = New-Object PSObject
                Add-Member -InputObject $r -MemberType NoteProperty -Name name -Value $f.Name
                Add-Member -InputObject $r -MemberType NoteProperty -Name relative_path -Value ($f.FullName.Substring($ArchiveRoot.Length).TrimStart('\'))
                Add-Member -InputObject $r -MemberType NoteProperty -Name size_bytes -Value ([int64]$f.Length)
                Add-Member -InputObject $r -MemberType NoteProperty -Name last_write_utc -Value ($f.LastWriteTimeUtc.ToString("o"))
                $rows += $r
            }

            if ($bucket -eq "accepted") { $o.recent_accepted = $rows }
            if ($bucket -eq "rejected") { $o.recent_rejected = $rows }
        } catch { }
    }

    return $o
}

function Get-ScheduledTaskDiagnostics {
    [CmdletBinding()]
    param()

    $o = New-Object PSObject
    Add-Member -InputObject $o -MemberType NoteProperty -Name available -Value $false
    Add-Member -InputObject $o -MemberType NoteProperty -Name tasks -Value @()

    try {
        if (-not (Get-Command Get-ScheduledTask -ErrorAction SilentlyContinue)) {
            return $o
        }

        $o.available = $true
        $names = @(
            "SummitAgent Resend Outbox",
            "SummitAgent Archive Cleanup"
        )

        $rows = @()
        foreach ($n in $names) {
            $row = New-Object PSObject
            Add-Member -InputObject $row -MemberType NoteProperty -Name task_name -Value $n
            Add-Member -InputObject $row -MemberType NoteProperty -Name exists -Value $false
            Add-Member -InputObject $row -MemberType NoteProperty -Name state -Value $null
            Add-Member -InputObject $row -MemberType NoteProperty -Name last_run_time -Value $null
            Add-Member -InputObject $row -MemberType NoteProperty -Name next_run_time -Value $null
            Add-Member -InputObject $row -MemberType NoteProperty -Name last_task_result -Value $null

            try {
                $t = Get-ScheduledTask -TaskName $n -ErrorAction Stop
                $ti = Get-ScheduledTaskInfo -TaskName $n -ErrorAction Stop

                $row.exists = $true
                try { $row.state = [string]$t.State } catch { }
                try { if ($ti.LastRunTime) { $row.last_run_time = ([datetime]$ti.LastRunTime).ToString("o") } } catch { }
                try { if ($ti.NextRunTime) { $row.next_run_time = ([datetime]$ti.NextRunTime).ToString("o") } } catch { }
                try { $row.last_task_result = $ti.LastTaskResult } catch { }
            } catch { }

            $rows += $row
        }

        $o.tasks = $rows
        return $o
    } catch {
        return $o
    }
}

function Get-RecentLogTail {
    param(
        [Parameter(Mandatory)][string]$LogPath,
        [int]$Tail = 20
    )

    $o = New-Object PSObject
    Add-Member -InputObject $o -MemberType NoteProperty -Name path -Value $LogPath
    Add-Member -InputObject $o -MemberType NoteProperty -Name exists -Value (Test-Path -LiteralPath $LogPath)
    Add-Member -InputObject $o -MemberType NoteProperty -Name lines -Value @()

    if (-not $o.exists) { return $o }

    try {
        $o.lines = @(Get-Content -LiteralPath $LogPath -Tail $Tail -ErrorAction Stop)
    } catch { }

    return $o
}

function Write-Section {
    param([string]$Title)
    Write-Host ""
    Write-Host ("=== {0} ===" -f $Title)
}

function Write-KV {
    param([string]$K, $V)
    Write-Host ("{0}: {1}" -f $K, $V)
}

# ---------------------------
# Main gather
# ---------------------------
$diag = New-DiagObject
$diag.base_dir = $BaseDir
$diag.config_path = $ConfigPath

$config = Read-JsonFileSafe -Path $ConfigPath
$configSummary = Get-ConfigSummary -Config $config
$diag.config = $configSummary

$pathSummary = Get-PathSummary -BaseDir $BaseDir -ArchiveRoot $configSummary.archive_root
$diag.paths = $pathSummary

$diag.outbox = Get-OutboxDiagnostics -OutboxPath $pathSummary.outbox -RecentCount $RecentCount
$diag.queue_states = Get-QueueStateSummary -OutboxPath $pathSummary.outbox -RecentCount $RecentCount
$diag.recent_archive = Get-RecentArchiveItems -ArchiveRoot $pathSummary.archive -RecentCount $RecentCount
$diag.scheduled_tasks = Get-ScheduledTaskDiagnostics

$cleanupLog = Join-Path $pathSummary.logs "cleanup-archive.log"
$agentLog   = Join-Path $pathSummary.logs "agent.log"
$diag.logs = New-Object PSObject
Add-Member -InputObject $diag.logs -MemberType NoteProperty -Name cleanup_archive -Value (Get-RecentLogTail -LogPath $cleanupLog -Tail 10)
Add-Member -InputObject $diag.logs -MemberType NoteProperty -Name agent -Value (Get-RecentLogTail -LogPath $agentLog -Tail 10)

# ---------------------------
# Output
# ---------------------------
if ($AsJson) {
    $diag | ConvertTo-Json -Depth 8
    exit 0
}

# Human-readable output
Write-Host "Summit Local Agent - Operator Diagnostics"
Write-Host ("Generated (UTC): {0}" -f $diag.generated_at_utc)
Write-Host ("Host: {0}" -f $diag.host)

Write-Section "Config"
Write-KV "Config loaded" $diag.config.loaded
Write-KV "Client Org ID" $diag.config.client_org_id
Write-KV "Agent version" $diag.config.agent_version
Write-KV "Upload enabled" $diag.config.upload_enabled
Write-KV "Upload endpoint" $diag.config.upload_endpoint_url
Write-KV "Signing enabled" $diag.config.signing_enabled
Write-KV "Signing key ID" $diag.config.signing_key_id
Write-KV "Archival enabled" $diag.config.archival_enabled
Write-KV "Archive root" $diag.config.archive_root
Write-KV "Retention accepted days" $diag.config.retention_accepted_days
Write-KV "Retention rejected days" $diag.config.retention_rejected_days

Write-Section "Paths"
Write-KV "Base dir" $diag.paths.base_dir
Write-KV "Outbox" ("{0} (exists={1})" -f $diag.paths.outbox, $diag.paths.outbox_exists)
Write-KV "Archive" ("{0} (exists={1})" -f $diag.paths.archive, $diag.paths.archive_exists)
Write-KV "Logs" ("{0} (exists={1})" -f $diag.paths.logs, $diag.paths.logs_exists)

Write-Section "Outbox"
Write-KV "ZIP count" $diag.outbox.zip_count
Write-KV "Queue sidecar count" $diag.outbox.queue_count
Write-KV "Receipt sidecar count" $diag.outbox.receipt_count

Write-Section "Queue State Summary"
Write-KV "Due now count" $diag.queue_states.due_now_count
Write-KV "Terminal count" $diag.queue_states.terminal_count
$qs = $diag.queue_states.counts
Write-KV "PENDING" $qs.PENDING
Write-KV "RETRY_SCHEDULED" $qs.RETRY_SCHEDULED
Write-KV "FAILED_RETRY_EXHAUSTED" $qs.FAILED_RETRY_EXHAUSTED
Write-KV "ACCEPTED" $qs.ACCEPTED
Write-KV "DUPLICATE_ACCEPTED" $qs.DUPLICATE_ACCEPTED
Write-KV "TERMINAL_REJECTED" $qs.TERMINAL_REJECTED
Write-KV "QUARANTINED" $qs.QUARANTINED
Write-KV "UNKNOWN" $qs.UNKNOWN

if (@($diag.queue_states.top_error_codes).Count -gt 0) {
    Write-Section "Top error codes (from queue sidecars)"
    foreach ($e in @($diag.queue_states.top_error_codes)) {
        Write-Host ("- {0}: {1}" -f $e.code, $e.count)
    }
}

if (-not $SummaryOnly) {
    Write-Section ("Recent Queue Items (top {0})" -f $RecentCount)
    foreach ($r in @($diag.queue_states.recent)) {
        Write-Host ("- {0} | state={1} | attempts={2} | http={3} | code={4} | next={5}" -f `
            $r.file, $r.state, $r.attempt_count, $r.last_http_status, $r.last_error_code, $r.next_attempt_at_utc)
    }

    Write-Section ("Recent Archive Accepted (top {0})" -f $RecentCount)
    foreach ($r in @($diag.recent_archive.recent_accepted)) {
        Write-Host ("- {0} | {1} | {2}" -f $r.relative_path, $r.size_bytes, $r.last_write_utc)
    }

    Write-Section ("Recent Archive Rejected (top {0})" -f $RecentCount)
    foreach ($r in @($diag.recent_archive.recent_rejected)) {
        Write-Host ("- {0} | {1} | {2}" -f $r.relative_path, $r.size_bytes, $r.last_write_utc)
    }
}

Write-Section "Scheduled Tasks"
if (-not $diag.scheduled_tasks.available) {
    Write-Host "ScheduledTasks module not available."
} else {
    foreach ($t in @($diag.scheduled_tasks.tasks)) {
        Write-Host ("- {0} | exists={1} | state={2} | last={3} | next={4} | result={5}" -f `
            $t.task_name, $t.exists, $t.state, $t.last_run_time, $t.next_run_time, $t.last_task_result)
    }
}

if (-not $SummaryOnly) {
    Write-Section "Recent Cleanup Log Tail"
    foreach ($line in @($diag.logs.cleanup_archive.lines)) { Write-Host $line }

    Write-Section "Recent Agent Log Tail"
    foreach ($line in @($diag.logs.agent.lines)) { Write-Host $line }
}
