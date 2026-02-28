# Full System Test — Complete Compliance Cycle

This document describes how to run a **full end-to-end test** of the HIPAA platform: from login to published report download. Use it for the first full system check or after major changes.

---

## Prerequisites

1. **Stack running**
   ```powershell
   docker compose up --build
   ```
   Wait until backend health is OK and frontend is up (see [Quick checks](#quick-checks) below).

2. **Default accounts** (created by seed):
   | Role   | Email                         | Password   |
   |--------|-------------------------------|------------|
   | Admin  | `admin@summitrange.com`       | `Admin1234!` |
   | Client | `client@valleycreek.example.com` | `Client2024!` |

3. **Demo data**: Seed creates tenant **Valley Creek Family Practice** with one assessment, pre-filled answers, and demo evidence. You use this tenant for the test.

---

## Full Cycle (Manual + Script)

The cycle matches the [Compliance Workflow](README.md#compliance-workflow):

| Step | Who        | Action |
|------|------------|--------|
| 1    | Internal   | Login, open Clients → Valley Creek |
| 2    | Internal   | Submit assessment (Gate 1: 70% + critical questions) |
| 3    | Internal   | Run compliance engine |
| 4    | Internal   | Create report package, generate files, publish |
| 5    | Client     | Login as client, open Reports, download package |

You can drive **steps 2–4** via API with the script below, then verify in the UI; or do everything in the browser.

---

## Option A: Automated API run (recommended for first test)

From the repo root, with the stack already up:

```powershell
.\scripts\full-system-test.ps1
```

The script will:

1. Check backend `GET /health` and (optionally) frontend.
2. Login as `admin@summitrange.com`, get tenants, find **Valley Creek** and its assessment.
3. If assessment is `in_progress` → `POST .../submit`.
4. `POST .../engine/run`.
5. Create report package → `POST .../generate` → `POST .../publish`.
6. Print a short summary and next steps.

Then you **manually**:

- Open http://localhost:5173 → Login as **client@valleycreek.example.com** / **Client2024!** → **Reports** → confirm the published package is visible and download works.

---

## Option B: Fully manual test in the browser

### 1. Start and open app

- `docker compose up --build`
- Open http://localhost:5173

### 2. Login as internal (admin)

- Email: `admin@summitrange.com`, Password: `Admin1234!`
- You should see the Internal portal (Dashboard, Clients, Evidence Review, Reports, etc.).

### 3. Submit assessment

- Go to **Clients** → click **Valley Creek Family Practice**.
- Open the **Assessment** tab; ensure the assessment is in progress and answers are present (seed fills ~100%).
- Click **Submit**. Expect success (Gate 1 passes: 70%+ answered, critical questions filled). If you see an error, check the message (e.g. missing critical questions).

### 4. Run compliance engine

- On the same tenant detail page, go to **Engine Results** (or open the assessment’s results).
- Click **Run engine** (or equivalent). Wait until the run completes.
- Confirm **Control results**, **Gaps**, **Risks**, **Remediation** are visible.

### 5. Generate and publish report package

- In **Engine Results** or **Reports**, create a new report package for this assessment (e.g. **Create package**).
- Click **Generate** (optionally enable AI narrative if `LLM_ENABLED` is set). Wait for generation to finish.
- Click **Publish** and add an optional note. The package status should become **Published**.

### 6. Verify as client

- Logout (or use an incognito window). Login as **client@valleycreek.example.com** / **Client2024!**.
- Go to **Reports**. You should see **one published package** (no draft).
- Download the Executive Summary (or full package) and confirm the file opens.

### 7. Optional: Evidence and Assistant

- As client: **Evidence Vault** — confirm demo evidence files and controls are shown.
- As internal or client: open **Assistant chat** (floating button), send a short message, confirm reply (and that UI is in English).
- As internal: **Evidence Review** — confirm files and any admin comments; **Audit Log** — confirm events for login, submit, engine, report generation, publish.

---

## Quick checks (without full cycle)

- **Backend**: `curl http://localhost:8000/health` → `{"status":"ok","version":"..."}`.
- **Frontend**: open http://localhost:5173 → Login page loads.
- **API docs**: http://localhost:8000/docs → Swagger UI loads.
- **MinIO**: http://localhost:9001 (minioadmin / minioadmin) → bucket `hipaa-evidence` exists.

---

## Troubleshooting

| Symptom | What to check |
|--------|----------------|
| Submit returns 400 | Gate 1: completeness &lt; 70% or critical questions missing. In UI, read the error payload (e.g. `missing_critical`, `na_forbidden`). |
| Engine won’t run | Assessment must be **submitted**. Submit first, then run engine. |
| “No engine results” when creating package | Run the compliance engine and wait for it to finish before creating a report package. |
| Generate fails (500) | Backend logs; MinIO reachable from backend; `report_generator` and dependencies (e.g. ReportLab, openpyxl). |
| Client doesn’t see package | Package must be **published**. Client sees only published packages. |
| Login fails | Seed and reset_admin_password ran (they run on backend startup). Try: `docker compose exec backend python scripts/reset_admin_password.py`. |

---

## Success criteria (full cycle passed)

- [ ] Internal user can log in and see Clients.
- [ ] Valley Creek assessment can be submitted (Gate 1 passes).
- [ ] Engine run completes and results (controls, gaps, risks) are visible.
- [ ] Report package can be created, generated (5 files), and published.
- [ ] Client user can log in, sees only published package(s), and can download at least one file (e.g. Executive Summary).
- [ ] Menu and assistant chat use English only; sidebar does not jitter on navigation.
