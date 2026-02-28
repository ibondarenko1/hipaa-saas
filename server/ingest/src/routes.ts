import crypto from "node:crypto";
import express from "express";
import { ingestPackage } from "./ingest.js";
import { getReceiptById, listReceiptsByClient, getReceiptByIdempotency, markReceiptRejected } from "./receipts.js";
import type { ErrorResponse } from "./types.js";
import { verifyZipAndManifest } from "./verify.js";

function newServerRequestId(): string {
  return `srv-${crypto.randomBytes(8).toString("hex")}`;
}

const INGEST_API_KEY = process.env.INGEST_API_KEY ?? "";
if (!INGEST_API_KEY) {
  console.warn("WARN: INGEST_API_KEY is not set. In production this must be set.");
}

function err(res: express.Response, http: number, body: ErrorResponse) {
  res.status(http).json(body);
}

function requireApiKey(req: express.Request, res: express.Response): boolean {
  const apiKey = String(req.header("X-API-Key") ?? "");
  if (!INGEST_API_KEY || apiKey !== INGEST_API_KEY) {
    err(res, 401, { status: "REJECTED", code: "UNAUTHORIZED", message: "Authentication failed." });
    return false;
  }
  return true;
}

function getRequiredHeader(req: express.Request, name: string): string | null {
  const v = req.header(name);
  if (!v) return null;
  const s = String(v).trim();
  return s.length ? s : null;
}

export function buildRouter(): express.Router {
  const r = express.Router();

  // Health
  r.get("/health", (_req, res) => res.status(200).json({ ok: true }));

  // POST ingest package (ZIP + verify hash, manifest, signature; Step 3/6)
  r.post("/api/v1/ingest/packages", express.raw({ type: "*/*", limit: "50mb" }), async (req, res) => {
    if (!requireApiKey(req, res)) return;

    // Content-Type check
    const ct = String(req.header("Content-Type") ?? "").toLowerCase();
    if (!ct.includes("application/zip")) {
      return err(res, 415, {
        status: "REJECTED",
        code: "UNSUPPORTED_MEDIA_TYPE",
        message: "Content-Type must be application/zip.",
        details: { content_type: ct || null }
      });
    }

    const clientOrgId = getRequiredHeader(req, "X-Summit-Client-Org-Id");
    const packageHash = getRequiredHeader(req, "X-Summit-Package-Hash-SHA256");
    const idemKey = getRequiredHeader(req, "X-Idempotency-Key");
    const agentVersion = getRequiredHeader(req, "X-Summit-Agent-Version");

    if (!clientOrgId) return err(res, 400, { status: "REJECTED", code: "MISSING_REQUIRED_HEADER", message: "Missing required header X-Summit-Client-Org-Id.", details: { header: "X-Summit-Client-Org-Id" } });
    if (!packageHash) return err(res, 400, { status: "REJECTED", code: "MISSING_REQUIRED_HEADER", message: "Missing required header X-Summit-Package-Hash-SHA256.", details: { header: "X-Summit-Package-Hash-SHA256" } });
    if (!idemKey) return err(res, 400, { status: "REJECTED", code: "MISSING_REQUIRED_HEADER", message: "Missing required header X-Idempotency-Key.", details: { header: "X-Idempotency-Key" } });
    if (!agentVersion) return err(res, 400, { status: "REJECTED", code: "MISSING_REQUIRED_HEADER", message: "Missing required header X-Summit-Agent-Version.", details: { header: "X-Summit-Agent-Version" } });

    const requestId = String(req.header("X-Request-Id") ?? "").trim() || newServerRequestId();

    const zipBytes = Buffer.isBuffer(req.body) ? (req.body as Buffer) : Buffer.from([]);
    if (!zipBytes.length) {
      return err(res, 400, { status: "REJECTED", code: "INVALID_REQUEST", message: "ZIP body is required." });
    }

    // --- VERIFY: zip hash + manifest + signature policy ---
    const v = verifyZipAndManifest({
      zipBytes,
      headerZipSha256: packageHash,
      headerClientOrgId: clientOrgId,
      headerIdempotencyKey: idemKey
    });

    if (!v.ok) {
      // Persist rejected receipt so frontend can show it
      const receiptId = `ING-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${crypto.randomBytes(6).toString("hex").toUpperCase()}`;

      try {
        await markReceiptRejected({
          receipt_id: receiptId,
          client_org_id: clientOrgId,
          idempotency_key: idemKey,
          package_hash_sha256: packageHash,
          agent_version: agentVersion,
          error_code: v.code,
          message: v.message,
          server_request_id: requestId
        });
      } catch {
        // If DB write fails, still return rejection
      }

      res.setHeader("X-Receipt-Id", receiptId);
      res.setHeader("X-Request-Id", requestId);
      return err(res, v.http, {
        status: "REJECTED",
        code: v.code,
        message: v.message,
        request_id: requestId,
        client_org_id: clientOrgId,
        idempotency_key: idemKey,
        details: v.details
      });
    }

    // Idempotency conflict check (same key, different hash) AFTER real verify
    const existing = await getReceiptByIdempotency(clientOrgId, idemKey);
    if (existing && String(existing.package_hash_sha256).toUpperCase() !== String(v.zipSha256).toUpperCase()) {
      return err(res, 409, {
        status: "REJECTED",
        code: "IDEMPOTENCY_CONFLICT",
        message: "Idempotency key already exists with a different package hash.",
        request_id: requestId,
        client_org_id: clientOrgId,
        idempotency_key: idemKey,
        details: {
          existing_package_hash_sha256: existing.package_hash_sha256,
          incoming_package_hash_sha256: v.zipSha256
        }
      });
    }

    // Now ingest (will insert ACCEPTED or replay); pass payload for report context
    const { receipt, createdNew } = await ingestPackage({
      apiKey: "REDACTED",
      clientOrgId,
      packageHashSha256: v.zipSha256,
      idempotencyKey: idemKey,
      agentVersion,
      signingKeyId: String(req.header("X-Summit-Signing-Key-Id") ?? "").trim() || undefined,
      requestId,
      manifestPayload: v.manifestObj ?? null,
      snapshotData: v.snapshotData ?? null,
    });

    const full = await getReceiptById(receipt.receipt_id);
    const out = full ?? receipt;

    res.setHeader("X-Receipt-Id", out.receipt_id);
    res.setHeader("X-Request-Id", requestId);

    return res.status(createdNew ? 202 : 200).json({
      status: "ACCEPTED",
      receipt_id: out.receipt_id,
      duplicate: createdNew ? false : true,
      client_org_id: out.client_org_id,
      idempotency_key: out.idempotency_key,
      package_hash_sha256: out.package_hash_sha256,
      received_at_utc: out.received_at_utc,
      message: createdNew ? null : "Duplicate idempotent replay; original receipt returned."
    });
  });

  // GET receipt by id
  r.get("/api/v1/ingest/receipts/:receipt_id", async (req, res) => {
    if (!requireApiKey(req, res)) return;
    const receiptId = String(req.params.receipt_id ?? "").trim();
    if (!receiptId) return err(res, 400, { status: "REJECTED", code: "INVALID_REQUEST", message: "receipt_id is required." });

    const row = await getReceiptById(receiptId);
    if (!row) return err(res, 404, { status: "REJECTED", code: "NOT_FOUND", message: "receipt_id not found." });

    return res.status(200).json(row);
  });

  // GET list receipts by client
  r.get("/api/v1/ingest/receipts", async (req, res) => {
    if (!requireApiKey(req, res)) return;

    const clientOrgId = String(req.query.client_org_id ?? "").trim();
    const limit = Number(req.query.limit ?? 50);

    if (!clientOrgId) {
      return err(res, 400, { status: "REJECTED", code: "INVALID_REQUEST", message: "client_org_id query param is required." });
    }

    const items = await listReceiptsByClient(clientOrgId, isNaN(limit) ? 50 : limit);

    // minimal response for frontend list view
    return res.status(200).json({
      client_org_id: clientOrgId,
      items: items.map((x) => ({
        receipt_id: x.receipt_id,
        status: x.status,
        duplicate: x.duplicate,
        received_at_utc: x.received_at_utc,
        agent_version: x.agent_version,
        error_code: x.error_code
      }))
    });
  });

  return r;
}
