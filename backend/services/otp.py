"""OTP delivery abstraction. Mock provider for development; swap in an SMS provider later."""
import logging
import secrets
from abc import ABC, abstractmethod

from core.config import settings

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
    name = "random"

    def generate(self) -> str:
        return "".join(secrets.choice("0123456789") for _ in range(6))

    def send(self, mobile_number: str, otp: str) -> None:
        logger.info("OTP dispatched to mobile ending %s", mobile_number[-4:])


def get_otp_provider() -> OtpProvider:
    return MockOtpProvider() if settings.otp_debug else RandomOtpProvider()
