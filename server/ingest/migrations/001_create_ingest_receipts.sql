CREATE TABLE IF NOT EXISTS ingest_receipts (
  receipt_id            TEXT PRIMARY KEY,
  client_org_id         TEXT NOT NULL,
  idempotency_key       TEXT NOT NULL,
  package_hash_sha256   TEXT NOT NULL,
  agent_version         TEXT NOT NULL,
  status                TEXT NOT NULL CHECK (status IN ('ACCEPTED','REJECTED')),
  duplicate             BOOLEAN NOT NULL DEFAULT FALSE,
  error_code            TEXT NULL,
  message               TEXT NULL,
  server_request_id     TEXT NULL,
  received_at_utc       TIMESTAMPTZ NOT NULL,
  last_seen_at_utc      TIMESTAMPTZ NOT NULL,
  hit_count             INT NOT NULL DEFAULT 1
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_ingest_idempotency
  ON ingest_receipts (client_org_id, idempotency_key);

CREATE INDEX IF NOT EXISTS ix_ingest_client_received
  ON ingest_receipts (client_org_id, received_at_utc DESC);
