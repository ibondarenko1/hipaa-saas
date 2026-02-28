-- Agent payload for report context (manifest + optional snapshot.json)
ALTER TABLE ingest_receipts ADD COLUMN IF NOT EXISTS manifest_payload JSONB;
ALTER TABLE ingest_receipts ADD COLUMN IF NOT EXISTS snapshot_data JSONB;
