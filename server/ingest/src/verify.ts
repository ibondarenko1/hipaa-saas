import crypto from "node:crypto";
import AdmZip from "adm-zip";

export type VerifyOk = {
  ok: true;
  zipSha256: string;
  manifestBytes: Buffer;
  manifestObj: any;
  sigObj: any | null;
  /** Optional snapshot.json from package (for report context). */
  snapshotData?: Record<string, unknown> | null;
};

export type VerifyFail = {
  ok: false;
  http: number;
  code: string;
  message: string;
  details?: Record<string, unknown>;
};

function canonSha256Hex(hex: string): string {
  const h = String(hex || "").trim();
  if (!/^[a-fA-F0-9]{64}$/.test(h)) throw new Error("invalid sha256 hex");
  return h.toUpperCase();
}

export function sha256Hex(buf: Buffer): string {
  return crypto.createHash("sha256").update(buf).digest("hex").toUpperCase();
}

function timingSafeEq(a: string, b: string): boolean {
  const ab = Buffer.from(a, "utf8");
  const bb = Buffer.from(b, "utf8");
  if (ab.length !== bb.length) return false;
  return crypto.timingSafeEqual(ab, bb);
}

function envBool(name: string, defaultValue: boolean): boolean {
  const v = (process.env[name] ?? "").trim().toLowerCase();
  if (!v) return defaultValue;
  return v === "1" || v === "true" || v === "yes";
}

function keyIdToEnvSuffix(keyId: string): string {
  return keyId.trim().toUpperCase().replace(/[^A-Z0-9]+/g, "_");
}

function resolveHmacSecret(keyId: string): string | null {
  const suffix = keyIdToEnvSuffix(keyId);
  const name = `SIGNING_HMAC_KEY_${suffix}`;
  const v = (process.env[name] ?? "").trim();
  if (v) return v;
  return null;
}

export function verifyZipAndManifest(params: {
  zipBytes: Buffer;
  headerZipSha256: string; // from X-Summit-Package-Hash-SHA256
  headerClientOrgId: string;
  headerIdempotencyKey: string;
}): VerifyOk | VerifyFail {
  // 1) Verify ZIP bytes hash matches header
  let headerHash: string;
  try {
    headerHash = canonSha256Hex(params.headerZipSha256);
  } catch {
    return {
      ok: false,
      http: 400,
      code: "INVALID_HEADER_FORMAT",
      message: "Header X-Summit-Package-Hash-SHA256 must be a 64-character hex SHA-256 value.",
      details: { header: "X-Summit-Package-Hash-SHA256" },
    };
  }

  const computed = sha256Hex(params.zipBytes);
  if (computed !== headerHash) {
    return {
      ok: false,
      http: 422,
      code: "PACKAGE_HASH_MISMATCH",
      message: "X-Summit-Package-Hash-SHA256 does not match uploaded ZIP bytes.",
      details: { expected_hash_sha256: headerHash, computed_hash_sha256: computed },
    };
  }

  // 2) Parse ZIP and extract manifest.json (+ optional manifest.sig.json)
  let zip: AdmZip;
  try {
    zip = new AdmZip(params.zipBytes);
  } catch {
    return { ok: false, http: 422, code: "INVALID_ZIP", message: "Invalid ZIP archive." };
  }

  const manifestEntry = zip.getEntry("manifest.json");
  if (!manifestEntry) {
    return { ok: false, http: 422, code: "MISSING_MANIFEST", message: "manifest.json is required in package." };
  }

  let manifestBytes: Buffer;
  try {
    manifestBytes = manifestEntry.getData();
  } catch {
    return { ok: false, http: 422, code: "INVALID_MANIFEST", message: "Failed reading manifest.json." };
  }

  let manifestObj: any;
  try {
    manifestObj = JSON.parse(manifestBytes.toString("utf8"));
  } catch {
    return { ok: false, http: 422, code: "INVALID_MANIFEST", message: "manifest.json is not valid JSON." };
  }

  // 3) Basic manifest consistency checks (MVP)
  const mClient = String(manifestObj.client_org_id ?? "").trim();
  if (!mClient || mClient !== params.headerClientOrgId) {
    return {
      ok: false,
      http: 422,
      code: "INVALID_MANIFEST",
      message: "manifest.client_org_id must match X-Summit-Client-Org-Id.",
      details: { manifest_client_org_id: mClient, header_client_org_id: params.headerClientOrgId },
    };
  }

  const mIdem = String(manifestObj.idempotency_key ?? "").trim();
  if (mIdem && mIdem !== params.headerIdempotencyKey) {
    return {
      ok: false,
      http: 422,
      code: "INVALID_MANIFEST",
      message: "manifest.idempotency_key must match X-Idempotency-Key when present.",
      details: { manifest_idempotency_key: mIdem, header_idempotency_key: params.headerIdempotencyKey },
    };
  }

  // Compliance assertions (must be sanitized)
  const sanitized = Boolean(manifestObj?.compliance?.sanitized);
  const rawIncluded = Boolean(manifestObj?.compliance?.raw_logs_included);
  if (sanitized !== true || rawIncluded !== false) {
    return {
      ok: false,
      http: 422,
      code: "INVALID_MANIFEST",
      message: "manifest.compliance must assert sanitized=true and raw_logs_included=false.",
      details: { sanitized, raw_logs_included: rawIncluded },
    };
  }

  // 4) Signature policy and verification
  const signingRequired = envBool("SIGNING_REQUIRED", true);

  const sigEntry = zip.getEntry("manifest.sig.json");
  if (signingRequired && !sigEntry) {
    return {
      ok: false,
      http: 422,
      code: "MISSING_MANIFEST_SIGNATURE",
      message: "Tenant policy requires manifest.sig.json.",
      details: { signing_required: true },
    };
  }

  let sigObj: any | null = null;
  if (sigEntry) {
    try {
      sigObj = JSON.parse(sigEntry.getData().toString("utf8"));
    } catch {
      return {
        ok: false,
        http: 422,
        code: "INVALID_MANIFEST_SIGNATURE",
        message: "manifest.sig.json is not valid JSON.",
      };
    }

    const alg = String(sigObj.algorithm ?? "").trim();
    const keyId = String(sigObj.key_id ?? "").trim();
    const signedFile = String(sigObj.signed_file ?? "").trim();
    const sigB64 = String(sigObj.signature_base64 ?? "").trim();

    if (alg !== "HMAC-SHA256" || !keyId || signedFile !== "manifest.json" || !sigB64) {
      return {
        ok: false,
        http: 422,
        code: "INVALID_MANIFEST_SIGNATURE",
        message: "Invalid signature envelope fields.",
        details: { algorithm: alg, key_id: keyId, signed_file: signedFile },
      };
    }

    const secret = resolveHmacSecret(keyId);
    if (!secret) {
      return {
        ok: false,
        http: 422,
        code: "INVALID_MANIFEST_SIGNATURE",
        message: "Signing key_id is not recognized by server (missing secret).",
        details: { key_id: keyId },
      };
    }

    const computedSig = crypto.createHmac("sha256", secret).update(manifestBytes).digest("base64");

    if (!timingSafeEq(computedSig, sigB64)) {
      return {
        ok: false,
        http: 422,
        code: "INVALID_MANIFEST_SIGNATURE",
        message: "Manifest signature verification failed.",
        details: { key_id: keyId, algorithm: alg },
      };
    }
  }

  // Optional: extract snapshot.json for report context (agent data in report)
  let snapshotData: Record<string, unknown> | null = null;
  try {
    const snapshotEntry = zip.getEntry("snapshot.json");
    if (snapshotEntry && !snapshotEntry.isDirectory) {
      const raw = snapshotEntry.getData().toString("utf8");
      snapshotData = JSON.parse(raw) as Record<string, unknown>;
    }
  } catch {
    // ignore
  }

  return {
    ok: true,
    zipSha256: computed,
    manifestBytes,
    manifestObj,
    sigObj,
    snapshotData: snapshotData ?? undefined,
  };
}
