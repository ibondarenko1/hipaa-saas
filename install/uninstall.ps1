param(
    [switch]$RemoveData,
    [string]$BaseDir = "C:\ProgramData\SummitAgent"
)

$ErrorActionPreference = "Stop"

$taskNames = @(
    "SummitAgent Resend Outbox",
    "SummitAgent Archive Cleanup"
)

Write-Host "Summit Agent uninstall started..."

foreach ($taskName in $taskNames) {
    try {
        if (Get-Command Get-ScheduledTask -ErrorAction SilentlyContinue) {
            $t = Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue
            if ($t) {
                Unregister-ScheduledTask -TaskName $taskName -Confirm:$false -ErrorAction Stop
                Write-Host "Removed scheduled task: $taskName"
            }
        }
    } catch {
        Write-Warning ("Failed to remove scheduled task '{0}': {1}" -f $taskName, $_.Exception.Message)
    }
}

if ($RemoveData) {
    try {
        if (Test-Path -LiteralPath $BaseDir) {
            Remove-Item -LiteralPath $BaseDir -Recurse -Force
            Write-Host "Removed data directory: $BaseDir"
        }
    } catch {
        Write-Warning ("Failed to remove data directory '{0}': {1}" -f $BaseDir, $_.Exception.Message)
    }
} else {
    Write-Host "Data directory preserved: $BaseDir"
    Write-Host "Use -RemoveData to delete local data/logs/archive/outbox."
}

Write-Host "Uninstall completed."
