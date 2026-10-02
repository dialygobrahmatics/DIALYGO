"""Backend configuration. All database/secret configuration lives here only."""
import os
from pathlib import Path

from dotenv import load_dotenv

# Loaded here so every entry point (API, Alembic, scripts) sees identical configuration.
load_dotenv(Path(__file__).resolve().parent.parent / ".env")

BACKEND_DIR = Path(__file__).resolve().parent.parent


class Settings:
    # Structured relational store: PostgreSQL (asyncpg). No fallback, so the
    # app can never silently start against a different database.
    database_url: str = os.environ["DATABASE_URL"]

    jwt_secret: str = os.environ.get("JWT_SECRET", "dialygo-dev-secret-change-in-production")
    jwt_algorithm: str = "HS256"
    jwt_ttl_seconds: int = int(os.environ.get("JWT_TTL_SECONDS", str(60 * 60 * 24 * 7)))

    aadhaar_pepper: str = os.environ.get("AADHAAR_PEPPER", "dialygo-dev-pepper-change-in-production")

    otp_ttl_seconds: int = int(os.environ.get("OTP_TTL_SECONDS", "300"))
    otp_max_attempts: int = int(os.environ.get("OTP_MAX_ATTEMPTS", "5"))
    # Development only: return the OTP in the API response. MUST be false in production.
    otp_debug: bool = os.environ.get("OTP_DEBUG", "true").lower() == "true"
    otp_fixed_code: str = os.environ.get("OTP_FIXED_CODE", "123456")
    # How OTPs are delivered: mock (fixed code, returned in the response), log (random code printed
    # to the backend log - development only) or random (real code, delivery not implemented yet).
    # Defaults keep the previous behaviour: mock while OTP_DEBUG=true, random otherwise.
    otp_provider: str = os.environ.get("OTP_PROVIDER", "mock" if otp_debug else "random").lower()

    error_log_retention_days: int = int(os.environ.get("ERROR_LOG_RETENTION_DAYS", "365"))

    @property
    def is_postgres(self) -> bool:
        return self.database_url.startswith("postgresql")


settings = Settings()
