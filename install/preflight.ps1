param(
    [string]$BaseDir = "C:\ProgramData\SummitAgent",
    [string]$ConfigPath = "C:\ProgramData\SummitAgent\agent.config.json",
    [switch]$AsJson,
    [switch]$FailOnWarn,

    # Optional release verification
    [switch]$VerifyReleaseManifest,
    [string]$ReleaseManifestPath = "",
    [string]$PublisherKeyPath = ""
)

Set-StrictMode -Version 2.0
$ErrorActionPreference = "Stop"

# ---------------------------
# Result helpers
# ---------------------------
function New-CheckResult {
    param(
        [Parameter(Mandatory)][string]$Name,
        [Parameter(Mandatory)][string]$Status, # PASS|WARN|FAIL|SKIP
        [Parameter(Mandatory)][string]$Message,
        [hashtable]$Data = $null
    )
    $o = New-Object PSObject
    Add-Member -InputObject $o -MemberType NoteProperty -Name name -Value $Name
    Add-Member -InputObject $o -MemberType NoteProperty -Name status -Value $Status
    Add-Member -InputObject $o -MemberType NoteProperty -Name message -Value $Message
    Add-Member -InputObject $o -MemberType NoteProperty -Name data -Value $Data
    return $o
}

function Add-Check {
    param(
        [Parameter(Mandatory)][System.Collections.ArrayList]$List,
        [Parameter(Mandatory)]$Check
    )
    [void]$List.Add($Check)
}

function Get-PreflightSummary {
    param([Parameter(Mandatory)][System.Collections.ArrayList]$Checks)

    $pass = 0; $warn = 0; $fail = 0; $skip = 0
    foreach ($c in $Checks) {
        switch ([string]$c.status) {
            "PASS" { $pass++ }
            "WARN" { $warn++ }
            "FAIL" { $fail++ }
            "SKIP" { $skip++ }
            default { }
        }
    }

    $o = New-Object PSObject
    Add-Member -InputObject $o -MemberType NoteProperty -Name pass -Value $pass
    Add-Member -InputObject $o -MemberType NoteProperty -Name warn -Value $warn
    Add-Member -InputObject $o -MemberType NoteProperty -Name fail -Value $fail
    Add-Member -InputObject $o -MemberType NoteProperty -Name skip -Value $skip
    return $o
}

# ---------------------------
# Utility helpers
# ---------------------------
function Test-IsAdministrator {
    try {
        $id = [Security.Principal.WindowsIdentity]::GetCurrent()
        $p = New-Object Security.Principal.WindowsPrincipal($id)
        return $p.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
    } catch {
        return $false
    }
}

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

function Invoke-ReleaseVerification {
    param(
        [Parameter(Mandatory)][string]$InstallScriptPath,
        [string]$ReleaseManifestPath,
        [string]$PublisherKeyPath
    )

    $repoRoot = Split-Path -Parent (Split-Path -Parent $InstallScriptPath)
    $verifyScript = Join-Path $repoRoot "build\verify-release.ps1"

    if (-not (Test-Path -LiteralPath $verifyScript)) {
        throw "verify-release.ps1 not found: $verifyScript"
    }

    if ([string]::IsNullOrWhiteSpace($ReleaseManifestPath)) {
        $candidates = @()
        try {
            $parent = Split-Path -Parent $repoRoot
            if (Test-Path -LiteralPath $parent) {
                $candidates = @(Get-ChildItem -LiteralPath $parent -File -Filter "*.manifest.json" -ErrorAction SilentlyContinue)
            }
        } catch { }
        if ($candidates.Count -eq 1) {
            $ReleaseManifestPath = $candidates[0].FullName
        }
    }

    if ([string]::IsNullOrWhiteSpace($ReleaseManifestPath) -or -not (Test-Path -LiteralPath $ReleaseManifestPath)) {
        throw "Release manifest not found. Pass -ReleaseManifestPath."
    }

    $args = @(
        "-NoProfile",
        "-ExecutionPolicy", "Bypass",
        "-File", $verifyScript,
        "-ManifestPath", $ReleaseManifestPath,
        "-VerifySignature"
    )

    if (-not [string]::IsNullOrWhiteSpace($PublisherKeyPath)) {
        $args += @("-PublisherKeyPath", $PublisherKeyPath)
    }

    $psi = New-Object System.Diagnostics.ProcessStartInfo
    $psi.FileName = "powershell.exe"
    $psi.Arguments = ($args | ForEach-Object {
        if ($_ -match '\s') { '"' + $_ + '"' } else { $_ }
    }) -join ' '
    $psi.RedirectStandardOutput = $true
    $psi.RedirectStandardError = $true
    $psi.UseShellExecute = $false
    $psi.CreateNoWindow = $true

    $p = New-Object System.Diagnostics.Process
    $p.StartInfo = $psi
    [void]$p.Start()
    $stdout = $p.StandardOutput.ReadToEnd()
    $stderr = $p.StandardError.ReadToEnd()
    $p.WaitForExit()

    $o = New-Object PSObject
    Add-Member -InputObject $o -MemberType NoteProperty -Name exit_code -Value $p.ExitCode
    Add-Member -InputObject $o -MemberType NoteProperty -Name stdout -Value $stdout
    Add-Member -InputObject $o -MemberType NoteProperty -Name stderr -Value $stderr
    Add-Member -InputObject $o -MemberType NoteProperty -Name manifest_path -Value $ReleaseManifestPath
    return $o
}

# ---------------------------
# Main
# ---------------------------
$checks = New-Object System.Collections.ArrayList
$startedUtc = (Get-Date).ToUniversalTime().ToString("o")
$scriptPath = $MyInvocation.MyCommand.Path
$installDir = Split-Path -Parent $scriptPath
$repoRoot = Split-Path -Parent $installDir

# 1) PowerShell version
try {
    $maj = $PSVersionTable.PSVersion.Major
    $min = $PSVersionTable.PSVersion.Minor
    if (($maj -gt 5) -or ($maj -eq 5 -and $min -ge 1)) {
        Add-Check -List $checks -Check (New-CheckResult -Name "powershell_version" -Status "PASS" -Message "PowerShell version supported." -Data @{ version = $PSVersionTable.PSVersion.ToString() })
    } else {
        Add-Check -List $checks -Check (New-CheckResult -Name "powershell_version" -Status "FAIL" -Message "PowerShell 5.1+ required." -Data @{ version = $PSVersionTable.PSVersion.ToString() })
    }
}
catch {
    Add-Check -List $checks -Check (New-CheckResult -Name "powershell_version" -Status "FAIL" -Message ("Failed to detect PowerShell version: " + $_.Exception.Message))
}

# 2) Admin rights
try {
    if (Test-IsAdministrator) {
        Add-Check -List $checks -Check (New-CheckResult -Name "admin_rights" -Status "PASS" -Message "Administrator rights detected.")
    } else {
        Add-Check -List $checks -Check (New-CheckResult -Name "admin_rights" -Status "FAIL" -Message "Administrator rights required to install scheduled tasks and write ProgramData.")
    }
}
catch {
    Add-Check -List $checks -Check (New-CheckResult -Name "admin_rights" -Status "FAIL" -Message ("Failed admin check: " + $_.Exception.Message))
}

# 3) Execution policy (informational/warn)
try {
    $epList = Get-ExecutionPolicy -List
    $effective = Get-ExecutionPolicy
    $warn = $false
    if ([string]$effective -eq "Restricted") { $warn = $true }

    $rows = @()
    foreach ($r in $epList) {
        $rows += ("{0}={1}" -f $r.Scope, $r.ExecutionPolicy)
    }

    if ($warn) {
        Add-Check -List $checks -Check (New-CheckResult -Name "execution_policy" -Status "WARN" -Message "Effective execution policy is Restricted. install.ps1 may need -ExecutionPolicy Bypass." -Data @{ effective = [string]$effective; scopes = $rows })
    } else {
        Add-Check -List $checks -Check (New-CheckResult -Name "execution_policy" -Status "PASS" -Message "Execution policy should allow scripted install flow (or can use process-level bypass)." -Data @{ effective = [string]$effective; scopes = $rows })
    }
}
catch {
    Add-Check -List $checks -Check (New-CheckResult -Name "execution_policy" -Status "WARN" -Message ("Failed to read execution policy: " + $_.Exception.Message))
}

# 4) ScheduledTasks module / cmdlets
try {
    $getCmd = Get-Command Get-ScheduledTask -ErrorAction SilentlyContinue
    $regCmd = Get-Command Register-ScheduledTask -ErrorAction SilentlyContinue
    if ($getCmd -and $regCmd) {
        Add-Check -List $checks -Check (New-CheckResult -Name "scheduled_tasks_module" -Status "PASS" -Message "ScheduledTasks cmdlets available.")
    } else {
        Add-Check -List $checks -Check (New-CheckResult -Name "scheduled_tasks_module" -Status "FAIL" -Message "ScheduledTasks cmdlets not available (Get/Register-ScheduledTask).")
    }
}
catch {
    Add-Check -List $checks -Check (New-CheckResult -Name "scheduled_tasks_module" -Status "FAIL" -Message ("ScheduledTasks check failed: " + $_.Exception.Message))
}

# 5) ProgramData write access
try {
    if (-not (Test-Path -LiteralPath $BaseDir)) {
        New-Item -ItemType Directory -Path $BaseDir -Force | Out-Null
    }

    $probe = Join-Path $BaseDir ("preflight-write-test-" + [guid]::NewGuid().ToString("N") + ".tmp")
    [System.IO.File]::WriteAllText($probe, "ok", [System.Text.Encoding]::UTF8)
    Remove-Item -LiteralPath $probe -Force -ErrorAction SilentlyContinue

    Add-Check -List $checks -Check (New-CheckResult -Name "programdata_write_access" -Status "PASS" -Message "Write access to BaseDir confirmed." -Data @{ base_dir = $BaseDir })
}
catch {
    Add-Check -List $checks -Check (New-CheckResult -Name "programdata_write_access" -Status "FAIL" -Message ("Cannot write to BaseDir: " + $_.Exception.Message) -Data @{ base_dir = $BaseDir })
}

# 6) Required repository/install files
try {
    $requiredFiles = @(
        (Join-Path $installDir "install.ps1"),
        (Join-Path $installDir "test-run.ps1"),
        (Join-Path $repoRoot "agent\tools\diagnostics.ps1"),
        (Join-Path $repoRoot "agent\tools\resend-outbox.ps1"),
        (Join-Path $repoRoot "agent\tools\cleanup-archive.ps1")
    )

    $missing = @()
    foreach ($f in $requiredFiles) {
        if (-not (Test-Path -LiteralPath $f)) { $missing += $f }
    }

    if ($missing.Count -eq 0) {
        Add-Check -List $checks -Check (New-CheckResult -Name "required_files" -Status "PASS" -Message "Required install and tool files present.")
    } else {
        Add-Check -List $checks -Check (New-CheckResult -Name "required_files" -Status "FAIL" -Message "Missing required files." -Data @{ missing = $missing })
    }
}
catch {
    Add-Check -List $checks -Check (New-CheckResult -Name "required_files" -Status "FAIL" -Message ("Required file check failed: " + $_.Exception.Message))
}

# 7) Config file presence / parse / basic validation
try {
    $cfg = Read-JsonFileSafe -Path $ConfigPath
    if ($null -eq $cfg) {
        Add-Check -List $checks -Check (New-CheckResult -Name "config_json" -Status "WARN" -Message "Runtime config not found or invalid JSON. Install may still proceed if install.ps1 generates runtime config or template is used." -Data @{ config_path = $ConfigPath })
    } else {
        $issues = @()
        try { if (-not $cfg.client_org_id) { $issues += "client_org_id missing/blank" } } catch { $issues += "client_org_id missing/blank" }
        try { if ($cfg.upload -and $cfg.upload.enabled -and -not $cfg.upload.endpoint_url) { $issues += "upload.enabled=true but upload.endpoint_url missing" } } catch { }

        if ($issues.Count -eq 0) {
            Add-Check -List $checks -Check (New-CheckResult -Name "config_json" -Status "PASS" -Message "Runtime config JSON loaded and basic checks passed." -Data @{ config_path = $ConfigPath })
        } else {
            Add-Check -List $checks -Check (New-CheckResult -Name "config_json" -Status "WARN" -Message "Runtime config JSON loaded, but there are warnings." -Data @{ config_path = $ConfigPath; warnings = $issues })
        }
    }
}
catch {
    Add-Check -List $checks -Check (New-CheckResult -Name "config_json" -Status "WARN" -Message ("Config check failed: " + $_.Exception.Message) -Data @{ config_path = $ConfigPath })
}

# 8) Optional config-validator module invocation (if present)
try {
    $validatorModule = Join-Path $repoRoot "agent\modules\core\config-validator.psm1"
    if (-not (Test-Path -LiteralPath $validatorModule)) {
        $validatorModule = Join-Path $repoRoot "agent\modules\config\config-validator.psm1"
    }
    if (Test-Path -LiteralPath $validatorModule) {
        try {
            Import-Module $validatorModule -Force -ErrorAction Stop

            $validatorFn = $null
            foreach ($name in @("Test-SummitConfig", "Test-SummitAgentConfig", "Invoke-SummitConfigValidation", "Assert-SummitConfigOrThrow")) {
                $cmd = Get-Command $name -ErrorAction SilentlyContinue
                if ($cmd) { $validatorFn = $name; break }
            }

            if ($null -eq $validatorFn) {
                Add-Check -List $checks -Check (New-CheckResult -Name "config_validator_module" -Status "WARN" -Message "Validator module found, but no known validation function detected.")
            } else {
                $cfg = Read-JsonFileSafe -Path $ConfigPath
                if ($null -eq $cfg) {
                    Add-Check -List $checks -Check (New-CheckResult -Name "config_validator_module" -Status "SKIP" -Message "Validator available, but runtime config not present/invalid JSON.")
                } else {
                    $ok = $false
                    $invokeErr = $null
                    try {
                        & $validatorFn -Config $cfg | Out-Null
                        $ok = $true
                    } catch {
                        $invokeErr = $_.Exception.Message
                    }

                    if ($ok) {
                        Add-Check -List $checks -Check (New-CheckResult -Name "config_validator_module" -Status "PASS" -Message ("Validator module invoked successfully: " + $validatorFn))
                    } else {
                        Add-Check -List $checks -Check (New-CheckResult -Name "config_validator_module" -Status "WARN" -Message ("Validator module present but invocation signature may differ. Function=" + $validatorFn + "; error=" + $invokeErr))
                    }
                }
            }
        }
        catch {
            Add-Check -List $checks -Check (New-CheckResult -Name "config_validator_module" -Status "WARN" -Message ("Failed to import/inspect validator module: " + $_.Exception.Message))
        }
    } else {
        Add-Check -List $checks -Check (New-CheckResult -Name "config_validator_module" -Status "SKIP" -Message "Config validator module not found (optional).")
    }
}
catch {
    Add-Check -List $checks -Check (New-CheckResult -Name "config_validator_module" -Status "WARN" -Message ("Unexpected validator check error: " + $_.Exception.Message))
}

# 9) Optional release verification (manifest + zip + signature)
if ($VerifyReleaseManifest) {
    try {
        $r = Invoke-ReleaseVerification -InstallScriptPath $scriptPath -ReleaseManifestPath $ReleaseManifestPath -PublisherKeyPath $PublisherKeyPath
        if ([int]$r.exit_code -eq 0) {
            Add-Check -List $checks -Check (New-CheckResult -Name "release_verification" -Status "PASS" -Message "Release manifest and ZIP verification passed." -Data @{ manifest_path = $r.manifest_path })
        } else {
            Add-Check -List $checks -Check (New-CheckResult -Name "release_verification" -Status "FAIL" -Message "Release verification failed." -Data @{ exit_code = $r.exit_code; manifest_path = $r.manifest_path; stdout = $r.stdout; stderr = $r.stderr })
        }
    }
    catch {
        Add-Check -List $checks -Check (New-CheckResult -Name "release_verification" -Status "FAIL" -Message ("Release verification error: " + $_.Exception.Message))
    }
}
else {
    Add-Check -List $checks -Check (New-CheckResult -Name "release_verification" -Status "SKIP" -Message "Release verification skipped. Use -VerifyReleaseManifest to enable.")
}

# Build final report
$summary = Get-PreflightSummary -Checks $checks

$report = New-Object PSObject
Add-Member -InputObject $report -MemberType NoteProperty -Name generated_at_utc -Value $startedUtc
Add-Member -InputObject $report -MemberType NoteProperty -Name host -Value $env:COMPUTERNAME
Add-Member -InputObject $report -MemberType NoteProperty -Name base_dir -Value $BaseDir
Add-Member -InputObject $report -MemberType NoteProperty -Name config_path -Value $ConfigPath
Add-Member -InputObject $report -MemberType NoteProperty -Name install_script -Value $scriptPath
Add-Member -InputObject $report -MemberType NoteProperty -Name summary -Value $summary
Add-Member -InputObject $report -MemberType NoteProperty -Name checks -Value @($checks)

if ($AsJson) {
    $report | ConvertTo-Json -Depth 8
} else {
    Write-Host "Summit Local Agent - Install Preflight"
    Write-Host ("Generated (UTC): {0}" -f $report.generated_at_utc)
    Write-Host ("Host: {0}" -f $report.host)
    Write-Host ("BaseDir: {0}" -f $report.base_dir)
    Write-Host ("ConfigPath: {0}" -f $report.config_path)
    Write-Host ""

    foreach ($c in @($report.checks)) {
        Write-Host ("[{0}] {1} - {2}" -f $c.status, $c.name, $c.message)
        if ($c.data) {
            try {
                foreach ($p in $c.data.GetEnumerator()) {
                    $val = $p.Value
                    if ($val -is [array]) { $val = $val -join "; " }
                    Write-Host ("    {0}: {1}" -f $p.Key, $val)
                }
            } catch { }
        }
    }

    Write-Host ""
    Write-Host ("Summary: PASS={0} WARN={1} FAIL={2} SKIP={3}" -f `
        $report.summary.pass, $report.summary.warn, $report.summary.fail, $report.summary.skip)
}

# Exit code policy
if ([int]$summary.fail -gt 0) { exit 2 }
if ($FailOnWarn -and [int]$summary.warn -gt 0) { exit 3 }
exit 0
