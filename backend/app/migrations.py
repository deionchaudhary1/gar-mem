"""Programmatic Alembic runner, called at app startup.

Databases created before Alembic was introduced (they have a `garments` table
but no `alembic_version`) are stamped at the 0001 baseline first, then
upgraded to head like everyone else.
"""

import os

from alembic import command
from alembic.config import Config
from sqlalchemy import inspect

from .database import BASE_DIR, engine

BASELINE_REVISION = "0001"


def _alembic_config() -> Config:
    cfg = Config(os.path.join(BASE_DIR, "alembic.ini"))
    cfg.set_main_option("script_location", os.path.join(BASE_DIR, "alembic"))
    return cfg


def run_migrations() -> None:
    cfg = _alembic_config()

    inspector = inspect(engine)
    tables = inspector.get_table_names()
    if "garments" in tables and "alembic_version" not in tables:
        command.stamp(cfg, BASELINE_REVISION)

    command.upgrade(cfg, "head")
