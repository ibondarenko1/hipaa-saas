# SESSION 8 — План внедрения (упорядоченный)

Аудит Workflow Engine, Self-Attestation, Compliance Timeline. План приведён в соответствие с текущим кодом и цепочкой миграций.

---

## Структура изменений (где что лежит)

| Компонент | Действие | Путь |
|-----------|----------|------|
| Миграция | создать | `backend/migrations/versions/013_audit_workflow.py` |
| Модели workflow | создать | `backend/app/models/workflow.py` |
| Импорт моделей | править | `backend/app/models/` (например `models/__init__.py` или импорт в `models.py`) |
| Seed required evidence | создать | `backend/scripts/seed_required_evidence.py` или в `app/scripts/` |
| Audit workflow | создать | `backend/app/services/audit_workflow.py` |
| Self-attestation | создать | `backend/app/services/self_attestation_service.py` |
| Compliance history | создать | `backend/app/services/compliance_history.py` |
| Workflow API | создать | `backend/app/api/routes/workflow.py` |
| Регистрация роутера | править | `backend/app/main.py` |
| Publish + timeline | править | `backend/app/api/routes/reports.py` |
| Создание assessment | править | `backend/app/api/routes/assessments.py` |
| Типы | править | `frontend/src/types/index.ts` |
| API-клиент | править | `frontend/src/services/api.ts` |
| Dashboard timeline | править | `frontend/src/pages/client/Overview.tsx` |
| Self-Attestation modal | создать | `frontend/src/components/SelfAttestationModal.tsx` |

---

## Текущее состояние репозитория

- **Миграции:** цепочка заканчивается на `012_ingest_receipt_payload` (down: `011_cea_avg_findings`). Следующая миграция для SESSION_8 — **013**.
- **Base:** `from app.db.session import Base` (не `app.db.base`).
- **Auth:** `get_current_user`, `get_membership`, `require_internal(membership)`; нет `require_auth`.
- **EvidenceFile:** поля `file_name`, `content_type`, `size_bytes`, `storage_key`, `uploaded_by_user_id`; нет `filename`, `file_size`, `mime_type`, `status`, `control_tag`, `source`, `notes`.
- **Storage:** модуль с функциями `upload_bytes(storage_key, data, content_type)`; нет класса `StorageService` и метода `upload_file`.
- **Audit:** `log_event(db, event_type, tenant_id=..., user_id=..., entity_type=..., entity_id=..., payload=..., ip_address=...)`.
- **Control:** есть `control_code` (A1-01, …) и `hipaa_control_id` (HIPAA-GV-01). Seed required evidence ищет по **hipaa_control_id**.
- **IngestReceipt:** `status` в БД — `'ACCEPTED'` (верхний регистр). Для шага 1 workflow брать receipt по `tenant.client_org_id`, не по `tenant_id`.
- **Employee (workforce):** поле `is_active`, нет поля `status`.
- **Reports router:** префикс `/tenants/{tenant_id}`, эндпоинты вида `/reports/packages/...`. Timeline логично добавить как `GET /reports/compliance-timeline` в том же роутере (путь будет `/tenants/{tenant_id}/reports/compliance-timeline`).

---

## Порядок таблиц в миграции 013

Из-за FK зависимости создавать в таком порядке:

1. **control_required_evidence** (зависит только от `controls`)
2. **audit_workflow_states** (assessments, tenants)
3. **self_attestations** (tenants, assessments, controls, control_required_evidence)
4. **audit_checklist_items** (assessments, tenants, controls, control_required_evidence, evidence_files, **notifications**, **self_attestations**)
5. **compliance_score_history** (tenants, assessments, report_packages)

В оригинальном SESSION_8 audit_checklist_items создаётся до self_attestations, но у checklist_item есть `self_attestation_id` → FK на self_attestations. Поэтому **сначала создаём self_attestations, затем audit_checklist_items**.

---

## Фазы внедрения

### Фаза 1 — Миграция и модели (без логики)

| Шаг | Действие | Детали |
|-----|----------|--------|
| 1.1 | Создать миграцию `013_audit_workflow.py` | revision=`013_audit_workflow`, down_revision=`012_ingest_receipt_payload`. Таблицы в порядке выше. UUID — `UUID(as_uuid=False)` как в остальных миграциях. |
| 1.2 | Создать `backend/app/models/workflow.py` | ControlRequiredEvidence, AuditWorkflowState, AuditChecklistItem, SelfAttestation, ComplianceScoreHistory. Base из `app.db.session`. Использовать `gen_uuid` из models или `default=uuid.uuid4` и str в mapped_column. |
| 1.3 | Импорт workflow-моделей | В `backend/app/models/models.py` или в `__init__.py` импортировать и (при необходимости) зарегистрировать для Alembic. |

Проверка: `alembic upgrade head` проходит без ошибок.

---

### Фаза 2 — Seed (ControlRequiredEvidence)

| Шаг | Действие | Детали |
|-----|----------|--------|
| 2.1 | Скрипт `seed_required_evidence.py` | Искать Control по **hipaa_control_id** (в данных первый столбец — HIPAA-GV-01 и т.д.). Idempotent: пропускать существующие пары (control_id, artifact_name). |
| 2.2 | Запуск seed | Вызывать после миграции 013 (например, из `scripts/seed.py` или отдельной командой). |

---

### Фаза 3 — Сервисы (ядро логики)

| Шаг | Действие | Детали |
|-----|----------|--------|
| 3.1 | `audit_workflow.py` | `initialize_workflow`, `advance_workflow`, `get_workflow_status`. Шаг 1: по `tenant.client_org_id` искать IngestReceipt; status `'ACCEPTED'`. Шаг 2: считаем ControlResult по assessment; total controls — из Control по controlset оценки. Шаг 4: Employee по tenant_id и is_active; упрощённо — «есть хотя бы один сотрудник» или проверка workforce training по вашей модели. |
| 3.2 | `self_attestation_service.py` | Создать SelfAttestation, сгенерировать PDF (ReportLab), сохранить через `storage.upload_bytes(storage_key, pdf_bytes, "application/pdf")`, создать **EvidenceFile** с полями: file_name, content_type, size_bytes, storage_key, uploaded_by_user_id; tags можно [control_code]. Не использовать несуществующие поля. Обновить AuditChecklistItem (status=self_attested, evidence_file_id, self_attestation_id, client_responded_at). `log_event(db, "self_attestation_created", ...)`. |
| 3.3 | `compliance_history.py` | `record_published_score` (вызов из publish), `get_compliance_timeline`. Delta vs предыдущая точка по tenant. Опционально: вызов Claude для `claude_delta_summary`. |

---

### Фаза 4 — API

| Шаг | Действие | Детали |
|-----|----------|--------|
| 4.1 | Роутер `workflow.py` | Префикс: `/tenants/{tenant_id}/assessments/{assessment_id}/workflow`. Зависимости: `get_current_user`, `get_membership`; для advance — `require_internal`. Эндпоинты: GET status, POST advance, GET checklist, POST checklist/{item_id}/respond, POST self-attest. |
| 4.2 | Регистрация workflow | В `main.py`: `app.include_router(workflow.router, prefix="/api/v1")`. |
| 4.3 | reports.py | В publish после смены статуса на published вызвать `record_published_score(...)`. Добавить GET `compliance-timeline` (в рамках того же роутера: путь будет `/reports/compliance-timeline`, полный путь `/api/v1/tenants/{tenant_id}/reports/compliance-timeline`). |
| 4.4 | assessments.py | В POST создания assessment после `db.add(assessment)` и `await db.flush()` вызвать `initialize_workflow(assessment.id, tenant_id, db)`. Убедиться, что сессия коммитится (текущий get_db). |

---

### Фаза 5 — Frontend

| Шаг | Действие | Детали |
|-----|----------|--------|
| 5.1 | Типы (types/index.ts) | WorkflowStatus, ChecklistItem (с полем required_evidence_id для self-attest), ComplianceTimelinePoint. |
| 5.2 | API (api.ts) | workflowApi: getStatus, getChecklist, respondNoDocument, selfAttest. reportsApi.getTimeline: GET по tenant (путь из 4.3). |
| 5.3 | Compliance Timeline в Overview | Секция «Compliance Progress», LineChart (recharts), tooltip с score, delta, gaps, claude_delta_summary. Reference line 80%. |
| 5.4 | SelfAttestationModal | Чекбоксы по attestation_checklist, кнопка «I Confirm and Take Responsibility», вызов workflowApi.selfAttest с required_evidence_id из выбранного item. |

---

## Исправления относительно SESSION_8_WORKFLOW.md

- Номер миграции: **013**, не 012 (012 уже занят ingest_receipt_payload).
- Порядок таблиц: **self_attestations до audit_checklist_items** (из-за FK self_attestation_id).
- **workflow.py (модели):** Base из `app.db.session`; при необходимости использовать `gen_uuid` из `app.models.models`.
- **self_attestation_service:** 
  - Нет `StorageService()` — использовать `from app.services import storage` и `storage.upload_bytes(...)`.
  - EvidenceFile: только реальные поля (file_name, content_type, size_bytes, storage_key, uploaded_by_user_id); при необходимости tags для control.
- **audit_workflow advance_workflow:** шаг 1 — получать `tenant.client_org_id` и искать IngestReceipt по нему; status `'ACCEPTED'`. Шаг 4 — Employee с `is_active=True` (или упрощённая проверка).
- **Роутер workflow:** использовать `get_current_user`, `get_membership`; для advance — `require_internal(membership)`.
- **GET compliance-timeline:** в рамках роутера reports (prefix `/tenants/{tenant_id}`), путь `"/reports/compliance-timeline"`.
- **Seed required evidence:** поиск Control по `Control.hipaa_control_id == <первый столбец из REQUIRED_EVIDENCE>`.

---

## Зависимости между фазами

```
Фаза 1 (миграция + модели)
    → Фаза 2 (seed)
    → Фаза 3 (сервисы)
        → Фаза 4 (API)
            → Фаза 5 (Frontend)
```

Фазы 2 и 3 можно частично распараллелить после 1; 4 зависит от 3; 5 можно делать после 4.

---

## Критерии готовности (чеклист)

- [ ] Миграция 013 применена, таблицы созданы.
- [ ] Модели в workflow.py импортированы, без циклических импортов.
- [ ] Seed required evidence выполнен (артефакты по контролам).
- [ ] initialize_workflow вызывается при создании assessment; advance_workflow переводит шаги 1→5.
- [ ] POST self-attest создаёт SelfAttestation, PDF в MinIO, EvidenceFile с корректными полями.
- [ ] record_published_score вызывается из publish; GET compliance-timeline возвращает точки.
- [ ] Dashboard показывает график прогресса; SelfAttestationModal отправляет self-attest с required_evidence_id.
