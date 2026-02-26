-- Minimal receipt persistence for ingest (PostgreSQL).
-- Run via Alembic migration 006_ingest_receipts; this file is the reference DDL.

CREATE TABLE IF NOT EXISTS ingest_receipts (
    receipt_id          TEXT PRIMARY KEY,
    client_org_id       TEXT NOT NULL,
    idempotency_key     TEXT NOT NULL,
    package_hash_sha256 TEXT NOT NULL,
    agent_version       TEXT,
    status              TEXT NOT NULL,  -- ACCEPTED | REJECTED
    duplicate           BOOLEAN NOT NULL DEFAULT FALSE,
    error_code          TEXT,
    message             TEXT,
    server_request_id   TEXT,
    received_at_utc     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_seen_at_utc    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    hit_count           INTEGER NOT NULL DEFAULT 1
);

CREATE UNIQUE INDEX uix_ingest_receipts_client_idempotency
    ON ingest_receipts (client_org_id, idempotency_key);

CREATE INDEX ix_ingest_receipts_client_received
    ON ingest_receipts (client_org_id, received_at_utc DESC);

CREATE INDEX ix_ingest_receipts_client_org_id
    ON ingest_receipts (client_org_id);
