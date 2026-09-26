from app.db.base import Base
from app.db.session import engine
from app.models import all_models  # noqa: F401  (registers every table)


def ensure_tables():
    """Create any missing tables, so seed scripts work on a brand-new database in any order."""
    Base.metadata.create_all(bind=engine)


def seed_demo_data_if_empty():
    """Load the demo accounts, agencies and venues when the database has no users at all.

    Hosts often start the app with plain `uvicorn` instead of start.sh, which left a fresh
    database without any logins. The seed scripts are create-only, and this never runs on a
    database that already has users. Set AUTO_SEED=false to disable it.
    """
    import logging
    import os
    import subprocess
    import sys
    from app.db.session import SessionLocal
    from app.models.all_models import User

    log = logging.getLogger("uvicorn.error")
    if os.environ.get("AUTO_SEED", "true").lower() == "false":
        return
    with SessionLocal() as db:
        if db.query(User).first() is not None:
            return
    backend_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    # Sites first, so the demo "today's shift" in seed_roles has a venue on the very first boot
    for script in ("sync_all_locations.py", "seed_suppliers.py", "seed_roles.py"):
        result = subprocess.run([sys.executable, script], cwd=backend_dir, capture_output=True, text=True)
        if result.returncode != 0:
            log.error("Demo data script %s failed: %s", script, result.stderr[-2000:])
        else:
            log.info("Demo data script %s done", script)
