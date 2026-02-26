export type ReceiptStatus = "ACCEPTED" | "REJECTED";

export type ReceiptRow = {
  receipt_id: string;
  client_org_id: string;
  idempotency_key: string;
  package_hash_sha256: string;
  agent_version: string;
  status: ReceiptStatus;
  duplicate: boolean;
  error_code: string | null;
  message: string | null;
  server_request_id: string | null;
  received_at_utc: string;
  last_seen_at_utc: string;
  hit_count: number;
};

export type ErrorResponse = {
  status: "REJECTED" | "ERROR";
  code: string;
  message: string;
  request_id?: string;
  client_org_id?: string;
  idempotency_key?: string;
  details?: Record<string, unknown>;
};
