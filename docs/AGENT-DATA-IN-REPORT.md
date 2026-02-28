# Agent Data in Report

Данные с локального агента теперь **сохраняются при приёме пакета** и **включаются в отчёт** (Executive Summary). Агент перестаёт делать «пустую работу»: его payload анализируется и попадает в итоговый нарратив.

---

## Что сделано

### 1. Ingest сохраняет payload

- **Таблица `ingest_receipts`**: добавлены колонки `manifest_payload` (JSONB) и `snapshot_data` (JSONB).
- **Node Ingest**: при приёме ZIP после проверки manifest сохраняет:
  - `manifest_payload` — содержимое `manifest.json` (client_org_id, compliance, и т.д.);
  - `snapshot_data` — содержимое файла `snapshot.json` из ZIP (если есть).
- **Backend**: модель `IngestReceipt` и миграция 012 те же поля поддерживают (общая БД с ingest).

### 2. Контекст отчёта

- **report_context_builder**: по `tenant.client_org_id` выбирается последний принятый receipt (ACCEPTED) с непустым `manifest_payload` или `snapshot_data` и кладётся в контекст как `agent_snapshot`.

### 3. Executive Summary

- При генерации отчёта с **LLM** (Claude) в промпт добавляется блок **DATA FROM LOCAL AGENT** (receipt_id, дата приёма, manifest, snapshot).
- В инструкции по разделам добавлен **Agent-Reported Data**: модель должна кратко описать, что прислал агент и как это соотносится с анкетой и доказательствами.
- Если для тенанта нет данных агента (`agent_snapshot` пустой), блок и раздел не добавляются.

---

## Что должен отправлять агент

Чтобы данные попали в отчёт:

1. **manifest.json** — как и раньше (обязателен). Он всегда сохраняется в `manifest_payload`, так что в отчёте будет хотя бы он.

2. **snapshot.json** (опционально) — положите в корень ZIP JSON с агрегированными/санитизированными данными для отчёта, например:
   - сводки по логам (без PHI),
   - метрики доступности/ошибок,
   - факт прохождения проверок на стороне клиники,
   - версии компонентов и т.п.

Пример структуры `snapshot.json` (на усмотрение сборки пакета):

```json
{
  "collected_at_utc": "2026-02-27T12:00:00Z",
  "summary": "Sanitized log and config checks completed.",
  "checks_passed": 5,
  "checks_failed": 0,
  "artifacts_count": 3
}
```

Формат не фиксирован: любой JSON будет сохранён и передан в отчёт как контекст для Claude.

---

## Условия появления в отчёте

- У **тенанта** в SaaS должен быть задан **client_org_id** (тот же, что агент шлёт в `X-Summit-Client-Org-Id`).
- Должен быть хотя бы один **принятый** пакет (status ACCEPTED) с непустым `manifest_payload` или `snapshot_data`.
- В отчёте используется **последний** такой receipt (по `received_at_utc`).
- Раздел «Agent-Reported Data» в Executive Summary появляется только при включённом **LLM** (Claude) и наличии `agent_snapshot` в контексте.

---

## Миграции

- **Backend**: `alembic upgrade head` — миграция 012 добавляет колонки в `ingest_receipts`.
- **Ingest (Node)**: при старте выполняется `node dist/db.js migrate`; миграция `002_add_receipt_payload.sql` добавляет те же колонки (IF NOT EXISTS), если развёртывание идёт без backend.

После применения миграций перезапустите backend и ingest при необходимости.
