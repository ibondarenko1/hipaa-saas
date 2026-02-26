# Secure Secret Injection Options (MVP)

## Option A (recommended): DPAPI LocalMachine Secret Store

Stores secrets encrypted for the local machine under:

`C:\ProgramData\SummitAgent\secrets\`

### Set secrets (run as Admin)

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File deploy\secrets\set-secret.ps1 -Name ingest_api_key -Value "<API_KEY>"
powershell.exe -NoProfile -ExecutionPolicy Bypass -File deploy\secrets\set-secret.ps1 -Name signing_hmac -Value "<HMAC_SECRET>"
```

### Verify (prints length only)

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File deploy\secrets\get-secret.ps1 -Name ingest_api_key -ShowLengthOnly
```

### Use with profile switcher

```powershell
.\deploy\apply-profile.ps1 -Profile small-clinic -ClientOrgId demo-clinic-01 -EndpointUrl https://.../api/v1/ingest/packages `
  -ApiKeySecretName ingest_api_key -SigningHmacSecretName signing_hmac -SigningKeyId msp-demo-01 `
  -Install -RunDiagnostics
```

## Option B: ENV variables (no persistence)

Set environment variables in the current session:

`$Env:SUMMIT_UPLOAD_API_KEY="..."`  
`$Env:SUMMIT_SIGNING_HMAC_KEY="..."`

Then pass them to apply-profile (or adapt wrapper scripts).

## Rotate secret

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File deploy\secrets\rotate-secret.ps1 `
  -Name ingest_api_key -NewValue "<NEW_API_KEY>" -Reason "Routine rotation"
```

## Revoke secret (kill switch)

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File deploy\secrets\revoke-secret.ps1 `
  -Name ingest_api_key -Reason "Incident response - revoke access"
```

After revoke, apply-profile with that secret name will fail until you rotate (set a new value). Use **status.ps1** to see stored secrets and revoked markers:

```powershell
.\deploy\secrets\status.ps1
```

## Recommended rotation workflow

1. Rotate secrets locally (DPAPI): `rotate-secret.ps1 -Name ingest_api_key -NewValue "..." -Reason "Quarterly rotation"`
2. Re-apply profile using secret names (no secrets in CLI):

   ```powershell
   .\deploy\apply-profile.ps1 -Profile small-clinic -ClientOrgId ... -EndpointUrl ... `
     -ApiKeySecretName ingest_api_key -SigningHmacSecretName signing_hmac -SigningKeyId ... `
     -Install -RunDiagnostics
   ```

Audit log is written to `C:\ProgramData\SummitAgent\secrets\audit.log` (ROTATE/REVOKE events only; secret values are never logged).

## Option C: SecretManagement / KeyVault (enterprise)

If MSP has SecretManagement/KeyVault, build a small adapter that resolves `ApiKeySecretName` and `SigningHmacSecretName` from the vault, then calls apply-profile. (Not included in MVP due to module availability variance.)
