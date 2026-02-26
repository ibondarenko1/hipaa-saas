.# HIPAA Readiness Platform

<p align="center">
  <img src="https://img.shields.io/badge/FastAPI-0.111-009688?style=flat-square&logo=fastapi" />
  <img src="https://img.shields.io/badge/React-18-61DAFB?style=flat-square&logo=react" />
  <img src="https://img.shields.io/badge/TypeScript-5.6-3178C6?style=flat-square&logo=typescript" />
  <img src="https://img.shields.io/badge/PostgreSQL-16-4169E1?style=flat-square&logo=postgresql" />
  <img src="https://img.shields.io/badge/Docker-Compose-2496ED?style=flat-square&logo=docker" />
  <img src="https://img.shields.io/badge/License-MIT-green?style=flat-square" />
</p>

> A multi-tenant SaaS platform for HIPAA Security Rule readiness assessments — built by **Summit Range Consulting**. Covers the full compliance lifecycle: questionnaire → evidence → engine → report package. This **single repo** also includes **summit-local-agent** (local Windows agent for evidence ingest): code in `agent/`, install/build in `install/`, `build/`, `deploy/`.

---

## Overview

Healthcare organizations face complex HIPAA Security Rule requirements across Administrative, Physical, and Technical safeguards. This platform streamlines the entire readiness assessment process — from client onboarding to AI-assisted report generation.

**Two portals, one platform:**
- **Internal Portal** — Summit Range consultants manage clients, run the compliance engine, review results, and publish reports
- **Client Portal** — Healthcare organizations fill questionnaires, upload evidence, and download immutable compliance reports

---

## Features

- 🏢 **Multi-tenant architecture** — isolated data per client organization
- 📋 **40-control HIPAA framework** — Administrative, Physical, Technical, Vendor safeguards
- 🤖 **Deterministic compliance engine** — 7 rule patterns map answers to Pass/Partial/Fail/Unknown
- 📊 **5-document report package** — Executive Summary (PDF) + Gap/Risk/Remediation/Evidence registers (XLSX)
- 🧠 **AI executive narrative** — Claude generates plain-language summaries (optional)
- 🔒 **Immutable reports** — published packages are locked and versioned
- 📁 **Evidence management** — presigned MinIO uploads linked to controls
- 👥 **RBAC** — `internal_user` vs `client_user` with JWT authentication
- 📝 **Audit trail** — every action logged with user, timestamp, entity

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| API | FastAPI 0.111 + Python 3.12 |
| ORM | SQLAlchemy 2.0 (async) |
| Migrations | Alembic |
| Database | PostgreSQL 16 |
| Object Storage | MinIO (S3-compatible) |
| Auth | JWT — python-jose + passlib/bcrypt |
| Reports | ReportLab (PDF) + openpyxl (XLSX) |
| AI Narrative | Anthropic Claude API (optional) |
| Frontend | React 18 + TypeScript + Vite |
| Styling | TailwindCSS 3 |
| Infrastructure | Docker Compose |

---

## Architecture

```
hipaa-saas/
├── backend/
│   ├── app/
│   │   ├── api/routes/        # auth, tenants, assessments, answers,
│   │   │                      # evidence, engine, reports, audit
│   │   ├── core/              # JWT auth, config
│   │   ├── db/                # async SQLAlchemy session
│   │   ├── models/            # 14 SQLAlchemy models
│   │   ├── schemas/           # Pydantic DTOs
│   │   └── services/          # engine, report_generator, storage,
│   │                          # answer_validator, submit_gate, audit
│   ├── migrations/            # Alembic migrations
│   └── scripts/seed.py        # HIPAA framework seed data
├── frontend/
│   └── src/
│       ├── components/        # UI library + layout
│       ├── hooks/             # useAuth
│       ├── pages/
│       │   ├── internal/      # Dashboard, Tenants, EngineResults, Reports, AuditLog
│       │   └── client/        # Overview, Assessment, Evidence, Reports
│       ├── services/api.ts    # Axios client — all API methods
│       └── types/index.ts     # TypeScript DTOs
├── server/ingest/             # Ingest service (Node/TypeScript): POST packages, verify manifest, store receipts
├── agent/                     # summit-local-agent: upload module, tools (diagnostics, cleanup, resend, create-test-package)
├── install/                   # install, preflight, uninstall, test-run
├── build/                     # package-release, verify-release
├── config/                    # agent.config.template.json
├── deploy/                    # profiles, secrets
└── docker-compose.yml
```

### Local Agent (summit-local-agent)

The repo includes a **Windows local agent** that runs at the clinic (or MSP): it builds ZIP packages with a `manifest.json` (and optional HMAC signature), uploads them to the **Ingest Service**, and archives results by retention.

| Layer | Description |
|-------|-------------|
| **agent/** | Upload module (`uploader.psm1` — config validation, HTTP upload); tools: `diagnostics.ps1`, `cleanup-archive.ps1`, `resend-outbox.ps1`. |
| **install/** | `install.ps1` (preflight, scheduled task registration), `preflight.ps1`, `uninstall.ps1`, `test-run.ps1`. |
| **build/** | `package-release.ps1` → `summit-local-agent-v<version>.zip`; `verify-release.ps1` (manifest signature). |
| **config/** | `agent.config.template.json` — paths (outbox, archive, logs), upload (endpoint, API key), signing, archival retention. |
| **deploy/** | Profiles (small-clinic, mid-clinic, test-lab), secrets (API key, HMAC). |

**Flow:** Packages land in **outbox** → **resend-outbox** sends to **Ingest** (POST with headers `X-Summit-Client-Org-Id`, `X-API-Key`, etc.) → responses move to **archive** (accepted/rejected by month) → **SummitAgent Archive Cleanup** (daily 03:20) deletes by retention (e.g. accepted 90 days, rejected 180 days). Config and secrets are validated before any HTTP call; invalid config yields TERMINAL_REJECTED and archive to rejected.

**Ingest service** (Docker, port 8080): validates ZIP hash, `manifest.json` (including `compliance.sanitized=true`, `raw_logs_included=false`), optional signature; stores receipts; idempotent by `X-Idempotency-Key`.

**Agent demo:** From repo root run `.\run-agent-demo.ps1` (requires `docker compose up postgres ingest`). Creates a test package with anonymized payload and sends it to Ingest. See **docs/AGENT-DEMO-RUN.md**.

**Tests / checks:** `install/preflight.ps1` (environment + optional release verification), `install/test-run.ps1` (post-install check), `build/verify-release.ps1` (ZIP + manifest signature), `agent/tools/diagnostics.ps1` (outbox, queue, archive, logs). Demo flow exercises the full agent → Ingest path.

Full details: **docs/AGENT-ARCHITECTURE.md**. Ingest contract and SaaS proxy: **docs/AGENT-INGEST-OVERVIEW.md**.

---

## Compliance Workflow

```
1.  Tenant Setup     →  internal creates client tenant + invites users
2.  Assessment       →  create HIPAA assessment for the tenant
3.  Questionnaire    →  client answers 40 controls (auto-save per question)
4.  Evidence Upload  →  client uploads PDFs, DOCX, XLSX, images
5.  Submit (Gate 1)  →  70% completion + all critical questions answered
6.  Engine Run       →  internal triggers compliance mapping engine
7.  Review           →  internal reviews gaps, risks, remediation actions
8.  Generate Reports →  PDF executive summary + 4 XLSX registers created
9.  Publish (Gate 2) →  package locked, client portal access granted
10. Download         →  client downloads immutable compliance reports
```

---

## Quick Start

### Prerequisites
- Docker Desktop
- (Optional) Anthropic API key for AI narratives

### Run

```bash
# 1. Clone
git clone https://github.com/ibondarenko1/hipaa-saas.git
cd hipaa-saas

# 2. Configure
cp .env.example .env
# Edit .env — set SECRET_KEY and optionally ANTHROPIC_API_KEY

# 3. Start
docker-compose up --build
```

**Important — data safety:** To avoid losing clients and data, **do not** run `docker compose down -v` unless you intend to reset the database. Use `docker compose down` (without `-v`) to stop containers and keep data. Before any risky operation, run `.\backup-db.ps1` to create a backup (see [docs/DATA-SAFETY.md](docs/DATA-SAFETY.md)).

```bash
# 4. Access
# Frontend:      http://localhost:5173
# API docs:      http://localhost:8000/docs
# MinIO console: http://localhost:9001
```

### Default Login
```
Email:    admin@summitrange.com
Password: Admin1234!
```

---

## API Reference

Full interactive documentation available at `http://localhost:8000/docs` (Swagger UI).

| Group | Base Path |
|-------|-----------|
| Auth | `/api/v1/auth` |
| Tenants | `/api/v1/tenants` |
| Frameworks | `/api/v1/frameworks` |
| Assessments | `/api/v1/tenants/{id}/assessments` |
| Answers | `/api/v1/tenants/{id}/assessments/{id}/answers` |
| Evidence | `/api/v1/tenants/{id}/evidence` |
| Engine | `/api/v1/tenants/{id}/assessments/{id}/engine` |
| Results | `/api/v1/tenants/{id}/assessments/{id}/results` |
| Reports | `/api/v1/tenants/{id}/reports` |
| Audit | `/api/v1/tenants/{id}/audit-events` |

---

## Report Package Contents

| File | Format | Description |
|------|--------|-------------|
| Executive Summary | PDF | Management overview, AI narrative, top findings |
| Gap Register | XLSX | All compliance gaps with severity and remediation |
| Risk Register | XLSX | Risk catalog mapped 1:1 to gaps |
| Remediation Roadmap | XLSX | 30 / 60 / 90 day prioritized action plan |
| Evidence Checklist | XLSX | Documentation status per HIPAA control |

---

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `SECRET_KEY` | ✅ | JWT signing key — use a long random string |
| `ANTHROPIC_API_KEY` | ❌ | Claude API key for AI executive narratives |
| `LLM_ENABLED` | ❌ | `true` to enable AI narratives (default: `false`) |
| `DEBUG` | ❌ | `true` for development mode |

---

## Archive Retention Cleanup (MVP)

The script `agent/tools/cleanup-archive.ps1` cleans the outbox archive by the retention policy in `archival.retention` (e.g. `accepted_days`, `rejected_days`). It supports **-DryRun** and can remove empty month folders with **-RemoveEmptyFolders**. Recommended: run once per day via a Scheduled Task (see `install/install.ps1`).

---

## Operator Diagnostics Command

`agent/tools/diagnostics.ps1` collects a summary of outbox state, queue states (counts and recent items), archive (accepted/rejected), scheduled tasks, and recent log tails. Use it as the first diagnostic command for MSP support.

- **-SummaryOnly** — counts and high-level info only (no recent items or log tails).
- **-AsJson** — output as JSON for scripting or tickets (e.g. `.\agent\tools\diagnostics.ps1 -AsJson > diag.json`).
- **-BaseDir** / **-ConfigPath** — override runtime paths if the agent is installed elsewhere.

---

## Build Release

From the repo root:

```powershell
.\build\package-release.ps1 -Version 0.1.0-mvp
```

Use `-CleanOutput` to clear the output folder before building. Output is written to `release/` by default: ZIP, `.sha256.txt`, and `.manifest.json`.

---

## Run preflight (recommended)

Before installing, run the preflight script to check PowerShell version, admin rights, execution policy, ScheduledTasks module, write access to `C:\ProgramData\SummitAgent`, required files, and config:

```powershell
.\install\preflight.ps1
```

**Preflight with release verification**

```powershell
.\install\preflight.ps1 `
  -VerifyReleaseManifest `
  -ReleaseManifestPath ..\summit-local-agent-v0.1.0-mvp.manifest.json `
  -PublisherKeyPath ..\build\publisher-signing.key.txt
```

**JSON output (for MSP ticketing / support)**

```powershell
.\install\preflight.ps1 -AsJson > .\preflight-report.json
```

---

## Install from Release

1. Unzip the release bundle.
2. Edit `config\agent.config.template.json` (or create the runtime config in `C:\ProgramData\SummitAgent`). For MSP deployments, use **deploy/profiles/** (small-clinic, mid-clinic, test-lab): copy a profile’s `ENV.template.ps1` → `ENV.ps1`, fill secrets, then run that profile’s `install-run.ps1` as Administrator.
3. Run as Administrator (preflight runs automatically):

   ```powershell
   .\install\install.ps1
   ```

   To skip preflight (not recommended): `.\install\install.ps1 -SkipPreflight`

4. Validate:

   ```powershell
   .\install\test-run.ps1
   .\agent\tools\diagnostics.ps1 -SummaryOnly
   ```

---

## Verify Package Integrity

After downloading a release, verify the ZIP with the provided checksum:

```powershell
Get-FileHash .\release\summit-local-agent-v0.1.0-mvp.zip -Algorithm SHA256
```

Compare the hash with the contents of `summit-local-agent-v0.1.0-mvp.sha256.txt`.

---

## Signed release and verification

The manifest can be signed with HMAC-SHA256 (publisher integrity). Do not commit the publisher key; keep it outside the repo.

**Create a signed release**

```powershell
# 1) One-time: create publisher secret (DO NOT COMMIT)
Copy-Item .\build\publisher-signing.key.template.txt .\build\publisher-signing.key.txt
# Edit publisher-signing.key.txt and replace with a long random secret (>=32 chars)

# 2) Build signed release
.\build\package-release.ps1 -Version 0.1.0-mvp -CleanOutput -SignManifest -PublisherKeyId publisher-dev-01
```

**Verify release (ZIP hash + manifest signature)**

```powershell
.\build\verify-release.ps1 `
  -ManifestPath .\release\summit-local-agent-v0.1.0-mvp.manifest.json `
  -VerifySignature `
  -PublisherKeyPath .\build\publisher-signing.key.txt
```

**Install with verification (optional)**

Before running install, you can require that the release manifest and ZIP pass verification:

```powershell
.\install\install.ps1 -VerifyReleaseManifest `
  -ReleaseManifestPath ..\summit-local-agent-v0.1.0-mvp.manifest.json `
  -PublisherKeyPath ..\build\publisher-signing.key.txt
```

If you omit `-ReleaseManifestPath`, install will try to find a single `*.manifest.json` in the parent folder.

---

## License

MIT License — see [LICENSE](LICENSE) for details.

---

<p align="center">
  Built by <strong>Summit Range Consulting</strong> · WOSB-Certified Cybersecurity & Compliance Advisory
</p>
