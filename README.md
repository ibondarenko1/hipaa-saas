# HIPAA Compliance Platform

Multi-tenant SaaS for HIPAA readiness assessments.

## Architecture

```
hipaa-saas/
├── backend/        FastAPI + PostgreSQL + MinIO
├── frontend/       React + TypeScript + TailwindCSS  (Phase 5)
└── docker-compose.yml
```

## Stack

| Layer | Technology |
|-------|-----------|
| API | FastAPI 0.111 |
| ORM | SQLAlchemy 2.0 (async) |
| Migrations | Alembic |
| Database | PostgreSQL 16 |
| Storage | MinIO (S3-compatible) |
| Auth | JWT (python-jose + passlib/bcrypt) |
| Reports | openpyxl + reportlab |
| LLM | Anthropic Claude (abstracted, optional) |
| Frontend | React + TypeScript + TailwindCSS |

## Roles

| Role | Description |
|------|-------------|
| `internal_user` | Summit Range team — full access per tenant |
| `client_user` | Client (clinic/IT/MSP) — questionnaire, evidence upload, report download |

## Quick Start

```bash
cp .env.example .env
# edit .env — set SECRET_KEY, ADMIN_EMAIL, ADMIN_PASSWORD

docker compose up -d

# API docs
open http://localhost:8000/docs

# MinIO console
open http://localhost:9001
```

## Workflow

```
A  Tenant Setup       internal creates tenant + invites client
B  Assessment         client or internal creates assessment
C  Evidence Upload    client uploads documents, links to controls
D  Submit (Gate 1)    70% completeness + critical questions answered
E  Engine Run         internal runs compliance mapping engine
F  Review             internal reviews outputs
G  Generate Reports   PDF + XLSX package generated
H  Publish            package marked immutable, client can download
I  Client Access      client views dashboard + downloads report
```

## Development

```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt

# run migrations
alembic upgrade head

# seed data
python scripts/seed.py

# start dev server
uvicorn app.main:app --reload
```

## Phases

- [x] Phase 1 — Foundation (models, auth, tenants, framework catalog, seed)
- [ ] Phase 2 — Assessment + Evidence (answers, evidence upload, submit gate)
- [ ] Phase 3 — Rules Engine (compliance calculation, gaps, risks, remediation)
- [ ] Phase 4 — Report Generation (PDF + XLSX + publish workflow)
- [ ] Phase 5 — Frontend (React internal dashboard + client portal)
