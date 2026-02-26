# HIPAA SaaS — что уже есть (текущее состояние)

Краткое описание возможностей платформы на текущий момент.

---

## Репозиторий и агент

- **Единственный репозиторий:** `hipaa-saas`. Всё (веб-платформа, бэкенд, фронтенд, локальный агент) живёт в нём.
- **summit-local-agent** — это не отдельный репо, а **имя продукта/пакета** локального агента, входящего в этот репозиторий. Код агента: `agent/`, установка и сборка: `install/`, `build/`, `deploy/`. Релиз собирается как архив `summit-local-agent-v<version>.zip`. **Архитектура агента** (компоненты, конфиг, потоки данных, задачи): см. **docs/AGENT-ARCHITECTURE.md**.

---

## Общая идея

Мультитенантная SaaS-платформа для оценки готовности к HIPAA Security Rule. Два портала: **внутренний** (консультанты Summit Range) и **клиентский** (медицинские организации). Полный цикл: анкета → доказательства → движок соответствия → пакет отчётов.

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

- **Пакет (Report Package):** создаётся для оценки, имеет статус (draft → published).
- **Генерация:** Executive Summary (PDF), Gap Register, Risk Register, Remediation Roadmap, Evidence Checklist (XLSX). Опционально AI-нарратив в PDF (Claude).
- **Публикация:** после публикации пакет неизменяем; клиент видит только опубликованные пакеты.
- **Скачивание:** каждый файл пакета можно скачать по кнопке **Download** — файл отдаётся через backend (stream из MinIO), сохраняется с правильным именем; **Download all** скачивает Executive Summary через тот же механизм (без открытия MinIO в браузере). Консоль MinIO для админов: http://localhost:9001.

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

## Ingest Service и демо агента

- **Ingest** — отдельный сервис (Node.js/TypeScript, `server/ingest/`) в docker-compose; порт 8080. Принимает POST `/api/v1/ingest/packages` (ZIP + заголовки X-API-Key, X-Summit-Client-Org-Id, X-Summit-Package-Hash-SHA256, X-Idempotency-Key, X-Summit-Agent-Version). Проверяет: хеш ZIP, наличие и валидность `manifest.json` (в т.ч. `compliance.sanitized=true`, `raw_logs_included=false`), при необходимости подпись (SIGNING_REQUIRED). Сохраняет квитанции в БД; дубликаты по idempotency_key возвращают тот же receipt.
- **Демо агента:** скрипт `run-agent-demo.ps1` в корне репо: создаёт конфиг в `.agent-demo/`, выставляет tenant `client_org_id` для Valley Creek, создаёт тестовый пакет (manifest + анонимизированный payload через `agent/tools/create-test-package.ps1`) и отправляет его через `resend-outbox.ps1` в Ingest. Успешный приём → архив в `.agent-demo/archive/accepted/`. Инструкция: **docs/AGENT-DEMO-RUN.md**.
- **Анонимизация в демо:** пакет содержит только обобщённые данные (hostname REDACTED, ip_removed, без PII); при несоответствии манифеста (например UTF-8 BOM в JSON) Ingest возвращает 422 (INVALID_MANIFEST) — в create-test-package JSON пишется без BOM.

---

## Тесты и проверки

- **install/test-run.ps1** — проверка установки агента (конфиг, пути, задачи).
- **install/preflight.ps1** — проверка окружения перед установкой (PowerShell, права, execution policy, конфиг); опционально верификация релиза по манифесту и подписи.
- **build/verify-release.ps1** — проверка целостности релиза (ZIP hash, подпись манифеста).
- **agent/tools/diagnostics.ps1** — диагностика состояния агента (outbox, очередь, архив, задачи, логи); вывод в консоль или JSON.
- **Демо-сценарий:** `run-agent-demo.ps1` создаёт пакет → resend-outbox отправляет в Ingest → при успехе пакет принимается (receipt_id), при ошибке — TERMINAL_REJECTED и архив в rejected. Используется для проверки цепочки агент → Ingest и анонимизации.

---

## Next Layer (AI Evidence & Concierge — в работе)

Спецификация следующего модуля: **AI Evidence Validation & Client Concierge** (Claude Analyst + ChatGPT Concierge, задачи клиенту, агрегаты по контролю). Полное ТЗ — в папке **docs/next layer/** (.docx) и сводка — **docs/NEXT-LAYER-SPEC-SUMMARY.md**. В репозитории добавлены: модели БД (evidence_extractions, evidence_assessment_results, control_evidence_aggregates, client_tasks, assistant_message_logs), миграция 008, Pydantic-схемы и **заглушки API** (`/api/v1/evidence/{id}/extract`, `/analyze`, `/assessments/.../evidence-aggregates`, `/tasks`, `/assistant/chat`). Реализация pipeline (extraction → Claude → aggregate → task orchestrator → ChatGPT) — по плану в разделе 9 Implementation Plan.

---

## Что не входит в текущий уровень

- **Классификация и проверка документов по содержимому** — нет; планируется с LLM (roadmap).
- **Проверка отчётов и уточнения с клиентом** — нет; планируется (запросы на исправления, повторная генерация).
- **Единый «умный» отчёт после валидации** — пока только детерминистическая генерация по результатам движка.

---

## Запуск

```bash
git clone https://github.com/ibondarenko1/hipaa-saas.git
cd hipaa-saas
cp .env.example .env   # задать SECRET_KEY, при необходимости ANTHROPIC_API_KEY
docker-compose up --build
```

- Frontend: http://localhost:5173  
- API docs: http://localhost:8000/docs  
- MinIO console: http://localhost:9001  

Тестовый логин: `admin@summitrange.com` / `Admin1234!`

---

*Документ обновлён: добавлены Ingest, демо агента и раздел тестов/проверок.*
