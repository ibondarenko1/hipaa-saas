# Проверка конфига Claude Analyst (evidence). Запуск из корня: .\docs\check-claude.ps1

$baseUrl = "http://localhost:8000/api/v1"

$loginBody = @{ email = "admin@summitrange.com"; password = "Admin1234!" } | ConvertTo-Json
$loginResp = Invoke-RestMethod -Uri "$baseUrl/auth/login" -Method Post -ContentType "application/json" -Body $loginBody
$token = $loginResp.access_token
if (-not $token) { Write-Host "Ошибка: не получен token. Backend запущен?" -ForegroundColor Red; exit 1 }

$headers = @{ Authorization = "Bearer $token" }
$check = Invoke-RestMethod -Uri "$baseUrl/claude/check" -Method Get -Headers $headers

Write-Host "`n--- Claude Analyst ---" -ForegroundColor Cyan
Write-Host "claude_analyst_enabled: $($check.claude_analyst_enabled)"
Write-Host "anthropic_key_set:      $($check.anthropic_key_set)"
Write-Host "key_length:             $($check.key_length)"
if (-not $check.anthropic_key_set) {
    Write-Host "`nДобавь в .env: ANTHROPIC_API_KEY=sk-ant-... и CLAUDE_ANALYST_ENABLED=true" -ForegroundColor Yellow
} elseif (-not $check.claude_analyst_enabled) {
    Write-Host "`nДобавь в .env: CLAUDE_ANALYST_ENABLED=true" -ForegroundColor Yellow
} else {
    Write-Host "`nClaude настроен. Для анализа: сначала POST /evidence/{id}/extract, потом POST /evidence/{id}/analyze." -ForegroundColor Green
}
