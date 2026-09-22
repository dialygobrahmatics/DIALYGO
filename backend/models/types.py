"""Dialect-portable column types so the PostgreSQL schema can also run on SQLite locally."""
import uuid

from sqlalchemy import CHAR, JSON
from sqlalchemy.dialects.postgresql import JSONB, UUID as PGUUID
from sqlalchemy.types import TypeDecorator


class GUID(TypeDecorator):
    """uuid column: native UUID on PostgreSQL, CHAR(36) elsewhere."""

    impl = CHAR
    cache_ok = True

    def load_dialect_impl(self, dialect):
        if dialect.name == "postgresql":
            return dialect.type_descriptor(PGUUID(as_uuid=True))
        return dialect.type_descriptor(CHAR(36))

    def process_bind_param(self, value, dialect):
        if value is None:
            return None
        if not isinstance(value, uuid.UUID):
            value = uuid.UUID(str(value))
        return value if dialect.name == "postgresql" else str(value)

    def process_result_value(self, value, dialect):
        if value is None:
            return None
        return value if isinstance(value, uuid.UUID) else uuid.UUID(str(value))


JSONBType = JSON().with_variant(JSONB(), "postgresql")
