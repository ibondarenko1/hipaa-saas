# Quick smoke test after install: run diagnostics in summary mode.
$repoRoot = Split-Path -Parent $PSScriptRoot
$diag = Join-Path $repoRoot "agent\tools\diagnostics.ps1"
if (Test-Path -LiteralPath $diag) {
    & $diag -SummaryOnly
} else {
    Write-Warning "diagnostics.ps1 not found. Run install first."
}
