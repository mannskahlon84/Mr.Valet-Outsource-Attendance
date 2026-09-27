"""Bring the database schema up to date with Alembic, safely, on every start.

create_all() only ever created missing tables, never new columns, so model changes after launch
would crash production. Migrations fix that; this module runs them.
"""
import logging
import os

from alembic import command
from alembic.config import Config
from sqlalchemy import inspect, text

from app.db.session import engine

BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
# The revision matching what create_all() built before migrations existed
BASELINE_REVISION = "0001_baseline"
# Any fixed number; serializes migrations when several app workers start at once (PostgreSQL)
MIGRATION_LOCK_ID = 815_420_2026

log = logging.getLogger("uvicorn.error")


def alembic_config(connection) -> Config:
    cfg = Config(os.path.join(BACKEND_DIR, "alembic.ini"))
    cfg.set_main_option("script_location", os.path.join(BACKEND_DIR, "alembic"))
    cfg.attributes["connection"] = connection
    return cfg


def run_migrations():
    is_postgres = engine.dialect.name == "postgresql"
    with engine.connect() as connection:
        if is_postgres:
            connection.execute(text("SELECT pg_advisory_lock(:id)"), {"id": MIGRATION_LOCK_ID})
            connection.commit()
        try:
            cfg = alembic_config(connection)
            tables = set(inspect(connection).get_table_names())
            if "alembic_version" not in tables and "users" in tables:
                # A database made by create_all() instead of migrations. If it already has every
                # current table (a script built it from today's models) it is up to date; otherwise
                # it is the pre-migration production schema, which the baseline describes.
                from app.db.base import Base
                revision = "head" if set(Base.metadata.tables) <= tables else BASELINE_REVISION
                log.info("Existing database without migration history; stamping it at %s", revision)
                command.stamp(cfg, revision)
                connection.commit()
            command.upgrade(cfg, "head")
            connection.commit()
        finally:
            if is_postgres:
                connection.execute(text("SELECT pg_advisory_unlock(:id)"), {"id": MIGRATION_LOCK_ID})
                connection.commit()
