"""Hashing and token helpers. Never logs or returns raw secrets/Aadhaar numbers."""
import hashlib
import hmac
import re
from datetime import datetime, timedelta, timezone

import jwt

from core.config import settings


def normalize_mobile(value: str) -> str:
    digits = re.sub(r"\D", "", value or "")
    if len(digits) > 10:
        digits = digits[-10:]
    return digits


def valid_mobile(value: str) -> bool:
    return bool(re.fullmatch(r"[6-9]\d{9}", value or ""))


def valid_aadhaar(value: str) -> bool:
    return bool(re.fullmatch(r"\d{12}", re.sub(r"\D", "", value or "")))


def hash_aadhaar(aadhaar: str) -> str:
    digits = re.sub(r"\D", "", aadhaar or "")
    return hmac.new(settings.aadhaar_pepper.encode(), digits.encode(), hashlib.sha256).hexdigest()


def mask_aadhaar(aadhaar: str) -> str:
    digits = re.sub(r"\D", "", aadhaar or "")
    return f"XXXX XXXX {digits[-4:]}" if len(digits) >= 4 else "XXXX XXXX XXXX"


def hash_otp(mobile: str, otp: str) -> str:
    return hmac.new(settings.jwt_secret.encode(), f"{mobile}:{otp}".encode(), hashlib.sha256).hexdigest()


def create_access_token(user_id: str, user_type: str) -> str:
    now = datetime.now(timezone.utc)
    payload = {
        "sub": str(user_id),
        "user_type": user_type,
        "iat": int(now.timestamp()),
        "exp": int((now + timedelta(seconds=settings.jwt_ttl_seconds)).timestamp()),
    }
    return jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)


def decode_access_token(token: str) -> dict:
    return jwt.decode(token, settings.jwt_secret, algorithms=[settings.jwt_algorithm])
