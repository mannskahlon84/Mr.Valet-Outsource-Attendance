# PostgreSQL Validation Procedure
Because testing uses SQLite locally, you must validate PostgreSQL/PostGIS compatibility before production deployment.

## Prerequisites
1. Docker and docker-compose installed.
2. A running PostGIS container: docker run --name postgis -e POSTGRES_PASSWORD=mysecretpassword -p 5432:5432 -d postgis/postgis:15-3.3

## Validation Steps
1. Set DATABASE_URL=postgresql://postgres:mysecretpassword@localhost:5432/postgres in your .env file.
2. Run migrations: lembic upgrade head
3. Validate schema generation succeeds without type errors (e.g., PostGIS Geography type mapping).
4. Run pytest pointing to the PostgreSQL test DB (ensure 	est_auth and 	est_phase1b pass).
5. Verify geofence functions work by inserting a Site and executing a raw ST_DWithin spatial query.
