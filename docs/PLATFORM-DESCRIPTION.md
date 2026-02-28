# HIPAA SaaS Platform — полное описание построенного и проверенного

Подробное описание платформы: что реализовано, как устроено и что фактически проверено в работе.

---

## 1. Назначение платформы

**HIPAA Readiness Platform** — мультитенантная SaaS-система для оценки готовности организаций к требованиям HIPAA Security Rule (45 CFR Part 164). Заказчик продукта — **Summit Range Consulting** (консультанты); конечные пользователи — медицинские организации (клиенты), которые проходят оценку и получают пакет отчётов о соответствии.

**Два портала:**
- **Internal (внутренний)** — для консультантов: управление клиентами, запуск движка соответствия, просмотр результатов, генерация и публикация отчётов, workforce, аудит.
- **Client (клиентский)** — для организаций-клиентов: заполнение анкеты, загрузка доказательств, просмотр и скачивание опубликованных отчётов, workforce (сотрудники и обучение).

**Жизненный цикл:** создание тенанта → создание оценки → заполнение анкеты клиентом → загрузка доказательств → проверка полноты (Submit Gate) → запуск движка → генерация пакета отчётов → публикация → скачивание клиентом.

---

## 2. Технологический стек

| Слой | Технология | Версия / примечание |
|------|------------|----------------------|
| Backend | FastAPI | 0.111+ |
| Язык | Python | 3.12 |
| ORM | SQLAlchemy | 2.0, async |
| Миграции | Alembic | |
| БД | PostgreSQL | 16 |
| Файловое хранилище | MinIO | S3-совместимый, bucket `hipaa-evidence` |
| Аутентификация | JWT | python-jose, passlib/bcrypt, 8 ч жизни токена |
| Генерация PDF | ReportLab | Executive Summary |
| Генерация XLSX | openpyxl | Регистры (gaps, risks, roadmap, evidence checklist) |
| AI (опционально) | Anthropic Claude | Нарратив в Executive Summary, `LLM_ENABLED` |
| Frontend | React | 18 |
| Язык UI | TypeScript | 5.x |
| Сборка | Vite | |
| Стили | TailwindCSS | 3 |
| HTTP-клиент | Axios | Все вызовы API в `services/api.ts` |
| Инфраструктура | Docker Compose | postgres, minio, minio_init, backend, frontend |

**Запуск:** `docker-compose up --build`. После старта backend выполняет `alembic upgrade head`, `python scripts/seed.py`, `python scripts/reset_admin_password.py`, затем uvicorn. Frontend — `npm run dev`. Тестовый логин: `admin@summitrange.com` / `Admin1234!`.

---

## 3. Роли и доступ

- **internal_user** — консультант Summit Range. Доступ: все тенанты, создание/редактирование клиентов и членов, оценки, запуск движка, результаты, отчёты (создание/генерация/публикация), evidence review, workforce по клиентам, Training Status, Communications, SRA Assessment, Audit Log. Не привязан к одному тенанту.
- **client_user** — пользователь организации-клиента. Доступ только к своему тенанту: Overview, Assessment, Evidence, Workforce, Training, Reports (только опубликованные пакеты), Settings, Onboarding. Не видит чужие тенанты и черновики отчётов.

Проверка: JWT в заголовке, из токена извлекается `user_id`; для маршрутов с `tenant_id` требуется членство в тенанте (TenantMember), роль проверяется там, где нужно (например, client_user не видит draft-пакеты).

---

## 4. Backend — API и модули

### 4.1 Маршруты (все под префиксом `/api/v1`)

| Модуль | Префикс/маршрут | Назначение |
|--------|------------------|------------|
| **auth** | `POST /auth/login`, `POST /auth/logout`, `GET /auth/me` | Вход, выход, текущий пользователь с memberships |
| **tenants** | `POST /tenants`, `GET /tenants`, `GET /tenants/{id}`, `GET /tenants/{id}/summary`, `PATCH /tenants/{id}`, `POST /tenants/{id}/members`, `GET /tenants/{id}/members`, `PATCH /tenants/{id}/members/{mid}` | CRUD тенантов, участники, сводка (оценки, доказательства) |
| **frameworks** | `GET /frameworks`, `GET /frameworks/{id}/controls`, `GET /frameworks/{id}/questions` | Справочники: фреймворки, контроли, вопросы |
| **assessments** | `POST /tenants/{id}/assessments`, `GET`, `GET /{aid}`, `PATCH /{aid}`, `POST /{aid}/submit`, `POST /{aid}/complete`, `GET /{aid}/progress` | Оценки: создание, список, submit (с Submit Gate), complete, прогресс |
| **answers** | `GET /tenants/{id}/assessments/{aid}/answers`, `PUT /.../answers/{qid}`, `PATCH /.../answers/batch` | Ответы на вопросы: список, upsert по вопросу, batch upsert |
| **evidence** | `POST /tenants/{id}/evidence/upload-url`, `POST /tenants/{id}/evidence`, `GET /tenants/{id}/evidence`, `GET /.../evidence/{fid}/download-url`, `PATCH /.../evidence/{fid}`, `DELETE /.../evidence/{fid}`, `POST /.../evidence/links`, `GET /tenants/{id}/assessments/{aid}/evidence/links` | Presigned URL загрузки, регистрация файла (tags), список, download URL, обновление (в т.ч. admin_comment), удаление, связь evidence–assessment (links) |
| **engine** | `POST /tenants/{id}/assessments/{aid}/engine/run`, `GET /.../engine/status`, `GET /.../results/controls`, `.../results/gaps`, `.../results/risks`, `.../results/remediation` | Запуск движка, статус, результаты: контрольные результаты, гэпы, риски, remediation |
| **reports** | `POST /tenants/{id}/reports/packages`, `POST /.../packages/{pkg_id}/generate`, `GET /.../packages`, `GET /.../packages/{pkg_id}`, `GET /.../packages/{pkg_id}/files`, `POST /.../packages/{pkg_id}/publish`, `GET /.../packages/{pkg_id}/download`, `GET /.../files/{fid}/download-url`, `GET /.../files/{fid}/download` | Пакеты: создание, генерация, список, детали, файлы пакета, публикация; скачивание: presigned URL пакета, presigned одного файла, **stream одного файла** (скачивание через backend) |
| **templates** | `GET /tenants/{id}/templates`, `POST /tenants/{id}/templates/{control_id}` | Список шаблонов по контролям, генерация PDF-шаблона по control_id |
| **training** | `GET /tenants/{id}/training/modules`, `POST .../modules`, `GET .../modules/{mid}/questions`, `GET .../assignments`, `POST .../assignments`, `POST .../assignments/{aid}/complete`, `GET .../assignments/{aid}/certificate` | Модули обучения, вопросы, назначения, завершение, сертификат (URL) |
| **workforce** | `GET/POST /tenants/{id}/workforce/employees`, `GET/PUT/DELETE .../employees/{eid}`, `GET .../csv-template`, `POST .../import-csv`, `GET .../export-csv`, `GET/POST .../assignments`, `POST .../assignments/{aid}/send-invite`, `POST .../assignments/{aid}/complete`, `GET .../certificates`, `GET .../certificates/verify`, `GET .../certificates/{cid}/download`, `GET .../stats` | Сотрудники CRUD, CSV template/import/export, назначения обучений, приглашения, завершение (→ сертификат + EvidenceFile HIPAA-PR-06), сертификаты и верификация, статистика |
| **notifications** | `POST /tenants/{id}/notifications`, `GET /tenants/{id}/notifications`, `PATCH /tenants/{id}/notifications/{nid}/read` | Создание, список, отметка прочтения |
| **audit** | `GET /tenants/{id}/audit-events` | Список событий аудита (фильтр по типу, дате и т.д.) |
| **internal** | `POST /internal/seed-demo-client` | Сид демо-клиента (внутренний хелпер) |
| **ingest** | `GET /ingest/receipts`, `GET /ingest/receipts/{rid}`, `POST /ingest/packages` | Приём пакетов из внешнего ingest-сервиса (receipts, приём пакета) |
| **ingest_proxy** | (прокси к внешнему INGEST_BASE_URL) | Проксирование запросов к ingest-сервису |

### 4.2 Модели данных (SQLAlchemy)

**Ядро (models/models.py):**  
Tenant, User, TenantMember, Framework, ControlsetVersion, Control, RulesetVersion, Rule, Question, Assessment, Answer, EvidenceFile, EvidenceLink, ControlResult, Gap, Risk, RemediationAction, ReportPackage, ReportFile, Notification, AuditEvent.

**Workforce (models/workforce.py):**  
Employee, TrainingCertificate, EmployeeTrainingAssignment, WorkforceImportLog.

**Training (models/training.py):**  
TrainingModule, TrainingQuestion, TrainingAssignment, TrainingCompletion.

**Ingest (models/ingest.py):**  
IngestReceipt.

### 4.3 Сервисы (бизнес-логика)

| Сервис | Назначение |
|--------|------------|
| **engine** | Движок соответствия: 7 паттернов правил (PATTERN_1_BINARY_FAIL … PATTERN_7_COMPOUND), маппинг ответов и наличия доказательств → ControlResult (Pass/Partial/Fail/Unknown), создание Gap, Risk, RemediationAction по шаблонам. Идемпотентный перезапуск (удаление старых результатов и создание новых). |
| **submit_gate** | Проверка перед submit: (1) доля отвеченных вопросов ≥ 70% (SUBMIT_COMPLETENESS_THRESHOLD), (2) все критические вопросы заполнены, (3) для C1-Q2 и C4-Q1 значение не N/A. Критические коды: A1-Q1, A3-Q2, C1-Q1, C4-Q1, D1-Q2, C1-Q2. При ошибке — HTTP 400 с детальным payload (answered_ratio, missing_critical, na_forbidden). |
| **report_generator** | Генерация всех 5 файлов пакета: executive_summary (PDF, с опциональным LLM-нарративом), gap_register, risk_register, roadmap, evidence_checklist (XLSX). Использует контрольные результаты, гэпы, риски, remediation, evidence links. Защита от None в полях, XML-экранирование в PDF, проверка на пустые control results. |
| **storage** | Presigned URL для загрузки/скачивания MinIO, генерация ключей (evidence, reports), **get_object_bytes** — чтение объекта из MinIO в память для stream-скачивания через API. |
| **audit** | log_event(tenant_id, user_id, event_type, entity_type, entity_id, payload, ip). |
| **answer_validator** | Валидация формата ответов (choice, N/A, date и т.д.). |
| **template_generator** | PDF-шаблоны по control_id для сбора доказательств (ReportLab). |
| **certificate_generator** | Генерация PDF сертификатов обучения (в т.ч. workforce). |
| **email_service** | Отправка писем (приглашения на обучение и т.д.). |
| **workforce_scheduler** | Логика назначений и напоминаний по workforce. |
| **seed_demo** | Сидирование демо-данных. |
| **ingest_proxy_service** | Взаимодействие с внешним ingest API. |

---

## 5. Submit Gate (проверка перед отправкой оценки)

- **Порог полноты:** ответы на ≥ 70% активных вопросов фреймворка (настраивается через `SUBMIT_COMPLETENESS_THRESHOLD`).
- **Критические вопросы:** все 6 кодов (A1-Q1, A3-Q2, C1-Q1, C4-Q1, D1-Q2, C1-Q2) должны быть заполнены; для C1-Q2 (MFA) и C4-Q1 (Encryption in transit) ответ «N/A» запрещён.
- **Поведение:** при вызове `POST .../assessments/{id}/submit` вызывается `run_submit_gate`; при неудаче — 400 с структурой (например `answered_ratio`, `missing_critical`, `na_forbidden`). На фронте в TenantDetail при ошибке submit отображается расшифровка (сколько процентов, какие критические пропущены).

**Испытано:** логика в submit_gate проверялась при доработке сообщений об ошибках в UI; порог и список критических вопросов заданы в config.

---

## 6. Движок соответствия (Compliance Engine)

- **Вход:** оценка (assessment_id), ответы на вопросы (Answer), наличие доказательств по контролю (EvidenceLink.control_id).
- **Правила:** загружаются Rule по ruleset_version оценки; у каждого правила — тип паттерна (1–7), question_id, ожидаемое значение, template_id для remediation и т.д.
- **Паттерны:** Binary Fail (No → Fail), Partial (Partial → Partial, No → Fail), Date (временная валидность 12 мес.), Evidence Dependent (Yes без evidence → Partial), N/A Valid, Time Bound, Compound (несколько вопросов, в v1 первый вопрос задаёт результат).
- **Выход:** ControlResult (по каждому контролу), Gap (по каждому не-Pass), Risk (1:1 с gap), RemediationAction (одно или несколько на gap). Severity выставляется по правилам и шаблонам.
- **Идемпотентность:** при повторном запуске старые ControlResult, Gap, Risk, RemediationAction для этой оценки удаляются и создаются заново.

**Испытано:** запуск движка после заполнения анкеты и загрузки доказательств; появление контрольных результатов, гэпов, рисков и remediation в Engine Results; использование этих данных при генерации отчётов.

---

## 7. Доказательства (Evidence)

- **Загрузка:** клиент получает presigned URL (`evidence/upload-url`), загружает файл PUT в MinIO, затем регистрирует файл (`POST /evidence`) с `storage_key`, `file_name`, `content_type`, `size_bytes`, **tags** (массив, обычно один элемент — код контрола, например `HIPAA-ID-01`). Ограничения: типы PDF, DOCX, XLSX, PNG, JPEG; размер до 25 MB.
- **Связь с оценкой:** `POST .../evidence/links` создаёт EvidenceLink (assessment_id, evidence_file_id, control_id опционально). На клиентском UI загрузка идёт в контексте карточки контроля — в tags передаётся controlId.
- **Группировка на клиенте:** список файлов по тенанту; группировка по тегам (tag = controlId) для отображения «файлы по контролю».
- **Рецензирование:** внутренний пользователь может оставить `admin_comment` (PATCH evidence); на клиенте отображаются статусы «In Review» / «Need Attention» и комментарий.
- **Содержимое:** не анализируется; тип документа (например «перечень оборудования») не определяется. Запланировано на следующий уровень с LLM (см. ROADMAP-LLM-EVIDENCE.md).

**Испытано:** загрузка файлов с клиентского портала, привязка к контролам, отображение в Evidence Vault и в Evidence Review; использование факта наличия доказательств в движке и в evidence_checklist отчёта.

---

## 8. Отчёты (Reports)

- **Пакет (ReportPackage):** создаётся для оценки, статусы `draft` → `published`. После публикации пакет неизменяем; клиент видит только пакеты со статусом `published`.
- **Файлы пакета:** Executive Summary (PDF), Gap Register (XLSX), Risk Register (XLSX), Remediation Roadmap (XLSX), Evidence Checklist (XLSX). Генерация вызывается через `POST .../packages/{id}/generate`; при успехе создаются записи ReportFile и файлы в MinIO.
- **Executive Summary:** текстовая часть + опционально AI-нарратив (Claude), если включён LLM. ReportLab; защита от None в gap.description, XML-экранирование.
- **Скачивание:**  
  - **По одному файлу:** кнопка «Download» в списке файлов пакета вызывает `GET .../files/{file_id}/download` — backend читает файл из MinIO через `storage.get_object_bytes`, отдаёт поток с `Content-Disposition: attachment` и правильным именем файла. Работает в браузере без доступа к MinIO по имени `minio`.  
  - **Download all:** на внутреннем Reports — запрашивается список файлов пакета, выбирается executive_summary (или первый файл), тот же stream-endpoint используется для скачивания одного файла (основной отчёт). Presigned URL пакета (ZIP) не используется для «Download all», т.к. presigned указывает на minio:9000 и в браузере на хосте не открывается.
- **Ошибки генерации:** при 500 в модальном окне генерации (Engine Results / Reports) отображается сообщение об ошибке с бэкенда; предложение проверить логи и MinIO.

**Испытано:** создание пакета, генерация (в т.ч. после исправления ошибки `notes` у ReportPackage и усиления report_generator), публикация; скачивание отдельных файлов и Executive Summary через stream; проверка, что клиент видит только опубликованные пакеты.

---

## 9. Workforce

- **Сущности:** Employee (имя, email, тенант и т.д.), EmployeeTrainingAssignment (сотрудник, модуль/назначение, срок, статус), TrainingCertificate (после завершения обучения), WorkforceImportLog (результаты CSV-импорта).
- **Функции:** CRUD сотрудников, скачивание CSV-шаблона, импорт CSV (массовое создание сотрудников), экспорт CSV; создание назначений на обучение, отправка приглашений (email_service); завершение назначения → создание сертификата (certificate_generator) и привязка доказательства к контролу HIPAA-PR-06 (EvidenceFile + EvidenceLink).
- **Сертификаты:** список, верификация по номеру/хешу, скачивание PDF. Статистика по тенанту (всего сотрудников, завершённых, просроченных и т.д.).
- **Клиентский UI:** вкладки Overview, Employees, Assignments, Certificates; внутренний — управление workforce в контексте клиента и страница **Training Status** (выбор тенанта, таблица сотрудников × назначения с статусами Completed / Overdue / Not completed).

**Испытано:** добавление сотрудников, импорт/экспорт CSV, назначения, завершение с созданием сертификата и доказательства; отображение на клиенте и в Training Status.

---

## 10. Training (модули и назначения)

- **Сущности:** TrainingModule, TrainingQuestion, TrainingAssignment (назначение на модуль для пользователя/группы), TrainingCompletion.
- **API:** список модулей, создание модуля, вопросы модуля, список назначений, создание назначения, завершение назначения, получение URL сертификата. Отдельно от workforce: здесь — общие обучающие модули и назначения; workforce — привязка к сотрудникам и сертификаты с привязкой к HIPAA-PR-06.

**Испытано:** использование в связке с workforce и клиентским разделом Training.

---

## 11. SRA Assessment

- Отдельный анкетный поток (SRA — Security Risk Assessment). Страница внутреннего портала: SRAAssessment. Данные и маппинг секций SRA к evidence-контролям заданы в `frontend/src/data/sraAssessment.ts` и `hipaaEvidence.ts` (sraToEvidenceMap).

**Испытано:** наличие UI и маршрута; детальная проверка всех секций SRA не описывается здесь.

---

## 12. Communications и Notifications

- **Notifications:** создание уведомления (тип, subject, message, target_user_id, control_id, due_date), список по тенанту, отметка прочтения. Модель Notification в БД.
- **Communications:** страница внутреннего портала для коммуникаций с клиентом (список, создание и т.д. — в объёме реализованного UI).

**Испытано:** API уведомлений и наличие страницы Communications.

---

## 13. Audit

- События логируются через `audit.log_event`: тип (например `evidence_uploaded`, `report_download`, `login`), tenant_id, user_id, entity_type, entity_id, payload (JSON), IP. Хранение в таблице AuditEvent.
- **API:** `GET /tenants/{id}/audit-events` с фильтрацией. Страница Audit Log во внутреннем портале.

**Испытано:** запись событий при загрузке доказательств, скачивании отчётов, входе; просмотр лога на странице Audit.

---

## 14. Ingest и Ingest Proxy

- **Ingest:** приём пакетов из внешнего сервиса (API receipts, приём пакета). Модель IngestReceipt; конфиг INGEST_BASE_URL, INGEST_API_KEY.
- **Ingest proxy:** проксирование запросов к внешнему ingest-сервису. Используется при необходимости интеграции с внешней системой приёма данных.

**Испытано:** наличие маршрутов и сервиса; полная сквозная проверка с внешним сервисом зависит от окружения.

---

## 15. Frontend — маршруты и страницы

- **Логин:** `/login`, `/` → LoginPage.
- **Internal:** `/internal` (layout с навигацией).  
  - Dashboard, Tenants, Tenants/:tenantId (TenantDetail), Tenants/:tenantId/assessments/:assessmentId/results (EngineResults), Evidence Review, Reports, Communications, SRA, Evidence Checklist, Training Status, Audit.
- **Client:** `/client/:tenantId` (layout с навигацией клиента).  
  - Overview, Onboarding, Assessment, Evidence, Training, Workforce, Reports, Settings.

Редирект: если клиент не прошёл onboarding (флаг у тенанта), переход на `/client/:tenantId/onboarding` до завершения.

**Испытано:** навигация по обоим порталам, переходы между страницами, отображение данных с API; форма Assessment с автосохранением; Evidence с загрузкой и тегами; Reports со stream-скачиванием; TenantDetail с Submit и отображением ошибки gate; Engine Results с модальным окном генерации и сообщением об ошибке при 500.

---

## 16. Что испытано на практике (кратко)

- **Сборка и запуск:** Docker Compose поднимает postgres, minio, backend, frontend; миграции и сиды выполняются; логин internal_user работает.
- **Тенанты и оценки:** создание тенанта, приглашение пользователя, создание оценки, прогресс по ответам.
- **Submit Gate:** при недозаполнении (например &lt; 70% или пустые критические вопросы) submit возвращает 400; в UI показывается детальное сообщение (процент, список критических).
- **Движок:** после submit и run engine появляются контрольные результаты, гэпы, риски, remediation; они отображаются на Engine Results.
- **Генерация отчётов:** создание пакета, генерация (все 5 файлов), при ошибке — сообщение в модальном окне; после исправления ошибок в report_generator и reports API генерация проходит успешно.
- **Скачивание отчётов:** скачивание по одному файлу через stream и «Download all» (Executive Summary) через тот же механизм — файлы сохраняются с корректными именами без открытия MinIO в браузере.
- **Доказательства:** загрузка с клиентского портала, привязка к контролу (теги), отображение в Evidence Vault и в отчёте evidence_checklist.
- **Workforce:** CRUD сотрудников, CSV import/export, назначения, завершение с сертификатом и доказательством HIPAA-PR-06; Training Status по клиенту.
- **Язык UI:** меню и основные подписи в приложении на английском (русские тексты убраны в рамках доработок).

---

## 17. Что не реализовано и не испытано

- **Автотесты:** в репозитории нет юнит/интеграционных тестов (нет файлов test*.py и настроенного test runner в описании).
- **Классификация документов по содержимому:** не реализована; планируется с LLM (ROADMAP-LLM-EVIDENCE.md).
- **Проверка отчётов и запросы к клиенту:** нет цикла «уточнение → ответ клиента → перегенерация»; только однократная генерация и публикация.
- **E2E-тесты в браузере:** не описаны в кодовой базе.
- **Нагрузочное тестирование:** не проводилось.

---

## 18. Конфигурация (важные переменные)

- `SECRET_KEY` — обязателен для JWT.
- `SUBMIT_COMPLETENESS_THRESHOLD` — порог полноты (по умолчанию 0.70).
- `CRITICAL_QUESTION_CODES` — список кодов критических вопросов (config.py).
- `ANTHROPIC_API_KEY`, `LLM_ENABLED` — для AI-нарратива в Executive Summary.
- `MAX_UPLOAD_SIZE_BYTES` (25 MB), `ALLOWED_CONTENT_TYPES` — лимиты загрузки доказательств.
- `STORAGE_*` — MinIO (endpoint, ключи, bucket). На хосте консоль MinIO: http://localhost:9001.

---

*Документ актуален на момент написания и дополняет CURRENT-STATE.md и ROADMAP-LLM-EVIDENCE.md.*
