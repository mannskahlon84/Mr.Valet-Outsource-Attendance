#!/usr/bin/env bash
set -e

echo "=== Initializing Database & Running Seeds ==="
python seed_roles.py || echo "Warning: seed_roles encountered an issue"
python seed_suppliers.py || echo "Warning: seed_suppliers encountered an issue"
python sync_all_locations.py || echo "Warning: sync_all_locations encountered an issue"

echo "=== Starting FastAPI Server on port $PORT ==="
exec uvicorn app.main:app --host 0.0.0.0 --port "${PORT:-8000}"
