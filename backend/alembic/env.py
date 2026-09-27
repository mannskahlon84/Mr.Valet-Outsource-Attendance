import os
import sys
from logging.config import fileConfig

from sqlalchemy import create_engine, pool

from alembic import context

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from app.core.config import settings
from app.db.base import Base
from app.models import all_models  # noqa: F401  (registers every table)

config = context.config

# Logging only when run from the command line; inside the app uvicorn owns logging
if config.config_file_name is not None and not config.attributes.get("connection"):
    fileConfig(config.config_file_name, disable_existing_loggers=False)

target_metadata = Base.metadata

# SQLite can't ALTER most things in place; batch mode rebuilds the table instead
RENDER_AS_BATCH = settings.DATABASE_URL.startswith("sqlite")


def run_migrations_offline() -> None:
    context.configure(
        url=settings.DATABASE_URL,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        render_as_batch=RENDER_AS_BATCH,
    )
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    # app/db/migrate.py passes its own connection (holding the migration lock)
    connection = config.attributes.get("connection")
    if connection is not None:
        context.configure(connection=connection, target_metadata=target_metadata, render_as_batch=RENDER_AS_BATCH)
        with context.begin_transaction():
            context.run_migrations()
        return

    connectable = create_engine(settings.DATABASE_URL, poolclass=pool.NullPool)
    with connectable.connect() as connection:
        context.configure(connection=connection, target_metadata=target_metadata, render_as_batch=RENDER_AS_BATCH)
        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
