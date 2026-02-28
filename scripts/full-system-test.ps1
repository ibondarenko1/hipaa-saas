<#
.SYNOPSIS
    Runs a full system test of the HIPAA platform: health check, login, submit assessment,
    run engine, create/generate/publish report package. Use after "docker compose up".
.DESCRIPTION
    Expects backend at http://localhost:8000. Uses demo tenant "Valley Creek Family Practice"
    and admin login from seed. After the script succeeds, verify in the UI as client user.
.EXAMPLE
    .\scripts\full-system-test.ps1
.EXAMPLE
    .\scripts\full-system-test.ps1 -BaseUrl "http://127.0.0.1:8000"
#>
param(
    [string]$BaseUrl = "http://localhost:8000",
    [switch]$SkipPublish,
    [switch]$IncludeAiSummary
)

$ErrorActionPreference = "Stop"
$api = "$BaseUrl/api/v1"

function Invoke-Api {
    param(
        [string]$Method,
        [string]$Path,
        [hashtable]$Headers = @{},
        [object]$Body = $null
    )
    $uri = "$api$Path"
    $params = @{
        Method          = $Method
        Uri             = $uri
        ContentType     = "application/json"
        Headers         = $Headers
        UseBasicParsing = $true
    }
    if ($Body -ne $null) {
        $params.Body = if ($Body -is [string]) { $Body } else { $Body | ConvertTo-Json -Compress }
    }
    $response = Invoke-WebRequest @params
    if ($response.Content) {
        return $response.Content | ConvertFrom-Json
    }
    return $null
}

function Write-Step { param([string]$Msg) Write-Host "`n--- $Msg ---" -ForegroundColor Cyan }
function Write-Ok   { param([string]$Msg) Write-Host "  OK: $Msg" -ForegroundColor Green }
function Write-Warn { param([string]$Msg) Write-Host "  WARN: $Msg" -ForegroundColor Yellow }
function Write-Err  { param([string]$Msg) Write-Host "  ERROR: $Msg" -ForegroundColor Red }

# ── 1. Health ─────────────────────────────────────────────────────────────────
Write-Step "1. Backend health"
try {
    $health = Invoke-RestMethod -Uri "$BaseUrl/health" -Method Get -UseBasicParsing
    if ($health.status -ne "ok") { throw "Health returned status: $($health.status)" }
    Write-Ok "Backend version: $($health.version)"
} catch {
    Write-Err "Backend not reachable at $BaseUrl. Is 'docker compose up' running?"
    exit 1
}

# ── 2. Login ──────────────────────────────────────────────────────────────────
Write-Step "2. Login (admin)"
$loginBody = @{ email = "admin@summitrange.com"; password = "Admin1234!" }
try {
    $loginResp = Invoke-Api -Method Post -Path "/auth/login" -Body $loginBody
} catch {
    Write-Err "Login failed. Check seed and reset_admin_password ran. $($_.Exception.Message)"
    exit 1
}
$token = $loginResp.access_token
if (-not $token) {
    Write-Err "No access_token in login response"
    exit 1
}
Write-Ok "Logged in as $($loginResp.user.email)"
$authHeaders = @{ Authorization = "Bearer $token" }

# ── 3. Get demo tenant and assessment ─────────────────────────────────────────
Write-Step "3. Find demo tenant and assessment"
$tenants = Invoke-Api -Method Get -Path "/tenants" -Headers $authHeaders
$tenant = $tenants | Where-Object { $_.name -like "*Valley Creek*" } | Select-Object -First 1
if (-not $tenant) {
    Write-Err "Demo tenant 'Valley Creek Family Practice' not found. Run seed (backend startup does it)."
    exit 1
}
$tenantId = $tenant.id
Write-Ok "Tenant: $($tenant.name) (id: $tenantId)"

$assessments = Invoke-Api -Method Get -Path "/tenants/$tenantId/assessments" -Headers $authHeaders
if (-not $assessments -or $assessments.Count -eq 0) {
    Write-Err "No assessments for tenant. Seed should create one."
    exit 1
}
$assessment = $assessments[0]
$assessmentId = $assessment.id
Write-Ok "Assessment: $assessmentId (status: $($assessment.status))"

# ── 4. Submit (if in_progress) ─────────────────────────────────────────────────
Write-Step "4. Submit assessment (Gate 1)"
if ($assessment.status -eq "in_progress") {
    try {
        $submitResp = Invoke-Api -Method Post -Path "/tenants/$tenantId/assessments/$assessmentId/submit" -Headers $authHeaders -Body "{}"
        Write-Ok "Submitted. Status: $($submitResp.status)"
    } catch {
        Write-Err "Submit failed (e.g. Gate 1 not met). $($_.Exception.Message)"
        if ($_.ErrorDetails.Message) { Write-Host $_.ErrorDetails.Message }
        exit 1
    }
} elseif ($assessment.status -eq "submitted") {
    Write-Ok "Already submitted"
} else {
    Write-Warn "Assessment status is '$($assessment.status)'. Submit only for in_progress."
}

# ── 5. Run engine ───────────────────────────────────────────────────────────
Write-Step "5. Run compliance engine"
try {
    $engineResp = Invoke-Api -Method Post -Path "/tenants/$tenantId/assessments/$assessmentId/engine/run" -Headers $authHeaders -Body "{}"
    Write-Ok "Engine run completed. Controls: $($engineResp.controls_processed), Gaps: $($engineResp.gaps_created)"
} catch {
    Write-Err "Engine run failed. $($_.Exception.Message)"
    exit 1
}

# ── 6. Create report package ─────────────────────────────────────────────────
Write-Step "6. Create report package"
$createBody = @{ notes = "Full system test"; idempotency_key = $null }
try {
    $pkgResp = Invoke-Api -Method Post -Path "/tenants/$tenantId/assessments/$assessmentId/reports/packages" -Headers $authHeaders -Body $createBody
} catch {
    Write-Err "Create package failed. $($_.Exception.Message)"
    exit 1
}
$packageId = $pkgResp.id
Write-Ok "Package id: $packageId"

# ── 7. Generate files ─────────────────────────────────────────────────────────
Write-Step "7. Generate report files"
$genBody = @{
    include_ai_summary = [bool]$IncludeAiSummary
    ai_tone           = "neutral"
    formats           = @("PDF", "XLSX")
}
try {
    $genResp = Invoke-Api -Method Post -Path "/tenants/$tenantId/reports/packages/$packageId/generate" -Headers $authHeaders -Body $genBody
    Write-Ok "Generated: $($genResp.generated_types -join ', ')"
} catch {
    Write-Err "Generate failed. $($_.Exception.Message)"
    if ($_.ErrorDetails.Message) { Write-Host $_.ErrorDetails.Message }
    exit 1
}

# ── 8. Publish ──────────────────────────────────────────────────────────────
if (-not $SkipPublish) {
    Write-Step "8. Publish package"
    $pubBody = @{ publish_note = "Full system test run" }
    try {
        $pubResp = Invoke-Api -Method Post -Path "/tenants/$tenantId/reports/packages/$packageId/publish" -Headers $authHeaders -Body $pubBody
        Write-Ok "Published. Status: $($pubResp.status)"
    } catch {
        Write-Err "Publish failed. $($_.Exception.Message)"
        exit 1
    }
} else {
    Write-Step "8. Publish (skipped)"
    Write-Warn "Package left in 'generated'. Run without -SkipPublish to publish."
}

$pkgStatus = if ($SkipPublish) { "generated" } else { "published" }
# ── Summary ──────────────────────────────────────────────────────────────────
Write-Host ""
Write-Host "========== Full system test (API) completed ==========" -ForegroundColor Green
Write-Host "  Tenant:     $($tenant.name)"
Write-Host "  Assessment: $assessmentId"
Write-Host "  Package:    $packageId (status: $pkgStatus)" -ForegroundColor $(if ($SkipPublish) { "Yellow" } else { "Green" })
Write-Host ""
Write-Host "Next steps (manual):" -ForegroundColor Cyan
Write-Host "  1. Open http://localhost:5173"
Write-Host "  2. Log in as client: client@valleycreek.example.com / Client2024!"
Write-Host "  3. Go to Reports and confirm the published package is visible."
Write-Host "  4. Download Executive Summary or another file and open it."
Write-Host ""
