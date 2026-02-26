import { v4 as uuidv4 } from "uuid";
import {
  getReceiptByIdempotency,
  insertReceipt,
  bumpReceiptReplay,
} from "./receipts.js";
import type { ReceiptRow } from "./types.js";

export type IngestRequestHeaders = {
  apiKey: string;
  clientOrgId: string;
  packageHashSha256: string;
  idempotencyKey: string;
  agentVersion: string;
  signingKeyId?: string;
  requestId?: string;
};

export async function ingestPackage(headers: IngestRequestHeaders): Promise<{
  receipt: ReceiptRow;
  createdNew: boolean;
}> {
  // Idempotency lookup
  const existing = await getReceiptByIdempotency(headers.clientOrgId, headers.idempotencyKey);
  if (existing) {
    // If hash mismatch -> conflict (handled in route)
    // Else: replay
    await bumpReceiptReplay(existing.receipt_id);
    const replayed: ReceiptRow = { ...existing, duplicate: true, hit_count: existing.hit_count + 1 };
    return { receipt: replayed, createdNew: false };
  }

  // Create new receipt (ACCEPTED for now; validations wired in Step 4/6)
  const receipt_id = `ING-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${uuidv4().replace(/-/g, "").slice(0, 12).toUpperCase()}`;

  await insertReceipt({
    receipt_id,
    client_org_id: headers.clientOrgId,
    idempotency_key: headers.idempotencyKey,
    package_hash_sha256: headers.packageHashSha256,
    agent_version: headers.agentVersion,
    status: "ACCEPTED",
    duplicate: false,
    error_code: null,
    message: null,
    server_request_id: headers.requestId ?? null,
  });

  // Return the inserted row shape (minimal; fetched full row in route for consistency)
  const receipt: ReceiptRow = {
    receipt_id,
    client_org_id: headers.clientOrgId,
    idempotency_key: headers.idempotencyKey,
    package_hash_sha256: headers.packageHashSha256,
    agent_version: headers.agentVersion,
    status: "ACCEPTED",
    duplicate: false,
    error_code: null,
    message: null,
    server_request_id: headers.requestId ?? null,
    received_at_utc: new Date().toISOString(),
    last_seen_at_utc: new Date().toISOString(),
    hit_count: 1,
  };

  return { receipt, createdNew: true };
}
