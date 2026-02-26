# Copy to ENV.ps1 and fill values. DO NOT COMMIT ENV.ps1.
$Env:SUMMIT_CLIENT_ORG_ID      = "demo-clinic-01"
$Env:SUMMIT_UPLOAD_ENDPOINT    = "https://ingest.example.com/api/v1/ingest/packages"
$Env:SUMMIT_UPLOAD_API_KEY     = "REPLACE_WITH_REAL_API_KEY"
$Env:SUMMIT_SIGNING_KEY_ID     = "msp-demo-01"
$Env:SUMMIT_SIGNING_HMAC_KEY   = "REPLACE_WITH_LONG_RANDOM_SECRET_32PLUS"
