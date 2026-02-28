# Полное описание: Local Agent и Ingest (что уже построено)

Описывается цепочка от локального агента у клиники до видимости в SaaS: приём пакетов, верификация, сохранение receipt’ов и отображение статуса во фронтенде.

---

## 1. Роль агента в архитектуре

**Local Agent** — компонент, который работает на стороне клиники (MSP/клиника):

- Собирает данные (логи, метрики, артефакты) в соответствии с политикой.
- Санитизирует их (удаление PHI/PII по политике, опционально — только метаданные/агрегаты).
- Формирует **ZIP-пакет** с обязательным **manifest.json** и при необходимости **manifest.sig.json** (HMAC подпись).
- Отправляет пакет в **Ingest Service** по HTTPS (заголовки + тело `application/zip`).

Агент в репозитории **не реализован как отдельный исполняемый код**; реализованы:

- **Ingest Service** (Node/Express) — приём, проверка и сохранение receipt’ов.
- **Контракт пакета и API** — формат ZIP, manifest, подпись, заголовки, ответы.
- **SaaS backend proxy** — безопасный доступ к списку и деталям receipt’ов для фронта.
- **Спеки UI** — экраны «Clinic → Local Agent» (Status, Receipt Details, Setup).

Ниже — что именно построено по каждому слою.

---

## 2. Контракт пакета (что агент должен отправлять)

### 2.1 HTTP

- **Метод:** POST  
- **URL:** `{INGEST_BASE_URL}/api/v1/ingest/packages`  
- **Content-Type:** `application/zip`  
- **Тело:** бинарный ZIP (макс. 50 MB).

### 2.2 Обязательные заголовки

| Header | Описание |
|--------|----------|
| `X-API-Key` | Секрет для доступа к ingest (один на MVP, далее — per-tenant). |
| `X-Summit-Client-Org-Id` | Идентификатор организации клиента (то же, что `client_org_id` в SaaS). |
| `X-Summit-Package-Hash-SHA256` | SHA-256 от тела запроса (64 hex). |
| `X-Idempotency-Key` | Ключ идемпотентности (один пакет = один ключ). |
| `X-Summit-Agent-Version` | Версия агента, например `0.1.0-mvp`. |

Опционально: `X-Request-Id`, `X-Summit-Signing-Key-Id`.

### 2.3 Содержимое ZIP

- **manifest.json** (обязательно) — JSON с полями:
  - `client_org_id` — совпадает с заголовком.
  - `idempotency_key` (если есть) — совпадает с заголовком.
  - `compliance.sanitized: true`, `compliance.raw_logs_included: false`.
- **manifest.sig.json** (обязательно при `SIGNING_REQUIRED=true` на сервере):
  - `algorithm: "HMAC-SHA256"`, `key_id`, `signed_file: "manifest.json"`, `signature_base64` (HMAC-SHA256 от содержимого manifest.json, секрет на сервере в `SIGNING_HMAC_KEY_<KEYID>`).

Сервер проверяет: hash тела = заголовок, наличие и валидность manifest, compliance и при включённой политике — подпись.

---

## 3. Ingest Service (Node/Express) — `server/ingest`

Отдельный сервис; развёртывается отдельно (например, Azure Container Apps).

### 3.1 Назначение

- Принимать POST с ZIP.
- Проверять: SHA-256 тела, разбор ZIP, manifest.json, compliance, при необходимости — manifest.sig.json (HMAC).
- Сохранять **receipt** по каждой попытке (ACCEPTED или REJECTED) в Postgres.
- Поддерживать идемпотентность по `(client_org_id, idempotency_key)`.
- Отдавать по запросу: один receipt по `receipt_id` и список по `client_org_id`.

### 3.2 Стек и структура

- **Стек:** Node 22, TypeScript, Express, pg, adm-zip, uuid.
- **Путь:** `server/ingest/`.
- **Скрипты:** `npm run build`, `npm run migrate`, `npm start`, `npm run dev`.

Основные модули:

- `src/index.ts` — точка входа, Express на PORT (по умолчанию 8080).
- `src/routes.ts` — маршруты и проверка `X-API-Key`.
- `src/verify.ts` — проверка ZIP (hash, manifest, compliance, HMAC).
- `src/ingest.ts` — логика приёма: идемпотентность, создание/обновление receipt.
- `src/receipts.ts` — работа с БД (вставка, обновление hit_count, список, выборка по id).
- `src/db.ts` — пул pg, миграции из `migrations/*.sql`.

### 3.3 API (напрямую, с X-API-Key)

| Метод | Путь | Описание |
|-------|------|----------|
| GET | `/health` | Liveness/readiness для оркестратора. |
| POST | `/api/v1/ingest/packages` | Приём ZIP; проверка; создание/обновление receipt; 202 (новый), 200 (replay), 409 (idempotency conflict), 4xx/5xx с кодом ошибки. |
| GET | `/api/v1/ingest/receipts/:receipt_id` | Один receipt (200 или 404). |
| GET | `/api/v1/ingest/receipts?client_org_id=...&limit=...` | Список последних receipt’ов по организации (limit 1–200). |

Ответы при ошибке — JSON с полями в духе `status`, `code`, `message`, `details`; при REJECTED receipt всё равно сохраняется, в заголовках возвращаются `X-Receipt-Id`, `X-Request-Id`.

### 3.4 Модель данных (Postgres)

Таблица **ingest_receipts** (миграция `migrations/001_create_ingest_receipts.sql`):

- `receipt_id` (PK), `client_org_id`, `idempotency_key`, `package_hash_sha256`, `agent_version`
- `status` (ACCEPTED | REJECTED), `duplicate` (bool), `error_code`, `message`, `server_request_id`
- `received_at_utc`, `last_seen_at_utc`, `hit_count`

Ограничения:

- `UNIQUE(client_org_id, idempotency_key)` — идемпотентность.
- Индекс по `(client_org_id, received_at_utc DESC)` — список по клинике.

### 3.5 Конфигурация (env)

- `PORT` — порт (по умолчанию 8080).
- `DATABASE_URL` — Postgres (для Azure типично `?sslmode=require`).
- `INGEST_API_KEY` — секрет для заголовка `X-API-Key`.
- `SIGNING_REQUIRED` — `true`/`false`; при `true` обязателен manifest.sig.json.
- `SIGNING_HMAC_KEY_<KEYID>` — секреты HMAC по key_id (например `SIGNING_HMAC_KEY_MSP_DEMO_01`).

### 3.6 Деплой

- **Dockerfile** в `server/ingest/`: multi-stage (build + runtime), образ `node:22-alpine`, в runtime копируются `dist/` и `migrations/`.
- Health для ACA: GET `/health`, порт 8080.
- Миграции: один раз после деплоя (`npm run migrate` или `node dist/db.js migrate` из контейнера).

---

## 4. Коды ошибок ingest (ответ сервера и подсказки для пользователя)

Сервер возвращает в теле поле `code` (и при необходимости сохраняет REJECTED receipt с тем же `error_code`). Рекомендуемые подсказки для UI:

| Code | Подсказка (что делать) |
|------|------------------------|
| UNAUTHORIZED | Проверь API key на сервере / tenant policy. Агент не виноват. |
| PACKAGE_HASH_MISMATCH | Пакет повреждён/подменён. Проверь транспорт, proxy, повтори отправку. |
| INVALID_ZIP | Пакет не распознаётся. Проверь сборку агента/zip. |
| MISSING_MANIFEST | Агент собрал пакет без manifest. Проверь версию агента. |
| INVALID_MANIFEST | Manifest не соответствует policy (санитизация, client_org mismatch). |
| MISSING_MANIFEST_SIGNATURE | Signing required. Включи signing и перегенерируй HMAC key_id/key. |
| INVALID_MANIFEST_SIGNATURE | HMAC key mismatch. Проверь key_id на агент/сервер, проверь секрет. |
| IDEMPOTENCY_CONFLICT | С одним idempotency пришёл другой пакет. Проверь queue/повторную упаковку. |
| UNSUPPORTED_MEDIA_TYPE | Контент должен быть application/zip. Проверь upload adapter. |

Спека кодов и форматов ответов — в `docs/specs/ingest-api-openapi.yaml` и в `docs/specs/frontend-agent-ingest-ui.md`.

---

## 5. SaaS Backend (FastAPI) — proxy и маппинг клиник

Фронтенд **не знает** `INGEST_API_KEY` и не вызывает ingest напрямую. Вызовы идут в SaaS backend, который проксирует их в Ingest Service.

### 5.1 Маппинг клиника → client_org_id

- В модели **Tenant** (клиника/тенант) добавлено поле **client_org_id** (опционально).
- Репозиторий **app/db/tenant_repo.py**: `get_client_org_id_by_clinic_id(session, clinic_id)` возвращает `client_org_id` или `None`.
- Для работы proxy у клиники должен быть заполнен `client_org_id` (то же значение, которое агент передаёт в `X-Summit-Client-Org-Id`).

### 5.2 Proxy API (внутреннее)

Роутер: **app/api/internal/ingest_proxy/** (schemas + router). Префикс в приложении: `/api/v1`.

| Метод | Путь | Описание |
|-------|------|----------|
| GET | `/api/v1/internal/clinics/{clinicId}/ingest/receipts` | Список receipt’ов для клиники. Query: `limit` (1–200), `status` (ACCEPTED \| REJECTED). |
| GET | `/api/v1/internal/clinics/{clinicId}/ingest/receipts/{receiptId}` | Детали одного receipt; проверка владения по `receipt.client_org_id`. |

Ответы — по Pydantic-схемам: `ProxyReceiptListResponse`, `ProxyReceiptDetailsResponse`. Ошибки — единый формат `{ "error": { "code", "message", "details" } }` (коды: CLINIC_NO_CLIENT_ORG_ID, INGEST_PROXY_UNAUTHORIZED, INGEST_PROXY_UPSTREAM_ERROR, INGEST_PROXY_RECEIPT_NOT_FOUND, INGEST_PROXY_FORBIDDEN_MISMATCH и т.д.).

Конфиг бэкенда: `INGEST_BASE_URL`, `INGEST_API_KEY` (в `app/core/config.py`). Вызовы к ingest выполняет **app/services/ingest_proxy_service.py** (httpx, GET с заголовком X-API-Key).

---

## 6. Фронтенд (спека, без реализации в коде)

В **docs/specs/frontend-agent-ingest-ui.md** описано:

- **Цель:** дать MSP/клинике видимость: пакеты дошли или нет, причины отказов, что делать дальше (без SOC-панели и лог-вьюера).

### 6.1 Страницы

1. **Clinic → Local Agent (Status)**  
   - Маршрут: `/clinics/{clinicId}/agent`.  
   - Данные: GET `/api/v1/internal/clinics/{clinicId}/ingest/receipts?limit=50`.  
   - Таблица: received_at (локальное время), status, duplicate (badge), agent_version, error_code, действие «View details».  
   - Кнопка Refresh, опционально авто-обновление 60 с и фильтр по status.

2. **Receipt Details**  
   - Маршрут: `/clinics/{clinicId}/agent/receipts/{receipt_id}`.  
   - Данные: GET `/api/v1/internal/clinics/{clinicId}/ingest/receipts/{receipt_id}`.  
   - Показать все поля receipt; при status=REJECTED — блок «What to do» по таблице кодов ошибок выше.

3. **Setup (опционально)**  
   - Маршрут: `/clinics/{clinicId}/agent/setup`.  
   - Показать client_org_id, key_id для подписи, копируемый шаблон команды установки/профиля (без секретов); секреты вводятся локально (DPAPI/скрипты).

### 6.2 Безопасность

- В браузер не передаётся ingest API key.
- Фронт ходит только в SaaS backend; backend сам вызывает ingest с X-API-Key и маппит clinicId → client_org_id.

---

## 7. Сводка артефактов в репозитории

| Компонент | Путь / описание |
|-----------|------------------|
| Ingest Service (Node) | `server/ingest/` — исходники, Dockerfile, миграции, .env.example |
| Контракт API ingest | `docs/specs/ingest-api-openapi.yaml` |
| Proxy API контракт и типы | `docs/specs/ingest-proxy-api.md` |
| UI спека + коды ошибок | `docs/specs/frontend-agent-ingest-ui.md` |
| SaaS proxy (FastAPI) | `backend/app/api/internal/ingest_proxy/`, `app/db/tenant_repo.py`, `app/services/ingest_proxy_service.py` |
| Tenant.client_org_id | `backend/app/models/models.py`, миграция `007_tenant_client_org_id.py` |
| Конфиг SaaS | `backend/app/core/config.py` — INGEST_BASE_URL, INGEST_API_KEY |

---

## 8. Что уже работает end-to-end

1. Агент (вне репо) формирует ZIP с manifest (и при необходимости manifest.sig.json), считает SHA-256 тела и шлёт POST на ingest с нужными заголовками.
2. Ingest проверяет hash, ZIP, manifest, compliance и подпись (если включено), пишет receipt в Postgres (ACCEPTED или REJECTED), возвращает receipt_id и статус; при повторе по тому же idempotency_key — 200 и duplicate.
3. SaaS backend по запросу фронта вызывает ingest (GET list / GET by id) с X-API-Key и маппингом clinic_id → client_org_id, возвращает данные в формате proxy API.
4. Фронт (по спекам) может показать список приёмов и детали одного receipt с подсказками по error_code.

Локальные ошибки агента (до отправки) в ingest не попадают; они остаются в локальном архиве/диагностике агента (при наличии) и в будущем могут быть вынесены в отдельный сценарий «Agent Diagnostics Upload».
