# Проверка ключа OpenAI напрямую (без backend).
# Читает ключ из .env в корне проекта и дергает api.openai.com.
# Запуск из корня: .\docs\test-openai-key.ps1

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent (Split-Path -Parent $PSCommandPath)
$envPath = Join-Path $root ".env"

if (-not (Test-Path $envPath)) {
    Write-Host "Файл .env не найден в корне проекта." -ForegroundColor Red
    exit 1
}

$key = $null
Get-Content $envPath -Encoding UTF8 | ForEach-Object {
    if ($_ -match "^\s*OPENAI_API_KEY\s*=\s*(.+)$") {
        $key = $Matches[1].Trim().Trim('"').Trim("'")
    }
}

if (-not $key -or $key.Length -lt 20) {
    Write-Host "В .env не найден OPENAI_API_KEY или он пустой." -ForegroundColor Red
    exit 1
}

Write-Host "Длина ключа из .env: $($key.Length)" -ForegroundColor Cyan
Write-Host "Запрос к api.openai.com ..." -ForegroundColor Cyan

try {
    $resp = Invoke-WebRequest -Uri "https://api.openai.com/v1/models" `
        -Method Get `
        -Headers @{ Authorization = "Bearer $key" } `
        -UseBasicParsing
    Write-Host "OK: OpenAI принял ключ (статус $($resp.StatusCode))." -ForegroundColor Green
} catch {
    $status = $_.Exception.Response.StatusCode.value__
    if ($status -eq 401) {
        Write-Host "Ошибка 401: OpenAI отклонил ключ (неверный или отозван). Создай новый ключ на platform.openai.com/api-keys и запусти .\docs\set-openai-key.ps1" -ForegroundColor Red
    } else {
        Write-Host "Ошибка: $status — $($_.Exception.Message)" -ForegroundColor Red
    }
    exit 1
}
