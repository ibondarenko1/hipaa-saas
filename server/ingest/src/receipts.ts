import { query, exec } from "./db.js";
import type { ReceiptRow, ReceiptStatus } from "./types.js";

export async function getReceiptById(receiptId: string): Promise<ReceiptRow | null> {
  const rows = await query<ReceiptRow>(
    `SELECT * FROM ingest_receipts WHERE receipt_id = $1`,
    [receiptId]
  );
  return rows[0] ?? null;
}

export async function listReceiptsByClient(clientOrgId: string, limit: number): Promise<ReceiptRow[]> {
  const lim = Math.max(1, Math.min(200, limit));
  return await query<ReceiptRow>(
    `SELECT * FROM ingest_receipts
     WHERE client_org_id = $1
     ORDER BY received_at_utc DESC
     LIMIT $2`,
    [clientOrgId, lim]
  );
}

export async function getReceiptByIdempotency(
  clientOrgId: string,
  idempotencyKey: string
): Promise<ReceiptRow | null> {
  const rows = await query<ReceiptRow>(
    `SELECT * FROM ingest_receipts
     WHERE client_org_id = $1 AND idempotency_key = $2`,
    [clientOrgId, idempotencyKey]
  );
  return rows[0] ?? null;
}

export async function insertReceipt(params: {
  receipt_id: string;
  client_org_id: string;
  idempotency_key: string;
  package_hash_sha256: string;
  agent_version: string;
  status: ReceiptStatus;
  duplicate: boolean;
  error_code?: string | null;
  message?: string | null;
  server_request_id?: string | null;
}): Promise<void> {
  const now = new Date().toISOString();
  await exec(
    `INSERT INTO ingest_receipts (
        receipt_id, client_org_id, idempotency_key, package_hash_sha256, agent_version,
        status, duplicate, error_code, message, server_request_id,
        received_at_utc, last_seen_at_utc, hit_count
     ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
    [
      params.receipt_id,
      params.client_org_id,
      params.idempotency_key,
      params.package_hash_sha256,
      params.agent_version,
      params.status,
      params.duplicate,
      params.error_code ?? null,
      params.message ?? null,
      params.server_request_id ?? null,
      now,
      now,
      1,
    ]
  );
}

export async function bumpReceiptReplay(receiptId: string): Promise<void> {
  await exec(
    `UPDATE ingest_receipts
     SET duplicate = TRUE,
         hit_count = hit_count + 1,
         last_seen_at_utc = NOW()
     WHERE receipt_id = $1`,
    [receiptId]
  );
}

export async function markReceiptRejected(params: {
  receipt_id: string;
  client_org_id: string;
  idempotency_key: string;
  package_hash_sha256: string;
  agent_version: string;
  error_code: string;
  message: string;
  server_request_id?: string | null;
}): Promise<void> {
  await insertReceipt({
    receipt_id: params.receipt_id,
    client_org_id: params.client_org_id,
    idempotency_key: params.idempotency_key,
    package_hash_sha256: params.package_hash_sha256,
    agent_version: params.agent_version,
    status: "REJECTED",
    duplicate: false,
    error_code: params.error_code,
    message: params.message,
    server_request_id: params.server_request_id ?? null,
  });
}
