# Проверка, какой ключ OpenAI видит backend (без вывода самого ключа).
# Запуск: из корня репозитория, backend должен быть поднят (docker compose up -d backend).

$baseUrl = "http://localhost:8000/api/v1"

# 1) Логин (подставь свой email и пароль, если не admin)
$loginBody = @{
    email    = "admin@summitrange.com"
    password = "Admin1234!"
} | ConvertTo-Json

$loginResp = Invoke-RestMethod `
    -Uri "$baseUrl/auth/login" `
    -Method Post `
    -ContentType "application/json" `
    -Body $loginBody

$token = $loginResp.access_token
if (-not $token) {
    Write-Host "Ошибка: не получен token. Проверь логин/пароль и что backend запущен." -ForegroundColor Red
    exit 1
}

# 2) Проверка конфига ассистента
$headers = @{
    Authorization = "Bearer $token"
}
$check = Invoke-RestMethod `
    -Uri "$baseUrl/assistant/check" `
    -Method Get `
    -Headers $headers

Write-Host "`n--- Что видит backend ---" -ForegroundColor Cyan
Write-Host "concierge_enabled: $($check.concierge_enabled)"
Write-Host "key_length:        $($check.key_length)"
Write-Host "key_prefix:        $($check.key_prefix)"
if ($check.key_head) { Write-Host "key_head:         $($check.key_head)..." }
if ($check.key_tail) { Write-Host "key_tail:         ...$($check.key_tail)" }
Write-Host ""

if ($check.key_length -eq 0) {
    Write-Host "Ключ не загружен. Проверь .env в корне проекта и перезапуск: docker compose up -d backend" -ForegroundColor Yellow
} elseif ($check.key_prefix -ne "sk-proj-" -and $check.key_prefix -ne "sk-") {
    Write-Host "Ключ не похож на OpenAI (ожидается sk-proj-...). Проверь формат в .env" -ForegroundColor Yellow
} else {
    Write-Host "Ключ загружен (длина $($check.key_length), префикс $($check.key_prefix))." -ForegroundColor Green
}

# Проверка: дергаем OpenAI тем же ключом, что и backend
$test = Invoke-RestMethod -Uri "$baseUrl/assistant/test-key" -Method Get -Headers $headers
Write-Host "`n--- Тест ключа через backend ---" -ForegroundColor Cyan
if ($test.ok) {
    Write-Host "OpenAI принял ключ (backend вызывает API успешно)." -ForegroundColor Green
} else {
    Write-Host "OpenAI отклонил ключ: $($test.error)" -ForegroundColor Red
}
