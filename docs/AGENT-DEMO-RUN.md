# Запуск демо агента (тестовый клиент + анонимизация)

Демо симулирует сбор данных с машины, анонимизацию и отправку пакета в Ingest от имени тестового клиента (Valley Creek).

## Предусловия

- Docker: запущены сервисы **postgres** и **ingest**.
- В БД применены миграции и есть тестовый тенант (например, через seed).

## 1. Запуск Ingest и Postgres

```powershell
docker compose up -d postgres ingest
```

Проверка: Ingest должен отвечать на хосте по порту 8080:

```powershell
# PowerShell
Invoke-WebRequest -Uri "http://localhost:8080/health" -UseBasicParsing | Select-Object StatusCode, Content
# или curl
curl -s http://localhost:8080/health
```

Если запрос не доходит (connection refused / UPLOAD_ERROR в демо) — проверьте, что порт 8080 не занят и что контейнер `hipaa_ingest` запущен: `docker compose ps`.

## 2. Запуск демо

Из корня репозитория:

```powershell
.\run-agent-demo.ps1
```

Скрипт:

- создаёт конфиг в `.agent-demo/` (client_org_id=valley-creek-demo, endpoint=http://localhost:8080);
- выставляет тенанту Valley Creek `client_org_id = valley-creek-demo`;
- создаёт тестовый пакет (manifest + anonymized_snapshot) и кладёт его в outbox;
- вызывает resend-outbox и отправляет пакет в Ingest.

## 3. Проверка анонимизации

- В пакете нет реального hostname/IP: в `anonymized_snapshot.json` — `hostname: "REDACTED"`, `ip_removed: true`, только обобщённые данные (например, device_count_range, os_family).
- Успешно принятые пакеты: в логе будет строка вида `Accepted: file=...; receipt_id=...`.
- Квитанции Ingest:

```powershell
curl -s -H "X-API-Key: demo-ingest-key" "http://localhost:8080/api/v1/ingest/receipts?client_org_id=valley-creek-demo&limit=5"
```

- Архив принятых пакетов: `.agent-demo/archive/accepted/` (по месяцам). В ZIP — `manifest.json` и `anonymized_snapshot.json` с уже анонимизированным содержимым.

## 4. Если все пакеты в статусе UPLOAD_ERROR

- Убедитесь, что Ingest доступен: `curl http://localhost:8080/health`.
- Проверьте логи контейнера: `docker compose logs ingest`.
- В очереди/квитанции в `.agent-demo/outbox` или `.agent-demo/archive/rejected/` в `*.queue.json` / `*.receipt.json` поле `last_error_message` покажет причину (например, connection refused).

## 5. Повторный запуск

При повторном запуске `run-agent-demo.ps1` создаётся новый пакет с новым idempotency key; старые пакеты из outbox уже обработаны (перемещены в архив). Чтобы отправить ещё один тестовый пакет, достаточно снова выполнить `.\run-agent-demo.ps1`.
