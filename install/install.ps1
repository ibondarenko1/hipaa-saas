# Summit Local Agent — install script (outline).
# Registers the archive retention cleanup scheduled task.
# Merge this block into your full install.ps1 if you have one.

param(
    [string]$RepoRoot = (Split-Path -Parent $PSScriptRoot),
    [string]$ConfigPath = "C:\ProgramData\SummitAgent\agent.config.json",
    [string]$BaseDir = "C:\ProgramData\SummitAgent",

    # Preflight (default ON)
    [switch]$SkipPreflight,
    [switch]$PreflightAsJson,
    [switch]$PreflightFailOnWarn,

    # Optional release verification (publisher integrity + ZIP hash)
    [switch]$VerifyReleaseManifest,
    [string]$ReleaseManifestPath = "",
    [string]$PublisherKeyPath = ""
)

Set-StrictMode -Version 2.0
$ErrorActionPreference = "Stop"

# --- Preflight validation (default ON) ---
if (-not $SkipPreflight) {
    try {
        $installDir = Split-Path -Parent $MyInvocation.MyCommand.Path
        $preflightScript = Join-Path $installDir "preflight.ps1"

        if (-not (Test-Path -LiteralPath $preflightScript)) {
            throw "preflight.ps1 not found in install\"
        }

        $pfArgs = @(
            "-NoProfile",
            "-ExecutionPolicy", "Bypass",
            "-File", $preflightScript
        )

        if ($BaseDir)    { $pfArgs += @("-BaseDir", $BaseDir) }
        if ($ConfigPath) { $pfArgs += @("-ConfigPath", $ConfigPath) }

        if ($PreflightAsJson)     { $pfArgs += "-AsJson" }
        if ($PreflightFailOnWarn) { $pfArgs += "-FailOnWarn" }

        if ($VerifyReleaseManifest) {
            $pfArgs += "-VerifyReleaseManifest"
            if ($ReleaseManifestPath) { $pfArgs += @("-ReleaseManifestPath", $ReleaseManifestPath) }
            if ($PublisherKeyPath)    { $pfArgs += @("-PublisherKeyPath", $PublisherKeyPath) }
        }

        Write-Host "Running install preflight validation..."
        $p = Start-Process -FilePath "powershell.exe" -ArgumentList $pfArgs -Wait -PassThru -NoNewWindow
        if ($p.ExitCode -ne 0) {
            throw ("Preflight failed with exit code {0}. Fix issues or run with -SkipPreflight (not recommended)." -f $p.ExitCode)
        }

        Write-Host "Preflight PASSED."
    }
    catch {
        throw ("Install aborted: preflight validation failed. {0}" -f $_.Exception.Message)
    }
}
else {
    Write-Warning "Preflight skipped by request (-SkipPreflight)."
}

# Optional release verification (publisher integrity + zip hash)
if ($VerifyReleaseManifest) {
    try {
        $buildVerify = Join-Path $RepoRoot "build\verify-release.ps1"

        if ([string]::IsNullOrWhiteSpace($ReleaseManifestPath)) {
            $parent = Split-Path -Parent $RepoRoot
            if ($parent -and (Test-Path -LiteralPath $parent)) {
                $candidates = @(Get-ChildItem -LiteralPath $parent -File -Filter "*.manifest.json" -ErrorAction SilentlyContinue)
                if ($candidates.Count -eq 1) {
                    $ReleaseManifestPath = $candidates[0].FullName
                }
            }
        }

        if (-not (Test-Path -LiteralPath $buildVerify)) {
            throw "verify-release.ps1 not found in build\"
        }
        if ([string]::IsNullOrWhiteSpace($ReleaseManifestPath) -or -not (Test-Path -LiteralPath $ReleaseManifestPath)) {
            throw "Release manifest not found. Pass -ReleaseManifestPath."
        }

        $verifyArgs = @(
            "-NoProfile",
            "-ExecutionPolicy", "Bypass",
            "-File", $buildVerify,
            "-ManifestPath", $ReleaseManifestPath,
            "-VerifySignature"
        )

        if (-not [string]::IsNullOrWhiteSpace($PublisherKeyPath)) {
            $verifyArgs += @("-PublisherKeyPath", $PublisherKeyPath)
        }

        Write-Host "Verifying release manifest and ZIP integrity..."
        $p = Start-Process -FilePath "powershell.exe" -ArgumentList $verifyArgs -Wait -PassThru -NoNewWindow
        if ($p.ExitCode -ne 0) {
            throw ("Release verification failed with exit code {0}" -f $p.ExitCode)
        }

        Write-Host "Release verification passed."
    }
    catch {
        throw ("Install aborted: release verification failed. {0}" -f $_.Exception.Message)
    }
}

# --- Archive retention cleanup scheduled task (daily) ---
$cleanupScript = Join-Path $RepoRoot "agent\tools\cleanup-archive.ps1"
$cleanupTaskName = "SummitAgent Archive Cleanup"

if (Test-Path -LiteralPath $cleanupScript) {
    try {
        $action = New-ScheduledTaskAction `
            -Execute "powershell.exe" `
            -Argument "-NoProfile -ExecutionPolicy Bypass -File `"$cleanupScript`" -ConfigPath `"$ConfigPath`" -RemoveEmptyFolders"

        # Daily at 03:20 local time
        $trigger = New-ScheduledTaskTrigger -Daily -At 3:20AM

        $principal = New-ScheduledTaskPrincipal -UserId "SYSTEM" -LogonType ServiceAccount -RunLevel Highest

        $settings = New-ScheduledTaskSettingsSet `
            -StartWhenAvailable `
            -AllowStartIfOnBatteries `
            -DontStopIfGoingOnBatteries `
            -ExecutionTimeLimit (New-TimeSpan -Minutes 30)

        $task = New-ScheduledTask -Action $action -Trigger $trigger -Principal $principal -Settings $settings

        Register-ScheduledTask -TaskName $cleanupTaskName -InputObject $task -Force | Out-Null
        Write-Host "Scheduled task registered: $cleanupTaskName"
    }
    catch {
        Write-Warning ("Failed to register cleanup task '{0}': {1}" -f $cleanupTaskName, $_.Exception.Message)
    }
}
else {
    Write-Warning ("Cleanup script not found, task not registered: {0}" -f $cleanupScript)
}
