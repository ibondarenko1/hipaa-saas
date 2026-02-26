# Архитектура summit-local-agent

Описание компонентов локального агента, конфигурации, потоков данных и размещения в репозитории.

---

## 1. Назначение

**summit-local-agent** — компонент, работающий на стороне клиники (или MSP):

- Собирает данные (артефакты, метаданные) по политике.
- Санитизирует (удаление PHI/PII при необходимости).
- Формирует **ZIP-пакет** с **manifest.json** (и при необходимости **manifest.sig.json**).
- Отправляет пакет в **Ingest Service** по HTTPS.

Агент входит в репозиторий **hipaa-saas** (один репо): код агента, установка, сборка и профили развёртывания — всё здесь.

---

## 2. Размещение в репозитории

```
hipaa-saas/
├── agent/                    # Код агента
│   ├── modules/
│   │   └── upload/
│   │       └── uploader.psm1 # Модуль загрузки: валидация конфига, отправка (HTTP)
│   └── tools/                # Утилиты
│       ├── diagnostics.ps1   # Диагностика: конфиг, outbox, архив, задачи, логи
│       ├── cleanup-archive.ps1  # Очистка архива по retention (accepted/rejected)
│       └── resend-outbox.ps1    # Отправка пакетов из outbox в Ingest
├── install/                  # Установка и снятие агента
│   ├── install.ps1           # Регистрация задач, опционально preflight/verify
│   ├── preflight.ps1         # Проверка окружения и конфига перед установкой
│   ├── test-run.ps1          # Тестовый запуск
│   └── uninstall.ps1         # Снятие задач и очистка
├── build/                    # Сборка релиза
│   ├── package-release.ps1   # Упаковка summit-local-agent-v<version>.zip
│   └── verify-release.ps1    # Проверка подписи манифеста и целостности
├── config/
│   └── agent.config.template.json   # Шаблон конфигурации агента
└── deploy/                   # Развёртывание (профили, секреты)
    ├── apply-profile.ps1
    ├── profiles/             # small-clinic, mid-clinic, test-lab
    └── secrets/              # Хранение/ротация секретов (API key, HMAC)
```

Релиз собирается как **summit-local-agent-v\<version\>.zip** (см. `build/package-release.ps1`, `RELEASE_NOTES.md`).

---

## 3. Конфигурация (agent.config.json)

Файл по умолчанию: `C:\ProgramData\SummitAgent\agent.config.json`. Шаблон: `config/agent.config.template.json`.

| Секция | Назначение |
|--------|------------|
| **agent_id**, **client_org_id**, **agent_version** | Идентификация агента и организации (client_org_id совпадает с SaaS/Ingest). |
| **paths** | base_dir, logs_dir, state_dir, work_dir, **outbox_dir** — рабочие каталоги на машине. |
| **upload** | enabled, endpoint_url, api_key — включение отправки и адрес Ingest API. |
| **signing** | enabled, key_id, key_path / hmac_key — подпись manifest (HMAC), если требуется сервером. |
| **archival** | archive_root, archive_accepted, archive_rejected, **retention** (accepted_days, rejected_days). |

При **upload.enabled = true** обязательны endpoint_url и api_key; при требовании подписи сервером — signing (key_id, hmac_key). Ошибки конфигурации приводят к TERMINAL_REJECTED без HTTP-запроса (см. `uploader.psm1`).

---

## 4. Директории на машине (paths)

По умолчанию **base_dir** = `C:\ProgramData\SummitAgent`:

| Каталог | Назначение |
|---------|------------|
| **outbox_dir** | Очередь пакетов к отправке (ZIP + метаданные). Забирает **resend-outbox.ps1**. |
| **archive** (archive_root) | Принятые и отклонённые пакеты: `accepted/YYYY-MM/`, `rejected/YYYY-MM/`. |
| **logs_dir** | Логи агента. |
| **state_dir** | Состояние очередей (например, idempotency_key, статус). |
| **work_dir** | Временные файлы при сборке/подписи. |

---

## 5. Компоненты агента

### 5.1 Модуль загрузки — `agent/modules/upload/uploader.psm1`

- **Get-SummitUploadConfigErrors** — проверка конфига (upload endpoint/key, при необходимости signing). Без валидного конфига HTTP не вызывается.
- **Get-SummitRevokedSecretErrorsIfAny** — проверка, не отозван ли секрет (через deploy/secrets), если используется secret store.
- **Invoke-SummitUpload** — отправка пакета: при ошибках конфига возвращает результат с кодом (например CONFIG_*), иначе в будущем — HTTP POST в Ingest, разбор ответа (ACCEPTED/REJECTED, receipt_id, error_code).

Возвращаемый объект: Mode (LOCAL/HTTP), Status, Success, Duplicate, Retryable, ReceiptId, ErrorCode, Message, IdempotencyKey, PackageHashSha256.

### 5.2 Инструменты — `agent/tools/`

| Скрипт | Назначение |
|--------|------------|
| **diagnostics.ps1** | Сводка: конфиг, outbox (очередь), архив (последние accepted/rejected), запланированные задачи, хвосты логов. Параметры: -AsJson, -SummaryOnly, -BaseDir, -ConfigPath. |
| **cleanup-archive.ps1** | Удаление старых файлов архива по retention (accepted_days, rejected_days). Поддержка -DryRun, -RemoveEmptyFolders. Вызывается по расписанию (см. ниже). |
| **resend-outbox.ps1** | Чтение outbox, вызов Invoke-SummitUpload; при успехе/дубликате — перемещение в archive/accepted; при TERMINAL_REJECTED (в т.ч. CONFIG_*) — в archive/rejected. Обновление состояния очереди. |

### 5.3 Установка — `install/`

- **install.ps1** — preflight (по умолчанию), опционально проверка релиза (verify-release), регистрация **запланированной задачи** «SummitAgent Archive Cleanup» (ежедневно 03:20, запуск cleanup-archive.ps1).
- **preflight.ps1** — проверка ОС, прав, конфига, путей.
- **uninstall.ps1** — снятие задачи и при необходимости очистка.

---

## 6. Поток данных

1. **Сбор** (вне кода репо или будущий сборщик) — формирование артефактов и упаковка в ZIP с manifest.json (и при необходимости manifest.sig.json).
2. **Outbox** — пакет и метаданные попадают в **outbox_dir**.
3. **Отправка** — **resend-outbox.ps1** (вручную или по расписанию) вызывает **Invoke-SummitUpload** для каждого элемента очереди; заголовки (X-Summit-Client-Org-Id, X-API-Key, X-Summit-Package-Hash-SHA256, X-Idempotency-Key, X-Summit-Agent-Version) и тело (ZIP) отправляются в Ingest.
4. **Ingest Service** — приём, проверка hash/manifest/compliance/signature, запись receipt (ACCEPTED/REJECTED), ответ агенту.
5. **Архив** — по ответу пакет перемещается в **archive/accepted** или **archive/rejected** (по retention — accepted_days, rejected_days).
6. **Очистка** — задача **SummitAgent Archive Cleanup** раз в сутки удаляет устаревшие файлы из архива по retention.

Контракт пакета и API Ingest описан в **docs/AGENT-INGEST-OVERVIEW.md** (заголовки, формат ZIP, manifest, коды ошибок).

---

## 7. Запланированная задача

| Имя | Действие | Расписание |
|-----|----------|------------|
| **SummitAgent Archive Cleanup** | `cleanup-archive.ps1 -ConfigPath ... -RemoveEmptyFolders` | Ежедневно 03:20 (локальное время) |

Регистрируется при установке (`install/install.ps1`). Запуск от SYSTEM.

---

## 8. Связь с Ingest и SaaS

- **Ingest Service** (`server/ingest/`) — принимает POST с ZIP, проверяет, пишет receipt в БД. Отдельный сервис (например Azure Container Apps).
- **SaaS backend** — proxy к Ingest (по client_org_id из Tenant); фронт получает список и детали receipt’ов через API внутреннего портала, не зная INGEST_API_KEY.

Подробно: **docs/AGENT-INGEST-OVERVIEW.md**, **docs/specs/ingest-proxy-api.md**, **docs/specs/ingest-error-codes.md**.
