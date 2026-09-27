#!/usr/bin/env bash
set -e

echo "=== Updating database schema ==="
python -c "from app.db.migrate import run_migrations; run_migrations()"

# Demo data only where AUTO_SEED is on (development by default). The demo accounts share a
# published password, so production must never create them.
if python -c "from app.core.config import settings; import sys; sys.exit(0 if settings.auto_seed_enabled else 1)"; then
    echo "=== Loading demo data (AUTO_SEED) ==="
    python seed_roles.py || echo "Warning: seed_roles encountered an issue"
    python seed_suppliers.py || echo "Warning: seed_suppliers encountered an issue"
    python sync_all_locations.py || echo "Warning: sync_all_locations encountered an issue"
fi

echo "=== Starting FastAPI Server on port $PORT ==="
exec uvicorn app.main:app --host 0.0.0.0 --port "${PORT:-8000}"
