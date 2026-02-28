# SESSION_7 — Конкретный план реализации (без TODO)

План правок по коду: реальные имена моделей, поля БД, фактические роуты.

---

## 1. Модели

### 1.1 ControlEvidenceAggregate (миграция 008)

**Файл модели:** `backend/app/models/ai_evidence.py` (класс `ControlEvidenceAggregate`).  
**Таблица:** `control_evidence_aggregates`.

**Поля в БД (миграция `008_ai_evidence_module.py`):**

| Поле              | Тип           | Nullable | Описание |
|-------------------|---------------|----------|----------|
| `id`              | UUID          | PK       | Первичный ключ |
| `tenant_id`       | UUID          | NOT NULL | FK → tenants.id |
| `assessment_id`   | UUID          | NOT NULL | FK → assessments.id |
| `control_id`      | UUID          | NOT NULL | FK → controls.id |
| `status`          | TEXT          | NOT NULL | Агрегированный статус (strong/adequate/weak/insufficient/missing) |
| `score`           | FLOAT         | NULL     | Числовая оценка 0–1 |
| `evidence_count`  | INTEGER       | NOT NULL | Кол-во документов (default 0) |
| `analysis_ids_used` | JSONB       | NULL     | Список id EvidenceAssessmentResult |
| `updated_at`      | TIMESTAMPTZ   | NOT NULL | Время обновления |

**Уникальность:** `(assessment_id, control_id)` — один агрегат на пару assessment+control.

**Индексы:**  
`ix_control_evidence_aggregates_assessment`, `ix_control_evidence_aggregates_tenant`.

В миграции 008 **нет** полей `avg_strength`, `findings_summary` — только перечисленные выше.

---

### 1.2 Agent snapshot — модель в платформе

**Имя модели:** `IngestReceipt`.  
**Модуль:** `app.models.ingest` (импорт в `app.models.models`: `from app.models.ingest import IngestReceipt`).  
**Таблица:** `ingest_receipts` (миграция `006_ingest_receipts`).

**Поля в БД (миграция 006 и модель `backend/app/models/ingest.py`):**

| Поле                 | Тип         | Описание |
|----------------------|-------------|----------|
| `receipt_id`         | TEXT        | PK |
| `client_org_id`      | TEXT        | NOT NULL |
| `idempotency_key`    | TEXT        | NOT NULL |
| `package_hash_sha256`| TEXT        | NOT NULL |
| `agent_version`      | TEXT        | NULL |
| `status`             | TEXT        | NOT NULL (ACCEPTED \| REJECTED) |
| `duplicate`          | BOOLEAN     | NOT NULL default false |
| `error_code`         | TEXT        | NULL |
| `message`            | TEXT        | NULL |
| `server_request_id`  | TEXT        | NULL |
| `received_at_utc`    | TIMESTAMPTZ | NOT NULL |
| `last_seen_at_utc`   | TIMESTAMPTZ | NOT NULL |
| `hit_count`          | INTEGER     | NOT NULL default 1 |

**Важно:** в таблице `ingest_receipts` **нет** полей `snapshot_data`, `metadata` или аналога. Содержимое пакета (anonymized snapshot) в текущей реализации ingest service не сохраняется в БД. Для report context «последний agent snapshot» нужно либо: (1) расширить ingest service — сохранять snapshot при приёме (новая колонка/таблица) и отдавать в API; либо (2) в фазе 1 использовать пустой/заглушечный контекст и документировать ограничение.

---

### 1.3 ControlResult (для отчётов и stats)

**Файл:** `backend/app/models/models.py`, класс `ControlResult`.  
**Таблица:** `control_results`.

**Поля:**

| Поле            | Тип         | Описание |
|-----------------|-------------|----------|
| `id`            | UUID        | PK |
| `tenant_id`     | UUID        | NOT NULL, FK → tenants.id |
| `assessment_id` | UUID        | NOT NULL, FK → assessments.id |
| `control_id`    | UUID        | NOT NULL, FK → controls.id |
| `status`        | TEXT        | NOT NULL — **Pass \| Partial \| Fail \| Unknown** |
| `severity`      | TEXT        | NOT NULL (снимок severity контрола) |
| `rationale`      | TEXT        | NULL (**не** comment) |
| `calculated_at`  | TIMESTAMPTZ | NOT NULL |

Уникальность: `(assessment_id, control_id)`.

---

## 2. Роуты (фактические префиксы)

Все роутеры подключены в `backend/app/main.py` с префиксом `"/api/v1"` (без дополнительного префикса для ai_evidence и reports).

### 2.1 AI Evidence (`app.api.routes.ai_evidence`)

- `POST /api/v1/evidence/{evidence_file_id}/extract` — запрос экстракции.
- `GET  /api/v1/evidence/{evidence_file_id}/extraction?assessment_id=...` — статус экстракции.
- `POST /api/v1/evidence/{evidence_file_id}/analyze` — запуск анализа Claude, сохранение EvidenceAssessmentResult.
- `GET  /api/v1/assessments/{assessment_id}/controls/{control_id}/evidence-results` — список EvidenceAssessmentResult по контролу.
- `POST /api/v1/assessments/{assessment_id}/recompute-evidence-aggregates` — **сейчас заглушка** (recomputed_controls=0, updated_aggregates=[]).
- `GET  /api/v1/assessments/{assessment_id}/evidence-aggregates` — **сейчас заглушка** (aggregates=[]).

Дополнительно: notes, assistant/chat, claude/check, assistant/check, assistant/test-key, tasks (stubs).

### 2.2 Reports (`app.api.routes.reports`)

Роутер объявлен с `prefix="/tenants/{tenant_id}"`, итоговый префикс: **`/api/v1/tenants/{tenant_id}`**.

- `POST /api/v1/tenants/{tenant_id}/assessments/{assessment_id}/reports/packages` — создание пакета отчётов.
- `POST /api/v1/tenants/{tenant_id}/reports/packages/{package_id}/generate` — **генерация файлов** (здесь вызывается `generate_all_reports` → `generate_executive_summary` → `generate_ai_narrative`).
- `GET  /api/v1/tenants/{tenant_id}/reports/packages`
- `GET  /api/v1/tenants/{tenant_id}/reports/packages/{package_id}`
- `GET  /api/v1/tenants/{tenant_id}/reports/packages/{package_id}/files`
- `POST /api/v1/tenants/{tenant_id}/reports/packages/{package_id}/publish`
- `GET  /api/v1/tenants/{tenant_id}/reports/packages/{package_id}/download`
- `GET  /api/v1/tenants/{tenant_id}/reports/files/{file_id}/download-url`

---

## 3. report_generator.py — где собираются stats и top_gaps

**Файл:** `backend/app/services/report_generator.py`.

### 3.1 generate_executive_summary()

Сигнатура:

```python
async def generate_executive_summary(
    assessment: Assessment,
    tenant: Tenant,
    db: AsyncSession,
    include_ai: bool = True,
    ai_tone: str = "neutral",
) -> bytes:
```

Сбор `stats` и `top_gaps` (строки 509–527):

```python
cr_result = await db.execute(
    select(ControlResult).where(ControlResult.assessment_id == assessment.id)
)
control_results = cr_result.scalars().all()

stats = {
    "total": len(control_results),
    "pass": sum(1 for r in control_results if r.status == "Pass"),
    "fail": sum(1 for r in control_results if r.status == "Fail"),
    "partial": sum(1 for r in control_results if r.status == "Partial"),
    "unknown": sum(1 for r in control_results if r.status == "Unknown"),
}

gaps_result = await db.execute(
    select(Gap).where(Gap.assessment_id == assessment.id)
    .order_by(Gap.severity.desc())
    .limit(15)
)
top_gaps = gaps_result.scalars().all()
stats["gaps"] = len(top_gaps)

narrative = await generate_ai_narrative(tenant, assessment, stats, top_gaps, ai_tone)
```

Типы: `control_results` — список ORM-объектов `ControlResult`; `top_gaps` — список ORM-объектов `Gap`. У `Gap` используются атрибуты: `severity`, `description`, и т.д. (см. `_template_narrative` и промпт в `generate_ai_narrative`).

### 3.2 generate_ai_narrative()

Сигнатура:

```python
async def generate_ai_narrative(
    tenant: Tenant,
    assessment: Assessment,
    stats: dict,
    top_gaps: list,
    ai_tone: str = "neutral",
) -> str:
```

Сейчас принимает только `tenant`, `assessment`, `stats`, `top_gaps`, `ai_tone`. Для SESSION_7 сюда нужно добавить параметр `full_context: dict | None = None` (или отдельно `agent_snapshot`, `evidence_aggregates`) и в промпте подмешивать этот контекст.

---

## 4. Конкретный план правок для SESSION_7

### Задача A — ControlEvidenceAggregate

1. **Сервис агрегации**  
   Создать `backend/app/services/evidence_aggregator.py`:
   - Функция пересчёта по одному контролу: выборка всех `EvidenceAssessmentResult` по `(assessment_id, control_id)`, вычисление `status` (strong/adequate/weak/insufficient/missing), `score`, `evidence_count`, `analysis_ids_used`; upsert в `ControlEvidenceAggregate` (поля только те, что есть в миграции 008: `id`, `tenant_id`, `assessment_id`, `control_id`, `status`, `score`, `evidence_count`, `analysis_ids_used`, `updated_at`).
   - Функция пересчёта по всему assessment: цикл по контролам assessment, вызов пересчёта по контролу.

2. **Роуты ai_evidence.py**  
   - В `POST /api/v1/assessments/{assessment_id}/recompute-evidence-aggregates`: после проверки прав вызвать сервис пересчёта по assessment, вернуть `recomputed_controls`, `updated_aggregates` (список DTO из созданных/обновлённых записей).
   - В `GET /api/v1/assessments/{assessment_id}/evidence-aggregates`: выборка `ControlEvidenceAggregate` по `assessment_id`, вернуть список агрегатов (например через `ControlEvidenceAggregateDTO`).

3. **Вызов пересчёта после analyze**  
   В `POST /api/v1/evidence/{evidence_file_id}/analyze` после сохранения `EvidenceAssessmentResult` вызывать пересчёт агрегата только для этого `(assessment_id, control_id)` (чтобы не пересчитывать весь assessment при каждом analyze).

### Задача B — Report context (full_context) и generate_ai_narrative

1. **report_context_builder.py**  
   Создать `backend/app/services/report_context_builder.py`:
   - `async def build_full_report_context(assessment_id, tenant_id, db) -> dict`:
     - Блок 1: из БД платформы — агрегаты: `select(ControlEvidenceAggregate).where(ControlEvidenceAggregate.assessment_id == assessment_id)`. Преобразовать в структуру для промпта (например список по control_id с status, score, evidence_count).
     - Блок 2: EvidenceAssessmentResult по assessment — выборка с join к EvidenceFile/Control по необходимости, формат краткого списка «документ — контроль — статус/strength».
     - Блок 3 (agent snapshot): по текущей схеме в платформе нет таблицы со snapshot. Варианты:  
       - Либо получать `client_org_id` по tenant (через tenant_repo / assessment), вызывать внутренний proxy `GET /api/v1/internal/clinics/{clinic_id}/ingest/receipts` (или прямой вызов ingest service `GET /api/v1/ingest/receipts?client_org_id=...`), взять последний ACCEPTED receipt; затем запрос деталей receipt — если в будущем ingest будет отдавать snapshot в ответе, подставить его; иначе — вернуть в full_context пустой или заглушку «agent snapshot not available».
       - Либо завести в ingest service сохранение snapshot при приёме пакета (отдельная таблица/колонка) и API для получения snapshot по receipt_id — тогда в report_context_builder вызывать этот API по последнему receipt.
   - Вернуть словарь, например: `{"control_aggregates": [...], "evidence_results_summary": [...], "agent_snapshot": ...}`.

2. **generate_executive_summary**  
   Перед вызовом `generate_ai_narrative`:
   - Вызвать `build_full_report_context(assessment.id, tenant.id, db)`.
   - Передать `full_context` в `generate_ai_narrative`.

3. **generate_ai_narrative**  
   Добавить параметр `full_context: dict | None = None`. В теле функции дописать в системный/пользовательский промпт блок текста, сформированный из `full_context` (агрегаты по контролам, кратко evidence results, при наличии — agent snapshot). Формат текста зафиксировать в коде (например: «Control evidence aggregates: …», «Evidence analysis summary: …», «Agent snapshot (if available): …»).

### Задача C — Snapshot contract (опционально для ingest)

- В `docs/SNAPSHOT-CONTRACT-V2.md` описать: где хранится snapshot (платформа vs ingest service); при решении сохранять в ingest — схему хранения и API для получения snapshot по receipt_id / client_org_id.
- В платформе в `report_context_builder` использовать только те поля и API, которые реально есть или будут добавлены по этому контракту.

---

## 5. Краткая сводка для копирования в SESSION_7

- **ControlEvidenceAggregate (008):** id, tenant_id, assessment_id, control_id, status, score, evidence_count, analysis_ids_used, updated_at. Без avg_strength/findings_summary.
- **Agent snapshot модель в платформе:** `IngestReceipt`, таблица `ingest_receipts`; полей snapshot_data/metadata нет; snapshot в текущем ingest не сохраняется — для контекста отчёта либо заглушка, либо расширение ingest API/БД.
- **ControlResult:** status = Pass|Partial|Fail|Unknown; поле rationale (не comment).
- **Роуты:**  
  - AI: `POST /api/v1/assessments/{id}/recompute-evidence-aggregates`, `GET /api/v1/assessments/{id}/evidence-aggregates`, `GET /api/v1/assessments/{id}/controls/{id}/evidence-results`.  
  - Reports: `POST /api/v1/tenants/{tenant_id}/reports/packages/{package_id}/generate`.
- **report_generator:** stats и top_gaps собираются в `generate_executive_summary` из ControlResult и Gap; narrative вызывается как `generate_ai_narrative(tenant, assessment, stats, top_gaps, ai_tone)` — расширить до передачи full_context из build_full_report_context.

После этих шагов SESSION_7 можно писать без TODO и без «адаптации на ходу»: все имена моделей, полей и роутов соответствуют коду.
