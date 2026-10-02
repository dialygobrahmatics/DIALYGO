"""Centralised audit and error logging backed by PostgreSQL."""
import logging
import traceback
import uuid
from datetime import datetime, timedelta, timezone

from sqlalchemy import delete
from sqlalchemy.ext.asyncio import AsyncSession

from core.config import settings
from core.sql import SessionLocal
from models.sql_models import AuditLog, ErrorLog

logger = logging.getLogger(__name__)


async def log_audit(
    db: AsyncSession,
    *,
    user_id: uuid.UUID | None,
    action: str,
    entity_type: str | None = None,
    entity_id: str | None = None,
    ip_address: str | None = None,
    metadata: dict | None = None,
) -> None:
    db.add(AuditLog(
        user_id=user_id,
        action=action,
        entity_type=entity_type,
        entity_id=str(entity_id) if entity_id else None,
        ip_address=ip_address,
        meta=metadata,
    ))
    await db.commit()


async def log_error(
    *,
    service: str,
    exc: BaseException | None = None,
    error_type: str | None = None,
    error_message: str | None = None,
    user_id: uuid.UUID | None = None,
    request_id: str | None = None,
) -> None:
    """Uses its own session so it can be called from failure paths and background tasks."""
    try:
        async with SessionLocal() as session:
            session.add(ErrorLog(
                user_id=user_id,
                service=service,
                error_type=error_type or (type(exc).__name__ if exc else "UnknownError"),
                error_message=error_message or (str(exc) if exc else None),
                stack_trace="".join(traceback.format_exception(exc)) if exc else None,
                request_id=request_id,
            ))
            await session.commit()
    except Exception:
        logger.exception("Failed to persist error log for service=%s", service)


async def purge_expired_error_logs() -> int:
    """Retention: error logs older than the configured window (default 1 year) are removed."""
    cutoff = datetime.now(timezone.utc) - timedelta(days=settings.error_log_retention_days)
    async with SessionLocal() as session:
        result = await session.execute(delete(ErrorLog).where(ErrorLog.created_at < cutoff))
        await session.commit()
        return result.rowcount or 0
