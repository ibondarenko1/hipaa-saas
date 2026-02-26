# MSP Deployment Profiles (MVP)

These profiles are ready-to-use starting points for MSP deployments.

## How to use

1. **Pick a profile folder:**
   - **profile-small-clinic** (recommended default)
   - **profile-mid-clinic** (higher volume, more resilience)
   - **profile-test-lab** (safe defaults for demos)

2. **Copy ENV template and fill secrets locally:**
   - Copy `ENV.template.ps1` → `ENV.ps1`
   - Set upload endpoint/API key, signing secrets, key_id, client_org_id

3. **Run installer wrapper:**
   - Run `install-run.ps1` as Administrator

This will:
- Apply ENV values
- Write runtime config to `C:\ProgramData\SummitAgent\agent.config.json`
- Run `install\preflight.ps1`
- Run `install\install.ps1`
- Optional: run a smoke test and diagnostics summary

## What you must customize (minimum)

- **client_org_id**
- **upload.endpoint_url**
- **upload.api_key**
- **signing.*** (if tenant requires signing)
- publisher verification (optional)

## Notes

- These profiles are tuned for periodic uploads (not continuous SOC streaming).
- Resend worker runs hourly by default (safe).
- Archive cleanup runs daily.
