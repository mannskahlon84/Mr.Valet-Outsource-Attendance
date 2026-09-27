from app.models import all_models  # noqa: F401  (registers every table)


def ensure_tables():
    """Bring the schema up to date, so seed scripts work on a brand-new database in any order."""
    from app.db.migrate import run_migrations
    run_migrations()


def seed_demo_data_if_empty():
    """Load the demo accounts, agencies and venues when the database has no users at all.

    Hosts often start the app with plain `uvicorn` instead of start.sh, which left a fresh
    database without any logins. The seed scripts are create-only, and this never runs on a
    database that already has users. On by default only in development; AUTO_SEED=true/false overrides.
    The demo accounts all share a published password, so never enable this in production.
    """
    import logging
    import subprocess
    import sys
    from app.db.session import SessionLocal
    from app.models.all_models import User

    log = logging.getLogger("uvicorn.error")
    from app.core.config import settings
    if not settings.auto_seed_enabled:
        return
    with SessionLocal() as db:
        if db.query(User).first() is not None:
            return
    import os
    backend_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    # Sites first, so the demo "today's shift" in seed_roles has a venue on the very first boot
    for script in ("sync_all_locations.py", "seed_suppliers.py", "seed_roles.py"):
        result = subprocess.run([sys.executable, script], cwd=backend_dir, capture_output=True, text=True)
        if result.returncode != 0:
            log.error("Demo data script %s failed: %s", script, result.stderr[-2000:])
        else:
            log.info("Demo data script %s done", script)
