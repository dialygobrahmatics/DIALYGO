"""Programmatic Alembic runner so the schema is applied on backend startup."""
import logging
from pathlib import Path

from alembic import command
from alembic.config import Config

from core.config import settings

logger = logging.getLogger(__name__)
BACKEND_DIR = Path(__file__).resolve().parent.parent


def upgrade_to_head() -> None:
    cfg = Config(str(BACKEND_DIR / "alembic.ini"))
    cfg.set_main_option("script_location", str(BACKEND_DIR / "migrations"))
    cfg.set_main_option("sqlalchemy.url", settings.database_url)
    command.upgrade(cfg, "head")
    logger.info("Database migrations applied (dialect=%s)", settings.database_url.split(":")[0])
