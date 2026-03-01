# HIPAA SaaS — что уже есть (текущее состояние)

Краткое описание возможностей платформы на текущий момент.

---

## Репозиторий и агент

- **Единственный репозиторий:** `hipaa-saas`. Всё (веб-платформа, бэкенд, фронтенд, локальный агент) живёт в нём.
- **summit-local-agent** — это не отдельный репо, а **имя продукта/пакета** локального агента, входящего в этот репозиторий. Код агента: `agent/`, установка и сборка: `install/`, `build/`, `deploy/`. Релиз собирается как архив `summit-local-agent-v<version>.zip`. **Архитектура агента** (компоненты, конфиг, потоки данных, задачи): см. **docs/AGENT-ARCHITECTURE.md**.

---

## Общая идея

Мультитенантная SaaS-платформа для оценки готовности к HIPAA Security Rule. Два портала: **внутренний** (консультанты Summit Range) и **клиентский** (медицинские организации).

**Порядок работы по архитектуре** (подробно: **docs/WORKFLOW-ORDER-CLARIFICATION.md**):

1. **Агент** включается на стороне клиники → генерирует и передаёт данные (ZIP с manifest/snapshot) в **Ingest Service** → данные сохраняются и доступны в системе (receipts); при генерации отчёта попадают в контекст Claude как agent_snapshot.
2. **Клиент** заполняет опросник (Assessment) и загружает документы в Evidence Vault.
3. **Claude** анализирует: по файлам доказательств (Claude Analyst — validated/weak/mismatch/unreadable); при генерации отчёта — полный контекст (ответы, гэпы, доказательства, данные агента). Запрос недостающих документов у клиента выполняется **вручную** консультантом (Evidence Review → «Request Document»); автоматического «Claude запросил документы» пока нет.
4. **Клиент** дополняет доказательства или оставляет как есть (явной отметки «документа нет» в UI нет).
5. **После этого** консультант создаёт пакет отчёта → **Generate** (движок перезапускается, затем генерация всех артефактов с AI-нарративом) → **Publish**. Клиент видит только опубликованные отчёты; в графике «Compliance Progress Over Time» появляется новая точка (compliance_score_history).

---

## Технологии

| Слой | Стек |
|------|------|
| API | FastAPI, Python 3.12, SQLAlchemy 2 (async), Alembic |
| БД | PostgreSQL 16 |
| Хранилище файлов | MinIO (S3-совместимый) |
| Аутентификация | JWT (python-jose, bcrypt) |
| Отчёты | ReportLab (PDF), openpyxl (XLSX) |
| AI (опционально) | Anthropic Claude — нарратив в Executive Summary |
| Frontend | React 18, TypeScript, Vite, TailwindCSS |
| Инфраструктура | Docker Compose |

---

## Роли и порталы

- **internal_user** — консультант: клиенты, запуск движка, просмотр результатов, генерация и публикация отчётов, аудит, workforce, обучение.
- **client_user** — клиент: обзор, анкета, загрузка доказательств, отчёты (только опубликованные), workforce (сотрудники, сертификаты), настройки.

---

## Внутренний портал (Internal)

- **Dashboard** — сводка по клиентам и оценкам.
- **Tenants** — список клиентов (тенантов), создание, приглашения.
- **Tenant Detail** — карточка клиента: оценки, кнопка Submit & run check (с проверкой 70% + критические вопросы), запуск движка.
- **Engine Results** — результаты движка: контрольные результаты, гэпы, риски, remediation; модальное окно генерации отчёта (с отображением ошибок при 500).
- **Reports** — пакеты отчётов по оценке: создание, генерация, публикация; список файлов пакета; **скачивание по одному файлу через API** (stream, без MinIO в браузере); **Download all** — скачивание Executive Summary через stream.
- **Evidence Review** — запрос документов у клиента по контролю, просмотр доказательств.
- **Evidence Checklist** — чеклист доказательств по контролям.
- **Workforce** — сотрудники клиента (если включено): список, добавление, импорт/экспорт CSV, шаблон CSV.
- **Training Status** — сводка по обучению: выбор клиента, таблица сотрудников × задания (Completed / Overdue / Not completed).
- **Communications** — коммуникации с клиентом.
- **SRA Assessment** — оценка по SRA (отдельный анкетный поток).
- **Audit Log** — журнал аудита по тенанту.

---

## Клиентский портал (Client)

- **Overview** — обзор: прогресс анкеты, доказательства по контролям, карточка Workforce Compliance, быстрые действия.
- **Assessment** — HIPAA-анкета: вопросы по контролям, автосохранение ответов, N/A где допустимо.
- **Evidence (Evidence Vault)** — загрузка документов по контролям: привязка к контролю при загрузке (теги), шаблоны, статусы In Review / Need Attention, комментарии рецензента.
- **Workforce** — вкладки: Overview, Employees, Assignments, Certificates; загрузка сотрудников, назначение обучений, скачивание сертификатов.
- **Training** — доступ к назначенным обучениям (клиентский вид).
- **Reports** — только опубликованные пакеты отчётов; скачивание файлов (через API, stream).
- **Settings** — настройки профиля/тенанта.
- **Onboarding** — онбординг нового клиента (если используется).

---

## Движок соответствия (Compliance Engine)

- Детерминистический: правила по ответам на вопросы → Pass / Partial / Fail / Unknown по каждому контролю.
- 7 типов правил; маппинг на 40 контролов HIPAA (Administrative, Physical, Technical, Vendor).
- Вход: ответы на вопросы + факт наличия доказательств по контролю (да/нет).
- Выход: ControlResult, Gap, Risk, RemediationAction; используется при генерации отчётов.

---

## Submit Gate (перед запуском движка)

- Требуется **не менее 70%** ответов (по числу вопросов).
- Обязательно заполнены **критические вопросы** (например A1-Q1, A3-Q2, C1-Q1, C4-Q1, D1-Q2, C1-Q2); часть не может быть N/A.
- При невыполнении: в UI выводится детальное сообщение (сколько процентов, какие критические пропущены).

---

## Доказательства (Evidence)

- Загрузка через presigned URL в MinIO (PDF, DOCX, XLSX, PNG, JPEG; до 25 MB).
- При регистрации файла указываются **теги** (код контрола) — пользователь сам выбирает, к какому контролю относится документ.
- Связь с оценкой: EvidenceLink (assessment_id, evidence_file_id, control_id опционально).
- **Содержимое документов не анализируется** — тип документа (например «перечень оборудования») не определяется автоматически; запланировано на следующий уровень с LLM (см. ROADMAP-LLM-EVIDENCE.md).

---

## Отчёты (Reports)

- **Пакет (Report Package):** создаётся для оценки, имеет статус (draft → generated → published).
- **Генерация:** перед генерацией автоматически запускается **движок** (актуальные ControlResult); затем формируются Executive Summary (PDF), Gap Register, Risk Register, Remediation Roadmap, Evidence Checklist (XLSX). При заданном `ANTHROPIC_API_KEY` в Executive Summary добавляется **AI-нарратив** (Claude) по полному контексту (ответы, гэпы, агрегаты доказательств, **данные агента**). В PDF при использовании Claude выводится строка: *«This summary was generated by Claude AI from your questionnaire answers, evidence, and agent data.»* — так видно, что отчёт сгенерирован с Claude.
- **Важно:** уже опубликованный пакет не пересобирается. Чтобы в скачанном отчёте был нарратив Claude (и эта подпись), нужно **заново сгенерировать** пакет (Internal → Reports → Generate) после настройки `ANTHROPIC_API_KEY` и затем снова опубликовать. См. **docs/AGENT-DATA-IN-REPORT.md**.
- **Публикация:** после публикации пакет неизменяем; вызывается `record_published_score` — в **compliance_score_history** добавляется точка (score_percent, delta, опционально claude_delta_summary). Клиент видит только опубликованные пакеты; на странице Reports отображается **один последний пакет по каждой оценке** (макс. package_version).
- **Compliance Progress Over Time:** график по данным `compliance_score_history` (ось X — дата публикации, ось Y — процент, зона 80%+). API: GET `/tenants/{id}/reports/compliance-timeline`.
- **Скачивание:** каждый файл пакета — по кнопке **Download** (stream через backend); **Download all** — ZIP пакета. Консоль MinIO для админов: http://localhost:9001.

---

## Workforce (SESSION_6)

- **Сущности:** сотрудники (Employee), назначения обучений (EmployeeTrainingAssignment), сертификаты (TrainingCertificate), лог импорта (WorkforceImportLog).
- **Функции:** CRUD сотрудников, CSV template / import / export, назначение обучений, завершение → создание сертификата и доказательства (HIPAA-PR-06), список/верификация/скачивание сертификатов, статистика.
- **Клиент:** вкладки Overview, Employees, Assignments, Certificates; внутренний портал — управление workforce по клиенту и страница Training Status (сотрудники × статусы обучений по компании).

---

## Безопасность и аудит

- JWT, роли internal_user / client_user, привязка к тенанту (membership).
- Аудит: логирование событий (evidence_uploaded, report_download, login, и т.д.) с user_id, tenant_id, entity_type, entity_id, payload, IP.

---

## Ingest Service и агент

- **Ingest** — отдельный сервис (Node.js/TypeScript, `server/ingest/`) в docker-compose; порт 8080. Принимает POST `/api/v1/ingest/packages` (ZIP + заголовки X-API-Key, X-Summit-Client-Org-Id, X-Summit-Package-Hash-SHA256, X-Idempotency-Key, X-Summit-Agent-Version). Проверяет: хеш ZIP, наличие и валидность `manifest.json` (в т.ч. `compliance.sanitized=true`, `raw_logs_included=false`), при необходимости подпись (SIGNING_REQUIRED). Сохраняет квитанции в БД (manifest_payload, snapshot_data при наличии snapshot.json в ZIP); дубликаты по idempotency_key возвращают тот же receipt.
- **SaaS proxy:** бэкенд проксирует запросы к Ingest (GET receipts по clinic/tenant) через `INGEST_BASE_URL` и `INGEST_API_KEY`; маппинг тенанта на `client_org_id` в Tenant. Фронт не знает ключ Ingest.
- **Данные агента в отчёте:** при генерации Executive Summary последний ACCEPTED receipt по `tenant.client_org_id` подставляется в контекст Claude как agent_snapshot; в нарративе может появиться раздел «Agent-Reported Data». У тенанта должен быть заполнен `client_org_id` (тот же, что агент шлёт в X-Summit-Client-Org-Id). См. **docs/AGENT-DATA-IN-REPORT.md**, **docs/AGENT-INGEST-OVERVIEW.md**.
- **Демо агента:** скрипт `run-agent-demo.ps1` в корне репо: создаёт конфиг в `.agent-demo/`, выставляет tenant `client_org_id` для Valley Creek, создаёт тестовый пакет (manifest + анонимизированный payload) и отправляет через `resend-outbox.ps1` в Ingest. Успешный приём → архив в `.agent-demo/archive/accepted/`. Инструкция: **docs/AGENT-DEMO-RUN.md**.

---

## Тесты и проверки

- **install/test-run.ps1** — проверка установки агента (конфиг, пути, задачи).
- **install/preflight.ps1** — проверка окружения перед установкой (PowerShell, права, execution policy, конфиг); опционально верификация релиза по манифесту и подписи.
- **build/verify-release.ps1** — проверка целостности релиза (ZIP hash, подпись манифеста).
- **agent/tools/diagnostics.ps1** — диагностика состояния агента (outbox, очередь, архив, задачи, логи); вывод в консоль или JSON.
- **Демо-сценарий:** `run-agent-demo.ps1` создаёт пакет → resend-outbox отправляет в Ingest → при успехе пакет принимается (receipt_id), при ошибке — TERMINAL_REJECTED и архив в rejected. Используется для проверки цепочки агент → Ingest и анонимизации.

---

## AI: Claude и Concierge

- **Конфиг (backend/app/core/config.py):** `ANTHROPIC_API_KEY`, `LLM_ENABLED` (для нарратива отчёта; при наличии ключа LLM считается включённым), `LLM_MODEL`, `CLAUDE_ANALYST_ENABLED` (анализ доказательств). Для Concierge: `OPENAI_API_KEY`, `OPENAI_MODEL`, `CHATGPT_CONCIERGE_ENABLED`. Файл `.env` загружается из корня проекта или cwd.
- **Extraction:** извлечение текста из PDF (pypdf), DOCX (python-docx), XLSX (openpyxl); состояние в `evidence_extractions`. API: POST `/api/v1/evidence/{id}/extract`, GET `/api/v1/evidence/{id}/extraction?assessment_id=...`.
- **Control Expectation Spec:** модель `ControlExpectationSpec` (control_id, guidance_text и др.); используется в промпте Claude Analyst.
- **Claude Analyst:** оценка загруженного файла по контролю (validated | weak | mismatch | unreadable). API: POST `/api/v1/evidence/{id}/analyze` (body: assessment_id, control_id), GET `/api/v1/assessments/{id}/controls/{id}/evidence-results`. Проверка конфига: GET `/api/v1/claude/check` (без выдачи секретов).
- **Evidence aggregates:** `recompute_control_aggregates` пересчитывает агрегаты по результатам Claude Analyst; вызывается после analyze и при генерации отчёта. Контекст отчёта (build_full_report_context) включает агрегаты по контролям.
- **Report narrative (Claude):** при генерации Executive Summary передаётся полный контекст; Claude генерирует нарратив. При отсутствии ключа — шаблонный текст. В PDF при использовании Claude добавляется явная подпись «This summary was generated by Claude AI…», чтобы было видно участие AI.
- **ChatGPT Concierge:** чат-ассистент (OpenAI); API POST `/api/v1/assistant/chat`. В портале — плавающая кнопка, панель с историей и вводом (Internal и Client layout).

---

## Что не входит в текущий уровень

- **Запросы до отчёта от Claude:** реализован шаг «Claude анализирует контекст и выдаёт запросы клиенту»: `POST /tenants/{id}/assessments/{aid}/claude/document-requests` (internal). Движок перезапускается, контекст (в т.ч. данные агента) передаётся только Claude; по ответу Claude создаются уведомления (document_request). **Результат обработки платформой клиенту не отдаётся** — клиент видит только сформулированные Claude запросы и итоговый отчёт после Publish. См. **docs/WORKFLOW-ORDER-CLARIFICATION.md**.
- **Формальная отметка «документа нет»:** клиент может не загружать файл или оставить комментарий; отдельного действия «отметил, что документа нет» по запросу в UI нет.
- **Блокировка генерации отчёта до ответов на запросы:** момент генерации задаётся консультантом; нет проверки «все запросы документов закрыты».
- **Дальнейшие расширения:** классификация документов по типу (LLM), запросы на исправления отчёта, повторная генерация по сценарию — по roadmap.

---

## Запуск

```bash
git clone https://github.com/ibondarenko1/hipaa-saas.git
cd hipaa-saas
cp .env.example .env   # задать SECRET_KEY; для Claude: ANTHROPIC_API_KEY=sk-ant-... (см. docs/CLAUDE-SETUP.md)
docker-compose up --build
```

**Проверка Claude:** `GET /health` → `claude_configured: true` (ключ задан). Чтобы убедиться, что API реально работает (нет ошибки биллинга/ключа): после логина вызвать `GET /api/v1/claude/check` — в ответе `claude_usable: true` или причина в `claude_error_message` (например, insufficient_credits → пополнить счёт в console.anthropic.com).

- Frontend: http://localhost:5173  
- API docs: http://localhost:8000/docs  
- MinIO console: http://localhost:9001  

**Доступ из другого города (публичный URL):** см. **docs/expose-public.md** — ngrok, cloudflared или проброс порта.

Тестовый логин: `admin@summitrange.com` / `Admin1234!`

---

## Связанные документы

| Документ | Содержание |
|----------|------------|
| **docs/WORKFLOW-ORDER-CLARIFICATION.md** | Порядок: агент → клиент → анализ → запросы → отчёт; что реализовано, что нет. |
| **docs/AGENT-ARCHITECTURE.md** | Компоненты агента, конфиг, поток данных, связь с Ingest. |
| **docs/AGENT-INGEST-OVERVIEW.md** | Ingest API, контракт пакета, proxy, коды ошибок. |
| **docs/AGENT-DATA-IN-REPORT.md** | Как данные агента попадают в отчёт (agent_snapshot, snapshot.json). |
| **docs/CLAUDE-ARCHITECTURE.md** | Claude Analyst vs Report narrative, конфиг, контракты. |
| **docs/FULL-SYSTEM-TEST.md** | Полный цикл проверки: health → login → submit → engine → generate → publish. |

---

*Документ обновлён: порядок работы по архитектуре, Evidence/Claude, отчёты и compliance timeline, Ingest и данные агента в отчёте, AI-конфиг, раздел «что не входит», ссылки на связанные доки.*
