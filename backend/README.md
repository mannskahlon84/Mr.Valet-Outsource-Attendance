# Mr. Valet Parking Outsource Tracking
## Architecture Overview
- **Backend:** FastAPI, PostgreSQL, SQLAlchemy, Alembic
- **Web Portal:** Next.js (Phase 1B)
- **Mobile:** React Native Expo (Phase 1B)

## Local Development Setup (Phase 1A Backend)

### Environment Variables
Copy `.env.example` to `.env` and configure your database.
```bash
cp .env.example .env
```

### Database Setup & Migrations
Ensure PostgreSQL with PostGIS is running (for production).
```bash
alembic revision --autogenerate -m "Initial Schema"
alembic upgrade head
```

### Seed Data (Development Only)
```bash
python scripts/seed.py
```

### Run Tests
```bash
pytest tests/
```

### Run Server
```bash
uvicorn app.main:app --reload
```
