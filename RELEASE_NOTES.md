# Release Notes

## summit-local-agent v0.1.0-mvp

### Included
- Local collection/sanitization/packaging pipeline
- Upload adapter to OpenAPI ingest contract
- Outbox resend worker with retry/backoff
- Queue state machine for ingest outcomes
- Outbox archival policy (accepted / rejected)
- Archival retention cleanup job
- Operator diagnostics command

### Installation
1. Unzip release bundle
2. Edit `config/agent.config.template.json` and create runtime config
3. Run `install\install.ps1` as Administrator
4. Run `install\test-run.ps1`
5. Validate with `agent\tools\diagnostics.ps1`

### Notes
- PowerShell 5.1 compatible
- Designed for MSP-managed deployment
