"""User identity helpers: human-facing user codes."""
import re

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from models.sql_models import User

# user_type -> (code prefix, zero-pad width); matches the IDs used in the web UI.
CODE_FORMATS = {
    "PATIENT": ("DUR-PT-", 5),
    "DOCTOR": ("DOC-", 4),
    "OPERATOR": ("OPR-", 4),
    "DIALYSIS_ADMIN": ("ADM-", 4),
    "TECH_ADMIN": ("ADM-", 4),
}


STAFF_TYPES = {"OPERATOR", "DIALYSIS_ADMIN", "TECH_ADMIN"}


async def next_user_code(db: AsyncSession, user_type: str) -> str:
    """Next sequential code for the type's prefix. The unique index guards against races."""
    prefix, width = CODE_FORMATS.get(user_type, (user_type[:3].upper() + "-", 4))
    existing = (await db.execute(select(User.user_code).where(User.user_code.like(f"{prefix}%")))).scalars().all()
    highest = max((int(m.group(1)) for c in existing if (m := re.fullmatch(re.escape(prefix) + r"(\d+)", c))), default=0)
    return f"{prefix}{highest + 1:0{width}d}"


async def find_by_code(db: AsyncSession, user_code: str) -> User | None:
    return (await db.execute(select(User).where(User.user_code == user_code.strip().upper()))).scalar_one_or_none()


def mask_mobile(mobile: str) -> str:
    return f"XXXXXX{mobile[-4:]}"


def mask_email(email: str | None) -> str | None:
    if not email or "@" not in email:
        return None
    local, domain = email.split("@", 1)
    return f"{local[0]}***@{domain}"


EMAIL_RE = re.compile(r"[^@\s]+@[^@\s]+\.[^@\s]+")


def is_valid_email(value: str) -> bool:
    return bool(EMAIL_RE.fullmatch(value))


def normalize_email(value: str | None) -> str | None:
    value = (value or "").strip().lower()
    return value or None
