"""Backend configuration. All database/secret configuration lives here only."""
import os
from pathlib import Path

from dotenv import load_dotenv

# Loaded here so every entry point (API, Alembic, scripts) sees identical configuration.
load_dotenv(Path(__file__).resolve().parent.parent / ".env")

BACKEND_DIR = Path(__file__).resolve().parent.parent


class Settings:
    # Structured relational store. PostgreSQL is the production target;
    # SQLite (aiosqlite) is a temporary local development database only.
    # Use the repository's backend database by default. as_posix() yields a
    # SQLAlchemy-compatible drive path on Windows (sqlite+aiosqlite:///C:/...).
    database_url: str = os.environ.get(
        "DATABASE_URL",
        f"sqlite+aiosqlite:///{(BACKEND_DIR / 'dialygo_dev.db').as_posix()}",
    )

    jwt_secret: str = os.environ.get("JWT_SECRET", "dialygo-dev-secret-change-in-production")
    jwt_algorithm: str = "HS256"
    jwt_ttl_seconds: int = int(os.environ.get("JWT_TTL_SECONDS", str(60 * 60 * 24 * 7)))

    aadhaar_pepper: str = os.environ.get("AADHAAR_PEPPER", "dialygo-dev-pepper-change-in-production")

    otp_ttl_seconds: int = int(os.environ.get("OTP_TTL_SECONDS", "300"))
    otp_max_attempts: int = int(os.environ.get("OTP_MAX_ATTEMPTS", "5"))
    # Development only: return the OTP in the API response. MUST be false in production.
    otp_debug: bool = os.environ.get("OTP_DEBUG", "true").lower() == "true"
    otp_fixed_code: str = os.environ.get("OTP_FIXED_CODE", "123456")

    error_log_retention_days: int = int(os.environ.get("ERROR_LOG_RETENTION_DAYS", "365"))

    @property
    def is_postgres(self) -> bool:
        return self.database_url.startswith("postgresql")


settings = Settings()
