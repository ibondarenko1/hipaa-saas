"""
Storage service — MinIO / S3-compatible
Generates presigned upload and download URLs.
All file access goes through signed URLs — never direct.
"""
import uuid
from datetime import datetime, timedelta, timezone
import boto3
from botocore.config import Config
from botocore.exceptions import ClientError
from app.core.config import settings


def _get_client():
    return boto3.client(
        "s3",
        endpoint_url=settings.STORAGE_ENDPOINT,
        aws_access_key_id=settings.STORAGE_ACCESS_KEY,
        aws_secret_access_key=settings.STORAGE_SECRET_KEY,
        region_name=settings.STORAGE_REGION,
        config=Config(signature_version="s3v4"),
    )


def generate_storage_key(tenant_id: str, file_name: str) -> str:
    """Generate a unique storage key scoped to tenant."""
    ext = file_name.rsplit(".", 1)[-1].lower() if "." in file_name else "bin"
    unique = str(uuid.uuid4()).replace("-", "")
    return f"evidence/{tenant_id}/{unique}.{ext}"


def generate_report_key(tenant_id: str, assessment_id: str, file_type: str, fmt: str) -> str:
    """Generate storage key for report files."""
    return f"reports/{tenant_id}/{assessment_id}/{file_type}.{fmt.lower()}"


def generate_certificate_key(tenant_id: str, assignment_id: str) -> str:
    """Generate storage key for training certificate PDF."""
    return f"training/{tenant_id}/certificates/{assignment_id}.pdf"


def create_presigned_upload_url(storage_key: str, content_type: str, expires_in: int = None) -> str:
    """Return presigned PUT URL for direct client upload to MinIO."""
    client = _get_client()
    expires_in = expires_in or settings.STORAGE_PRESIGN_EXPIRY
    url = client.generate_presigned_url(
        "put_object",
        Params={
            "Bucket": settings.STORAGE_BUCKET,
            "Key": storage_key,
            "ContentType": content_type,
        },
        ExpiresIn=expires_in,
    )
    return url


def create_presigned_download_url(storage_key: str, file_name: str = None, expires_in: int = None) -> str:
    """Return presigned GET URL for secure file download."""
    client = _get_client()
    expires_in = expires_in or settings.STORAGE_PRESIGN_EXPIRY
    params = {
        "Bucket": settings.STORAGE_BUCKET,
        "Key": storage_key,
    }
    if file_name:
        params["ResponseContentDisposition"] = f'attachment; filename="{file_name}"'

    url = client.generate_presigned_url(
        "get_object",
        Params=params,
        ExpiresIn=expires_in,
    )
    return url


def delete_object(storage_key: str) -> None:
    """Delete object from storage."""
    client = _get_client()
    try:
        client.delete_object(Bucket=settings.STORAGE_BUCKET, Key=storage_key)
    except ClientError:
        pass  # non-blocking


def upload_bytes(storage_key: str, data: bytes, content_type: str) -> None:
    """Upload bytes directly from server (used for report generation)."""
    client = _get_client()
    client.put_object(
        Bucket=settings.STORAGE_BUCKET,
        Key=storage_key,
        Body=data,
        ContentType=content_type,
    )


def get_presign_expiry_datetime(expires_in: int = None) -> datetime:
    expires_in = expires_in or settings.STORAGE_PRESIGN_EXPIRY
    return datetime.now(timezone.utc) + timedelta(seconds=expires_in)
