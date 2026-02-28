# Ingest Proxy API (SaaS Backend → Ingest Service)

Frontend calls SaaS backend only; backend proxies to ingest service with `X-API-Key`. Browser never sees the ingest API key.

## Endpoints

Base path: `/api/v1/internal` (same as other internal routes).

### 1) List receipts (by clinic)

```
GET /api/v1/internal/clinics/{clinicId}/ingest/receipts?limit=50&status=ACCEPTED|REJECTED
```

- `clinicId` — SaaS tenant (clinic) ID.
- `limit` — optional, 1–200, default 50.
- `status` — optional filter: `ACCEPTED` or `REJECTED` (applied server-side after upstream response).

**Response 200**

```json
{
  "clinic_id": "cln_123",
  "client_org_id": "demo-clinic-01",
  "items": [
    {
      "receipt_id": "ING-20260225-ABC123DEF456",
      "status": "ACCEPTED",
      "duplicate": false,
      "received_at_utc": "2026-02-25T21:10:00Z",
      "agent_version": "0.1.0-mvp",
      "error_code": null
    }
  ]
}
```

### 2) Receipt details

```
GET /api/v1/internal/clinics/{clinicId}/ingest/receipts/{receiptId}
```

Backend checks that `receipt.client_org_id` matches the clinic’s `client_org_id`; otherwise 404 (INGEST_PROXY_FORBIDDEN_MISMATCH).

**Response 200**

```json
{
  "clinic_id": "cln_123",
  "client_org_id": "demo-clinic-01",
  "receipt": {
    "receipt_id": "ING-20260225-ABC123DEF456",
    "client_org_id": "demo-clinic-01",
    "idempotency_key": "SUMMIT-demo-clinic-01-1A2B3C4D5E6F7890",
    "package_hash_sha256": "ABCD...64HEX",
    "agent_version": "0.1.0-mvp",
    "status": "REJECTED",
    "duplicate": false,
    "error_code": "INVALID_MANIFEST_SIGNATURE",
    "message": "Manifest signature verification failed.",
    "server_request_id": "srv-req-4f2d9f3a",
    "received_at_utc": "2026-02-25T21:12:00Z",
    "last_seen_at_utc": "2026-02-25T21:12:00Z",
    "hit_count": 1
  }
}
```

## Error response (all proxy errors)

Same shape for 4xx/5xx:

```json
{
  "error": {
    "code": "CODE",
    "message": "Human-readable message",
    "details": { "upstream_status": 503 }
  }
}
```

**Codes**

| Code | HTTP | Meaning |
|------|------|---------|
| CLINIC_NOT_FOUND | 404 | Tenant (clinic) id not found. |
| CLINIC_NO_CLIENT_ORG_ID | 404 | Clinic has no `client_org_id` mapping. |
| INGEST_PROXY_UNAUTHORIZED | 502 | Ingest service rejected API key. |
| INGEST_PROXY_UPSTREAM_ERROR | 502 | Ingest returned non-2xx or proxy not configured. |
| INGEST_PROXY_RECEIPT_NOT_FOUND | 404 | Receipt id not found in ingest. |
| INGEST_PROXY_FORBIDDEN_MISMATCH | 404 | Receipt does not belong to this clinic. |

## Backend config

- `INGEST_BASE_URL` — e.g. `https://ingest.example.com`
- `INGEST_API_KEY` — secret, server-side only.
- Tenant `client_org_id` — set per tenant (clinic) for ingest agent org id.

## TypeScript types (frontend)

```ts
// List
export type ProxyReceiptListItem = {
  receipt_id: string;
  status: "ACCEPTED" | "REJECTED";
  duplicate: boolean;
  received_at_utc: string;
  agent_version: string;
  error_code: string | null;
};

export type ProxyReceiptListResponse = {
  clinic_id: string;
  client_org_id: string;
  items: ProxyReceiptListItem[];
};

// Details
export type ProxyReceiptDetailsResponse = {
  clinic_id: string;
  client_org_id: string;
  receipt: {
    receipt_id: string;
    client_org_id: string;
    idempotency_key: string;
    package_hash_sha256: string;
    agent_version: string;
    status: "ACCEPTED" | "REJECTED";
    duplicate: boolean;
    error_code: string | null;
    message: string | null;
    server_request_id: string | null;
    received_at_utc: string;
    last_seen_at_utc: string;
    hit_count: number;
  };
};

// Error
export type ProxyErrorResponse = {
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown> | null;
  };
};
```

## Minimal frontend usage

```ts
// list
const r = await fetch(`/api/v1/internal/clinics/${clinicId}/ingest/receipts?limit=50`);
const data: ProxyReceiptListResponse = await r.json();

// details
const d = await fetch(`/api/v1/internal/clinics/${clinicId}/ingest/receipts/${receiptId}`);
const details: ProxyReceiptDetailsResponse = await d.json();
```
