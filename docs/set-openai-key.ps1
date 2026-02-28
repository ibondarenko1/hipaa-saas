# Привязка ключа OpenAI к backend.
# Запуск из корня проекта (где docker-compose.yml): .\docs\set-openai-key.ps1
# Ключ: в openai-key.txt в корне ИЛИ в переменной $KeyInScript ниже.

$ErrorActionPreference = "Stop"
# Корень = текущая папка; если тут нет docker-compose.yml — берём папку над docs
$cwd = (Get-Location).Path
$root = if (Test-Path (Join-Path $cwd "docker-compose.yml")) { $cwd } else { Split-Path -Parent (Split-Path -Parent $PSCommandPath) }
$envFile = Join-Path $root ".env"

# Вставь ключ в кавычки ниже и запусти скрипт. Перед коммитом в git очисти: $KeyInScript = ""
$KeyInScript = ""

if ($KeyInScript) {
    $key = ($KeyInScript -replace "`r", "" -replace "`n", " ").Trim()
    $key = ($key -split "[\r\n]")[0].Trim()
} else {
    $keyFile = Join-Path $root "openai-key.txt"
    if (-not (Test-Path $keyFile)) {
        Write-Host "Файл не найден: $keyFile" -ForegroundColor Red
        Write-Host "Создай openai-key.txt в корне проекта (где docker-compose.yml), вставь туда одну строку с ключом sk-proj-..., сохрани. Либо в этом скрипте задай `$KeyInScript = ""твой_ключ""." -ForegroundColor Yellow
        exit 1
    }
    $key = $null
    Get-Content $keyFile -Encoding UTF8 | ForEach-Object {
        $line = $_.Trim()
        if ($line -and ($line.StartsWith("sk-proj-") -or $line.StartsWith("sk-")) -and $null -eq $key) { $key = $line }
    }
    if (-not $key) { $key = "" }
}
if ($key.Length -gt 256) { $key = $key.Substring(0, 256) }

if (-not $key -or $key.Length -lt 20) {
    Write-Host "В openai-key.txt должен быть ключ OpenAI (одна строка, sk-proj-...). Сейчас длина: $($key.Length)" -ForegroundColor Red
    exit 1
}
if (-not $key.StartsWith("sk-proj-") -and -not $key.StartsWith("sk-")) {
    Write-Host "В openai-key.txt должен быть именно ключ (начинается с sk-proj-...). Открой файл, вставь ключ, сохрани и запусти скрипт снова." -ForegroundColor Red
    exit 1
}

# Собираем .env: обновляем OPENAI_API_KEY и CHATGPT_CONCIERGE_ENABLED, остальные строки оставляем
$lines = @()
if (Test-Path $envFile) {
    $content = Get-Content $envFile -Encoding UTF8
    foreach ($line in $content) {
        if ($line -match "^\s*OPENAI_API_KEY\s*=") { continue }
        if ($line -match "^\s*CHATGPT_CONCIERGE_ENABLED\s*=") { continue }
        if ($line -match "^\s*CLAUDE_ANALYST_ENABLED\s*=") { continue }
        $lines += $line
    }
}
$lines += "OPENAI_API_KEY=$key"
$lines += "CHATGPT_CONCIERGE_ENABLED=true"
$lines += "CLAUDE_ANALYST_ENABLED=true"

$utf8NoBom = New-Object System.Text.UTF8Encoding $false
[System.IO.File]::WriteAllLines($envFile, $lines, $utf8NoBom)

Write-Host "Ключ записан в .env (длина ключа: $($key.Length))." -ForegroundColor Green
Write-Host "Пересоздай backend: docker compose up -d --force-recreate backend" -ForegroundColor Cyan
Write-Host "Для Claude (анализ доказательств): см. docs/CLAUDE-SETUP.md" -ForegroundColor Gray
