# Release Notes

## summit-local-agent v0.1.0-mvp

### Included
- Local collection/sanitization/packaging pipeline
- Upload adapter to OpenAPI ingest contract (HTTP POST to Ingest with X-API-Key, X-Summit-Client-Org-Id, X-Summit-Package-Hash-SHA256, X-Idempotency-Key, X-Summit-Agent-Version)
- Outbox resend worker with retry/backoff; queue state machine (PENDING → ACCEPTED / DUPLICATE_ACCEPTED / TERMINAL_REJECTED / RETRY_SCHEDULED)
- Outbox archival policy (accepted / rejected by month)
- Archival retention cleanup job
- Operator diagnostics command (`diagnostics.ps1` — outbox, queue, archive, tasks, logs; -SummaryOnly, -AsJson)
- **Ingest service** (Node/TypeScript, `server/ingest/`): in docker-compose, port 8080; validates ZIP hash, manifest.json (compliance.sanitized, raw_logs_included), optional signing; stores receipts; GET receipts by client_org_id
- **Agent demo:** `run-agent-demo.ps1` (root) + `agent/tools/create-test-package.ps1` — build test ZIP with anonymized payload, send to Ingest; `.agent-demo/` config and outbox/archive

### Tests and checks
- **install/preflight.ps1** — environment check (PowerShell, admin, execution policy, config); optional release manifest + signature verification
- **install/test-run.ps1** — post-install validation
- **build/verify-release.ps1** — release ZIP hash + manifest signature
- **agent/tools/diagnostics.ps1** — agent state (outbox, queue, archive, scheduled tasks, log tails)
- **Demo flow** — `run-agent-demo.ps1` exercises full path: create package → resend-outbox → Ingest accept; verifies anonymization (manifest + payload without PII)

### Installation
1. Unzip release bundle
2. Edit `config/agent.config.template.json` and create runtime config
3. Run `install\install.ps1` as Administrator
4. Run `install\test-run.ps1`
5. Validate with `agent\tools\diagnostics.ps1`

### Notes
- PowerShell 5.1 compatible
- Designed for MSP-managed deployment
- For local Ingest demo: `docker compose up -d postgres ingest` then `.\run-agent-demo.ps1` (see docs/AGENT-DEMO-RUN.md)
