# Вопросы 1–3: Snapshot, миграция 008, Generate Report

## Вопрос 1 — структура anonymized_snapshot

### Полный список полей в текущем демо (create-test-package.ps1)

Демо-пакет создаётся скриптом `agent/tools/create-test-package.ps1`. Структура **anonymized_snapshot.json**:

| Поле | Тип | Описание |
|------|-----|----------|
| `collected_at_utc` | string (ISO 8601) | Время сбора |
| `source` | string | `"summit-local-agent-test"` |
| `anonymization` | object | |
| `anonymization.applied` | boolean | `true` |
| `anonymization.hostname` | string | `"REDACTED"` |
| `anonymization.ip_removed` | boolean | `true` |
| `summary` | object | |
| `summary.device_count_range` | string | например `"1-5"` |
| `summary.os_family` | string | например `"Windows"` |
| `summary.report_type` | string | `"readiness_snapshot"` |

### Пример реального anonymized_snapshot.json (тестовый из демо)

```json
{
  "collected_at_utc": "2026-02-27T12:00:00.0000000Z",
  "source": "summit-local-agent-test",
  "anonymization": {
    "applied": true,
    "hostname": "REDACTED",
    "ip_removed": true
  },
  "summary": {
    "device_count_range": "1-5",
    "os_family": "Windows",
    "report_type": "readiness_snapshot"
  }
}
```

### Маппинг на HIPAA — чего сейчас нет

В демо **нет** полей для маппинга на указанные контролы:

| Нужно для маппинга | HIPAA контроль | В snapshot сейчас |
|--------------------|----------------|-------------------|
| Данные о backup статусе | HIPAA-RC-01 (Recovery) | **Нет** |
| Данные об антивирусе/EDR | HIPAA-PR-07 (Malware) | **Нет** |
| Данные о patch level | HIPAA-PR-12 (Updates) | **Нет** |
| Данные о user accounts/access | HIPAA-PR-16 (Access) | **Нет** |

Сейчас в snapshot только: обобщённые метаданные (hostname redacted, ip_removed), `device_count_range`, `os_family`, `report_type`. Для маппинга на контролы нужно расширить контракт snapshot (и агент), добавив, например, секции: `backup_status`, `antivirus_edr`, `patch_level`, `user_accounts` (или эквиваленты по согласованной схеме).

---

## Вопрос 2 — миграция 008

Таблицы из миграции **008_ai_evidence_module** уже в БД:

- `evidence_extractions`
- `evidence_assessment_results`
- `control_evidence_aggregates`
- `client_tasks`
- `assistant_message_logs`

Цепочка миграций: `007_tenant_client_org_id` → `008_ai_evidence_module` → `009_control_expectation_specs` → `010_client_notes`. При выполнении `alembic upgrade head` применяются все до 010 включительно, значит 008 уже применена.

Итог: модели и таблицы есть и в коде, и в БД.

---

## Вопрос 3 — кнопка Generate Report

### Цепочка вызова

1. **Frontend:** `frontend/src/pages/internal/EngineResults.tsx` — кнопка "Generate Report" вызывает `reportsApi.generate(tenantId, packageId, { include_ai_summary, ai_tone })`.
2. **API:** `POST /api/v1/tenants/{tenant_id}/reports/packages/{package_id}/generate`  
   Обработчик: `backend/app/api/routes/reports.py` — функция **`generate_report_package`**.
3. **Сервис:** из роута вызывается **`generate_all_reports`** из `backend/app/services/report_generator.py`.

### Сигнатура и входные данные

**Роут** `generate_report_package`:

- Параметры: `tenant_id`, `package_id`, body: **`GenerateReportPackageRequest`**.
- Body (схема): `formats: list[str]`, `include_ai_summary: bool = True`, `ai_tone: Optional[str] = "neutral"`, `idempotency_key: Optional[str]`.
- Внутри: загружает `ReportPackage`, `Assessment`, `Tenant`; затем вызывает:

```python
report_bytes = await generate_all_reports(
    assessment=assessment,
    tenant=tenant,
    db=db,
    include_ai=body.include_ai_summary,
    ai_tone=body.ai_tone or "neutral",
)
```

**Функция** `generate_all_reports` в `backend/app/services/report_generator.py`:

```python
async def generate_all_reports(
    assessment: Assessment,
    tenant: Tenant,
    db: AsyncSession,
    include_ai: bool = True,
    ai_tone: str = "neutral",
) -> dict[str, bytes]:
    """
    Generate all 5 required report artifacts.
    Returns dict: {file_type: bytes}
    """
```

Возвращает словарь: `executive_summary` (PDF), `gap_register`, `risk_register`, `roadmap`, `evidence_checklist` (XLSX) — каждый значение это `bytes`.

**Функция** `generate_ai_narrative` в том же файле:

```python
async def generate_ai_narrative(
    tenant: Tenant,
    assessment: Assessment,
    stats: dict,
    top_gaps: list,
    ai_tone: str = "neutral",
) -> str:
    """
    Calls Anthropic Claude API for executive summary narrative.
    Falls back to template if LLM not configured.
    """
```

- Вход: `tenant`, `assessment`, `stats` (total, pass, fail, partial, unknown, gaps), `top_gaps` (список объектов Gap из БД), `ai_tone`.
- Вход для narrative собирается в `generate_executive_summary`: из БД читаются `ControlResult` (по assessment_id), по ним считаются `stats`, затем запрос `Gap` по assessment_id → `top_gaps`, и передаётся в `generate_ai_narrative`. Narrative вставляется в PDF Executive Summary.

Для SESSION_7 ключевые файлы/функции:

- **Файл:** `backend/app/services/report_generator.py`
- **Функции:** `generate_all_reports()`, `generate_ai_narrative()`, `generate_executive_summary()`
