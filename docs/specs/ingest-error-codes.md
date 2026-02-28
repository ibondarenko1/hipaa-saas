# Ingest / upload error codes

Agent-side (local) and server-side error codes used for diagnostics and queue state.

## Agent-side local error codes (CONFIG_*)

These are set by the agent **before** any HTTP request when runtime configuration is invalid. The package is marked **TERMINAL_REJECTED** and moved to `archive\rejected\YYYY-MM\`. No retries.

| Code | Meaning |
|------|--------|
| `CONFIG_UPLOAD_ENABLED_BUT_ENDPOINT_MISSING` | `upload.enabled=true` but `upload.endpoint_url` is blank |
| `CONFIG_UPLOAD_ENABLED_BUT_API_KEY_MISSING` | `upload.enabled=true` but `upload.api_key` is blank |
| `CONFIG_SIGNING_REQUIRED_BUT_DISABLED` | `signing.require_signing=true` but `signing.enabled=false` |
| `CONFIG_SIGNING_REQUIRED_BUT_KEY_ID_MISSING` | Signing required but `signing.key_id` is blank |
| `CONFIG_SIGNING_REQUIRED_BUT_HMAC_MISSING` | Signing required but `signing.hmac_key` is blank |
| `CONFIG_SECRET_REVOKED_API_KEY` | Config uses `upload.api_key_secret_name` and that secret has a revoke marker |
| `CONFIG_SECRET_REVOKED_SIGNING_HMAC` | Config uses `signing.hmac_secret_name` and that secret has a revoke marker |

**Fix:** Correct `agent.config.json` (or the profile/ENV that feeds it), then re-apply profile or rotate secrets as needed.

## Server-side error codes

Defined by the ingest API (e.g. in `ErrorResponse.code`). Examples: `UNAUTHORIZED`, `VALIDATION_ERROR`, `PACKAGE_HASH_MISMATCH`, `SERVICE_UNAVAILABLE`. See the ingest API contract for the full list.
