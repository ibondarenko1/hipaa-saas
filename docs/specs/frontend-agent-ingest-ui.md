# Frontend MVP: Clinic Local Agent Ingest

## Goal
Provide MSP/clinic with visibility into whether sanitized packages are arriving to SaaS and why any uploads are rejected.

## Pages

### 1) Clinic → Local Agent (Status)
Route: /clinics/{clinicId}/agent

Data source (server-side proxy):
- GET /api/v1/internal/clinics/{clinicId}/ingest/receipts?limit=50

Table columns:
- received_at (localized)
- status (ACCEPTED/REJECTED)
- duplicate (badge)
- agent_version
- error_code (if any)
- action: View details

Controls:
- Refresh button
- Optional auto-refresh (60s)
- Optional filter: status

### 2) Receipt Details
Route: /clinics/{clinicId}/agent/receipts/{receipt_id}

Data source:
- GET /api/v1/internal/clinics/{clinicId}/ingest/receipts/{receipt_id}

Fields:
- receipt_id
- client_org_id
- status
- duplicate
- idempotency_key
- package_hash_sha256
- agent_version
- received_at_utc
- last_seen_at_utc
- hit_count
- server_request_id
- error_code + message (if rejected)

If rejected: show "What to do" guidance mapped by error_code.

### 3) Setup (optional MVP)
Route: /clinics/{clinicId}/agent/setup

Show:
- client_org_id
- signing key_id
- copyable command template to apply profile and install agent (without secrets)

## Error Code Guidance (MVP)
Map ingest error codes to short remediation steps (frontend dictionary).

| Code | What to do |
|------|------------|
| UNAUTHORIZED | Проверь API key на сервере / tenant policy. Агент не виноват. |
| PACKAGE_HASH_MISMATCH | Пакет повреждён/подменён. Проверь транспорт, proxy, повтори отправку. |
| INVALID_ZIP | Пакет не распознаётся. Проверь сборку агента/zip. |
| MISSING_MANIFEST | Агент собрал пакет без manifest. Проверь версию агента. |
| INVALID_MANIFEST | Manifest не соответствует policy (санитизация, client_org mismatch). |
| MISSING_MANIFEST_SIGNATURE | Signing required. Включи signing и перегенерируй HMAC key_id/key. |
| INVALID_MANIFEST_SIGNATURE | HMAC key mismatch. Проверь key_id на агент/сервер, проверь секрет. |
| IDEMPOTENCY_CONFLICT | С одним idempotency пришёл другой пакет. Проверь queue/повторную упаковку. |
| UNSUPPORTED_MEDIA_TYPE | Контент должен быть application/zip. Проверь upload adapter. |

Summary (English for spec):
- INVALID_MANIFEST_SIGNATURE → check key_id and HMAC secret alignment
- MISSING_MANIFEST_SIGNATURE → enable signing in agent profile; ensure server SIGNING_REQUIRED true
- PACKAGE_HASH_MISMATCH → transport tamper/corruption; resend package
- IDEMPOTENCY_CONFLICT → key reuse with different package; investigate queue/resend behavior
- INVALID_MANIFEST → client_org mismatch or compliance assertions fail; check agent sanitize settings

## Backend Proxy (SaaS)
Browser must NOT receive ingest service API key. Frontend calls SaaS backend only.

| Frontend needs | SaaS backend endpoint | Backend action |
|----------------|------------------------|----------------|
| List receipts  | GET /api/v1/internal/clinics/:clinicId/ingest/receipts?limit=50 | Resolve clinicId → client_org_id; call ingest GET /api/v1/ingest/receipts?client_org_id=... with X-API-Key; return JSON |
| Receipt details| GET /api/v1/internal/clinics/:clinicId/ingest/receipts/:receiptId | Call ingest GET /api/v1/ingest/receipts/:receiptId with X-API-Key; return JSON |

Backend stores INGEST_API_KEY and optional ingest base URL; maps clinic (tenant) to client_org_id from DB/CRM.

## Security
- Browser must NOT receive ingest service API key.
- Use SaaS backend proxy: calls ingest with X-API-Key server-side, maps clinicId → client_org_id, returns only receipt/status data.
