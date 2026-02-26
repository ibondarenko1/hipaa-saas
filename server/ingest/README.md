# Summit Ingest Service (MVP)

Minimal ingest service for:
- POST /api/v1/ingest/packages (receipt persistence + idempotency)
- GET /api/v1/ingest/receipts/:receipt_id
- GET /api/v1/ingest/receipts?client_org_id=...&limit=...

## Setup
1) Install deps:
   npm i

2) Create Postgres DB and set DATABASE_URL in .env

3) Build:
   npm run build

4) Run migrations:
   npm run migrate

5) Start:
   npm start

## Notes
- This MVP stores receipts and supports idempotent replay.
- ZIP validation/signature verification will be wired in Step 4/6.
