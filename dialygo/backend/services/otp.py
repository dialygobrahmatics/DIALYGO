"""OTP delivery abstraction. Mock and log providers for development; swap in an email/SMS provider later."""
import logging
import secrets
from abc import ABC, abstractmethod
from datetime import datetime, timezone

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from core.config import settings
from models.sql_models import OtpVerification, as_aware
from services.security import hash_otp

logger = logging.getLogger(__name__)


class OtpProvider(ABC):
    name: str

    @abstractmethod
    def generate(self) -> str: ...

    @abstractmethod
    def send(self, mobile_number: str, otp: str) -> None: ...

    @property
    def exposes_code(self) -> bool:
        return False


class MockOtpProvider(OtpProvider):
    """Development only. Uses a fixed code and never dispatches a real SMS."""

    name = "mock"

    def generate(self) -> str:
        return settings.otp_fixed_code

    def send(self, mobile_number: str, otp: str) -> None:
        # OTP value is never logged.
        logger.info("Mock OTP dispatched to mobile ending %s", mobile_number[-4:])

    @property
    def exposes_code(self) -> bool:
        return settings.otp_debug


class RandomOtpProvider(OtpProvider):
    """Real random code. Delivery is not implemented yet, so nothing is sent."""

    name = "random"

    def generate(self) -> str:
        return "".join(secrets.choice("0123456789") for _ in range(6))

    def send(self, mobile_number: str, otp: str) -> None:
        logger.info("OTP dispatched to mobile ending %s", mobile_number[-4:])


class LogOtpProvider(RandomOtpProvider):
    """Development only. Random code, printed to the backend log instead of being delivered."""

    name = "log"

    def send(self, mobile_number: str, otp: str) -> None:
        logger.warning("[DEV OTP] mobile ending %s -> %s", mobile_number[-4:], otp)


_PROVIDERS: dict[str, type[OtpProvider]] = {
    MockOtpProvider.name: MockOtpProvider,
    LogOtpProvider.name: LogOtpProvider,
    RandomOtpProvider.name: RandomOtpProvider,
}


def get_otp_provider() -> OtpProvider:
    try:
        return _PROVIDERS[settings.otp_provider]()
    except KeyError:
        raise RuntimeError(f"Unknown OTP_PROVIDER '{settings.otp_provider}'. Use one of: {', '.join(_PROVIDERS)}.")


async def consume_otp(db: AsyncSession, mobile: str, otp: str) -> None:
    """Validate the latest OTP for a mobile number and mark it verified (caller commits)."""
    record = (await db.execute(
        select(OtpVerification)
        .where(OtpVerification.mobile_number == mobile, OtpVerification.verified_at.is_(None))
        .order_by(OtpVerification.created_at.desc())
        .limit(1)
    )).scalar_one_or_none()
    if not record:
        raise HTTPException(status_code=400, detail="Request a new verification code to continue.")
    if as_aware(record.expires_at) < datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="This verification code has expired. Request a new one.")
    if record.attempt_count >= settings.otp_max_attempts:
        raise HTTPException(status_code=429, detail="Too many attempts. Request a new verification code.")

    record.attempt_count += 1
    await db.commit()

    if hash_otp(mobile, (otp or "").strip()) != record.otp_hash:
        raise HTTPException(status_code=400, detail="That verification code is incorrect.")

    record.verified_at = datetime.now(timezone.utc)
