import os
from pydantic_settings import BaseSettings
from pydantic import field_validator
from functools import lru_cache


class Settings(BaseSettings):
    # App
    APP_NAME: str = "HIPAA Compliance Platform"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = False

    # Database
    DATABASE_URL: str = "postgresql+asyncpg://hipaa:hipaa@localhost:5432/hipaa"
    DATABASE_URL_SYNC: str = "postgresql://hipaa:hipaa@localhost:5432/hipaa"

    # Auth
    SECRET_KEY: str = "change-this-secret-key-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 8  # 8 hours

    # Storage (MinIO / S3-compatible)
    STORAGE_ENDPOINT: str = "http://minio:9000"
    STORAGE_ACCESS_KEY: str = "minioadmin"
    STORAGE_SECRET_KEY: str = "minioadmin"
    STORAGE_BUCKET: str = "hipaa-evidence"
    STORAGE_REGION: str = "us-east-1"
    STORAGE_PRESIGN_EXPIRY: int = 3600  # seconds

    # File limits
    MAX_UPLOAD_SIZE_BYTES: int = 25 * 1024 * 1024  # 25 MB
    ALLOWED_CONTENT_TYPES: list[str] = [
        "application/pdf",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "image/png",
        "image/jpeg",
    ]

    # LLM (Anthropic Claude) — reports narrative + AI Evidence Analyst. Только ANTHROPIC_*, не путать с OpenAI.
    ANTHROPIC_API_KEY: str = ""
    LLM_ENABLED: bool = False  # set True when key is configured
    LLM_MODEL: str = "claude-opus-4-6"
    CLAUDE_ANALYST_ENABLED: bool = False  # Next Layer: evidence validation

    # OpenAI (ChatGPT Concierge — чат ассистента). Только OPENAI_*, не путать с Anthropic.
    OPENAI_API_KEY: str = ""
    OPENAI_MODEL: str = "gpt-4o-mini"
    CHATGPT_CONCIERGE_ENABLED: bool = False

    @field_validator("OPENAI_API_KEY", mode="after")
    @classmethod
    def strip_openai_key(cls, v: str) -> str:
        raw = (v or "").strip().lstrip("\ufeff")
        first_line = raw.split("\n")[0].split("\r")[0].strip()
        return first_line[:164]

    # Ingest proxy (SaaS → ingest service)
    INGEST_BASE_URL: str = ""
    INGEST_API_KEY: str = ""

    # Submit gate
    SUBMIT_COMPLETENESS_THRESHOLD: float = 0.70
    CRITICAL_QUESTION_CODES: list[str] = [
        "A1-Q1",  # Risk Analysis
        "A3-Q2",  # Access termination
        "C1-Q1",  # Unique user identification
        "C4-Q1",  # Encryption in transit
        "D1-Q2",  # BAAs signed
        "C1-Q2",  # MFA
    ]

    class Config:
        # В Docker не грузим .env из /app (backend) — только env из compose (корневой .env)
        env_file = None if os.environ.get("OPENAI_API_KEY") else ".env"
        env_file_encoding = "utf-8"


@lru_cache()
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
