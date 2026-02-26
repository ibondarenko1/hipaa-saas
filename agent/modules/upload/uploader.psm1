# agent/modules/upload/uploader.psm1
# Upload adapter with preflight validation (no HTTP when config invalid).
Set-StrictMode -Version 2.0

function Get-SummitUploadConfigErrors {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)]$Context
    )

    $errs = New-Object System.Collections.ArrayList

    $uploadEnabled = $false
    $endpoint = $null
    $apiKey = $null

    try { $uploadEnabled = [bool]$Context.RuntimeCfg.upload.enabled } catch { $uploadEnabled = $false }
    try { $endpoint = [string]$Context.RuntimeCfg.upload.endpoint_url } catch { $endpoint = $null }
    try { $apiKey = [string]$Context.RuntimeCfg.upload.api_key } catch { $apiKey = $null }

    if ($uploadEnabled) {
        if ([string]::IsNullOrWhiteSpace([string]$endpoint)) {
            [void]$errs.Add("CONFIG_UPLOAD_ENABLED_BUT_ENDPOINT_MISSING")
        }
        if ([string]::IsNullOrWhiteSpace([string]$apiKey)) {
            [void]$errs.Add("CONFIG_UPLOAD_ENABLED_BUT_API_KEY_MISSING")
        }
    }

    $signingEnabled = $false
    $signingRequired = $false
    $keyId = $null
    $hmacKey = $null

    try { $signingEnabled = [bool]$Context.RuntimeCfg.signing.enabled } catch { $signingEnabled = $false }
    try { $signingRequired = [bool]$Context.RuntimeCfg.signing.require_signing } catch { $signingRequired = $false }
    try { $keyId = [string]$Context.RuntimeCfg.signing.key_id } catch { $keyId = $null }
    try { $hmacKey = [string]$Context.RuntimeCfg.signing.hmac_key } catch { $hmacKey = $null }

    if ($signingRequired) {
        if (-not $signingEnabled) { [void]$errs.Add("CONFIG_SIGNING_REQUIRED_BUT_DISABLED") }
        if ([string]::IsNullOrWhiteSpace([string]$keyId)) { [void]$errs.Add("CONFIG_SIGNING_REQUIRED_BUT_KEY_ID_MISSING") }
        if ([string]::IsNullOrWhiteSpace([string]$hmacKey)) { [void]$errs.Add("CONFIG_SIGNING_REQUIRED_BUT_HMAC_MISSING") }
    }

    return ,$errs
}

function Get-SummitRevokedSecretErrorsIfAny {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)]$Context
    )

    $errs = New-Object System.Collections.ArrayList

    try {
        $repoRoot = $null
        try { $repoRoot = [string]$Context.RepoRoot } catch { $repoRoot = $null }
        if ([string]::IsNullOrWhiteSpace($repoRoot)) { return ,$errs }

        $mod = Join-Path $repoRoot "deploy\secrets\secret-store.psm1"
        if (-not (Test-Path -LiteralPath $mod)) { return ,$errs }

        Import-Module $mod -Force -ErrorAction Stop

        $apiName = $null
        $hmacName = $null
        try { $apiName = [string]$Context.RuntimeCfg.upload.api_key_secret_name } catch { $apiName = $null }
        try { $hmacName = [string]$Context.RuntimeCfg.signing.hmac_secret_name } catch { $hmacName = $null }

        $baseDir = "C:\ProgramData\SummitAgent"
        try { if ([string]$Context.RuntimeCfg.paths.base_dir) { $baseDir = [string]$Context.RuntimeCfg.paths.base_dir } } catch { }

        if (-not [string]::IsNullOrWhiteSpace($apiName)) {
            if (Test-SummitSecretRevoked -Name $apiName -BaseDir $baseDir) {
                [void]$errs.Add("CONFIG_SECRET_REVOKED_API_KEY")
            }
        }
        if (-not [string]::IsNullOrWhiteSpace($hmacName)) {
            if (Test-SummitSecretRevoked -Name $hmacName -BaseDir $baseDir) {
                [void]$errs.Add("CONFIG_SECRET_REVOKED_SIGNING_HMAC")
            }
        }
    } catch { }

    return ,$errs
}

function New-SummitUploadResultObject {
    [CmdletBinding()]
    param(
        [string]$Mode,
        [int]$HttpStatus,
        [string]$Status,
        [bool]$Success,
        [bool]$Duplicate,
        [bool]$Retryable,
        [string]$ReceiptId,
        [string]$ErrorCode,
        [string]$Message,
        [string]$RequestId,
        [string]$IdempotencyKey,
        [string]$PackageHashSha256,
        $RawResponse
    )
    $o = New-Object PSObject
    Add-Member -InputObject $o -MemberType NoteProperty -Name Mode -Value $Mode
    Add-Member -InputObject $o -MemberType NoteProperty -Name HttpStatus -Value $HttpStatus
    Add-Member -InputObject $o -MemberType NoteProperty -Name Status -Value $Status
    Add-Member -InputObject $o -MemberType NoteProperty -Name Success -Value $Success
    Add-Member -InputObject $o -MemberType NoteProperty -Name Duplicate -Value $Duplicate
    Add-Member -InputObject $o -MemberType NoteProperty -Name Retryable -Value $Retryable
    Add-Member -InputObject $o -MemberType NoteProperty -Name ReceiptId -Value $ReceiptId
    Add-Member -InputObject $o -MemberType NoteProperty -Name ErrorCode -Value $ErrorCode
    Add-Member -InputObject $o -MemberType NoteProperty -Name Message -Value $Message
    Add-Member -InputObject $o -MemberType NoteProperty -Name RequestId -Value $RequestId
    Add-Member -InputObject $o -MemberType NoteProperty -Name IdempotencyKey -Value $IdempotencyKey
    Add-Member -InputObject $o -MemberType NoteProperty -Name PackageHashSha256 -Value $PackageHashSha256
    Add-Member -InputObject $o -MemberType NoteProperty -Name RawResponse -Value $RawResponse
    return $o
}

function New-SummitRequestId {
    param([string]$Prefix = "req")
    return ("{0}_{1}" -f $Prefix, [guid]::NewGuid().ToString("N").Substring(0, 12))
}

function Invoke-SummitUpload {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)]$Context,
        [Parameter(Mandatory)][string]$IdempotencyKey,
        [string]$PackageHashSha256 = "",
        [string]$PackagePath = ""
    )

    # Hard fail on missing required config when upload.enabled=true
    $cfgErrs = Get-SummitUploadConfigErrors -Context $Context
    $revokedErrs = Get-SummitRevokedSecretErrorsIfAny -Context $Context
    foreach ($e in $revokedErrs) { [void]$cfgErrs.Add($e) }

    if ($cfgErrs.Count -gt 0) {
        $msg = "Upload blocked due to missing/invalid runtime configuration."
        try {
            if (Get-Command Write-AgentLog -ErrorAction SilentlyContinue) {
                Write-AgentLog -Level ERROR -Message ("{0} errors={1}" -f $msg, ($cfgErrs -join ",")) -LogFilePath $Context.LogFilePath
            }
        } catch { }

        return (New-SummitUploadResultObject `
            -Mode "LOCAL" `
            -HttpStatus 0 `
            -Status "REJECTED" `
            -Success $false `
            -Duplicate $false `
            -Retryable $false `
            -ReceiptId $null `
            -ErrorCode ($cfgErrs[0]) `
            -Message ($msg + " " + ($cfgErrs -join ", ")) `
            -RequestId (New-SummitRequestId -Prefix "cfg") `
            -IdempotencyKey $IdempotencyKey `
            -PackageHashSha256 $PackageHashSha256 `
            -RawResponse ([pscustomobject]@{ errors = @($cfgErrs) }))
    }

    # HTTP upload to Ingest Service
    $endpoint = [string]$Context.RuntimeCfg.upload.endpoint_url.TrimEnd('/')
    $apiKey = [string]$Context.RuntimeCfg.upload.api_key
    $clientOrgId = [string]$Context.RuntimeCfg.client_org_id
    $agentVersion = [string]$Context.RuntimeCfg.agent_version
    if ([string]::IsNullOrWhiteSpace($agentVersion)) { $agentVersion = "0.1.0-mvp" }

    $zipBytes = $null
    if ([string]::IsNullOrWhiteSpace($PackagePath) -or -not (Test-Path -LiteralPath $PackagePath)) {
        return (New-SummitUploadResultObject -Mode "LOCAL" -HttpStatus 0 -Status "REJECTED" -Success $false -Duplicate $false -Retryable $false `
            -ReceiptId $null -ErrorCode "PACKAGE_FILE_MISSING" -Message "Package path missing or file not found" `
            -RequestId (New-SummitRequestId -Prefix "pkg") -IdempotencyKey $IdempotencyKey -PackageHashSha256 $PackageHashSha256 -RawResponse $null)
    }
    try {
        $zipBytes = [System.IO.File]::ReadAllBytes($PackagePath)
    } catch {
        if (Get-Command Write-AgentLog -ErrorAction SilentlyContinue) {
            Write-AgentLog -Level ERROR -Message ("Failed to read package: {0}" -f $_.Exception.Message) -LogFilePath $Context.LogFilePath
        }
        return (New-SummitUploadResultObject -Mode "LOCAL" -HttpStatus 0 -Status "REJECTED" -Success $false -Duplicate $false -Retryable $false `
            -ReceiptId $null -ErrorCode "PACKAGE_READ_FAILED" -Message $_.Exception.Message `
            -RequestId (New-SummitRequestId -Prefix "pkg") -IdempotencyKey $IdempotencyKey -PackageHashSha256 $PackageHashSha256 -RawResponse $null)
    }

    $hashHex = $PackageHashSha256
    if ([string]::IsNullOrWhiteSpace($hashHex)) {
        $sha = [System.Security.Cryptography.SHA256]::Create()
        $hashBytes = $sha.ComputeHash($zipBytes)
        $hashHex = [BitConverter]::ToString($hashBytes).Replace("-", "").ToLowerInvariant()
    }

    $uri = "$endpoint/api/v1/ingest/packages"
    $headers = @{
        "Content-Type"                = "application/zip"
        "X-API-Key"                   = $apiKey
        "X-Summit-Client-Org-Id"     = $clientOrgId
        "X-Summit-Package-Hash-SHA256" = $hashHex
        "X-Idempotency-Key"          = $IdempotencyKey
        "X-Summit-Agent-Version"     = $agentVersion
        "X-Request-Id"               = (New-SummitRequestId -Prefix "req")
    }

    try {
        $response = Invoke-WebRequest -Uri $uri -Method POST -Headers $headers -Body $zipBytes -UseBasicParsing -TimeoutSec 60
        $statusCode = [int]$response.StatusCode
        $body = $null
        try { $body = $response.Content | ConvertFrom-Json } catch { }

        $receiptId = $null
        if ($response.Headers["X-Receipt-Id"]) { $receiptId = [string]$response.Headers["X-Receipt-Id"] }
        if ($body -and $body.receipt_id) { $receiptId = [string]$body.receipt_id }

        $status = "ACCEPTED"
        if ($body -and $body.status) { $status = [string]$body.status }
        $duplicate = $false
        if ($body -and $null -ne $body.duplicate) { $duplicate = [bool]$body.duplicate }

        return (New-SummitUploadResultObject -Mode "HTTP" -HttpStatus $statusCode -Status $status -Success ($statusCode -ge 200 -and $statusCode -lt 300) `
            -Duplicate $duplicate -Retryable $false -ReceiptId $receiptId -ErrorCode $null -Message $null `
            -RequestId $headers["X-Request-Id"] -IdempotencyKey $IdempotencyKey -PackageHashSha256 $hashHex -RawResponse $body)
    } catch [System.Net.WebException] {
        $statusCode = 0
        $body = $null
        if ($_.Exception.Response) {
            $statusCode = [int]$_.Exception.Response.StatusCode
            $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
            try {
                $json = $reader.ReadToEnd()
                if ($json) { $body = $json | ConvertFrom-Json }
            } catch { }
            $reader.Close()
        }
        $code = "UPLOAD_ERROR"
        $msg = $_.Exception.Message
        if ($body -and $body.code) { $code = [string]$body.code }
        if ($body -and $body.message) { $msg = [string]$body.message }
        $retryable = ($statusCode -ge 500 -or $statusCode -eq 429)
        $receiptId = $null
        if ($_.Exception.Response -and $_.Exception.Response.Headers["X-Receipt-Id"]) { $receiptId = [string]$_.Exception.Response.Headers["X-Receipt-Id"] }
        return (New-SummitUploadResultObject -Mode "HTTP" -HttpStatus $statusCode -Status "REJECTED" -Success $false -Duplicate $false -Retryable $retryable `
            -ReceiptId $receiptId -ErrorCode $code -Message $msg -RequestId $headers["X-Request-Id"] -IdempotencyKey $IdempotencyKey -PackageHashSha256 $hashHex -RawResponse $body)
    }
}

Export-ModuleMember -Function `
    Get-SummitUploadConfigErrors, Get-SummitRevokedSecretErrorsIfAny, `
    New-SummitUploadResultObject, New-SummitRequestId, Invoke-SummitUpload
