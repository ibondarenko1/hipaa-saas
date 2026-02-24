..............# HIPAA Readiness Platform

<p align="center">
  <img src="https://img.shields.io/badge/FastAPI-0.111-009688?style=flat-square&logo=fastapi" />
  <img src="https://img.shields.io/badge/React-18-61DAFB?style=flat-square&logo=react" />
  <img src="https://img.shields.io/badge/TypeScript-5.6-3178C6?style=flat-square&logo=typescript" />
  <img src="https://img.shields.io/badge/PostgreSQL-16-4169E1?style=flat-square&logo=postgresql" />
  <img src="https://img.shields.io/badge/Docker-Compose-2496ED?style=flat-square&logo=docker" />
  <img src="https://img.shields.io/badge/License-MIT-green?style=flat-square" />
</p>

> A multi-tenant SaaS platform for HIPAA Security Rule readiness assessments — built by **Summit Range Consulting**. Covers the full compliance lifecycle: questionnaire → evidence → engine → report package.

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
└── docker-compose.yml
```

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

## License

MIT License — see [LICENSE](LICENSE) for details.

---

<p align="center">
  Built by <strong>Summit Range Consulting</strong> · WOSB-Certified Cybersecurity & Compliance Advisory
</p>
