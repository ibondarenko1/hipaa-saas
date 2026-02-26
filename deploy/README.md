# Deploy - Profile Switcher

## List profiles

```powershell
.\deploy\apply-profile.ps1 -ListProfiles
```

## Apply profile + preflight only

```powershell
.\deploy\apply-profile.ps1 -Profile small-clinic `
  -ClientOrgId demo-clinic-01 `
  -EndpointUrl https://ingest.example.com/api/v1/ingest/packages `
  -ApiKey REPLACE_ME `
  -SigningKeyId msp-demo-01 `
  -SigningHmacKey REPLACE_ME `
  -PreflightOnly
```

## Apply profile + install + diagnostics

```powershell
.\deploy\apply-profile.ps1 -Profile small-clinic `
  -ClientOrgId demo-clinic-01 `
  -EndpointUrl https://ingest.example.com/api/v1/ingest/packages `
  -ApiKey REPLACE_ME `
  -SigningKeyId msp-demo-01 `
  -SigningHmacKey REPLACE_ME `
  -Install -RunDiagnostics
```

## Test lab (MOCK upload)

```powershell
.\deploy\apply-profile.ps1 -Profile test-lab -ClientOrgId demo-lab -DisableUpload -PreflightOnly
```

Secrets should be provided via parameters or a secure local mechanism. Do not commit secrets into the repository.

## Using the DPAPI secret store (no secrets on CLI)

Store API key and signing HMAC once on the target machine (run as Admin), then reference them by name:

```powershell
# One-time: store secrets (elevated PowerShell)
.\deploy\secrets\set-secret.ps1 -Name ingest_api_key -Value "REAL_API_KEY"
.\deploy\secrets\set-secret.ps1 -Name signing_hmac -Value "LONG_RANDOM_SECRET_32PLUS"

# Apply profile without passing secrets on the command line
.\deploy\apply-profile.ps1 -Profile small-clinic `
  -ClientOrgId demo-clinic-01 `
  -EndpointUrl https://ingest.example.com/api/v1/ingest/packages `
  -ApiKeySecretName ingest_api_key `
  -SigningHmacSecretName signing_hmac `
  -SigningKeyId msp-demo-01 `
  -Install -RunDiagnostics
```

See **secrets/README.md** for full options (DPAPI store, ENV, KeyVault adapter).

For per-profile ENV files and `install-run.ps1`, see **profiles/README.md**.
