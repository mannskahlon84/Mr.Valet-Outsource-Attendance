from fastapi import APIRouter
from app.core.config import settings

router = APIRouter()

@router.get("/")
def health_check():
    # Which database kind is in use tells at a glance whether data will survive a restart
    return {
        "status": "ok",
        "environment": settings.ENVIRONMENT,
        "database": settings.DATABASE_URL.split(":", 1)[0].replace("postgres", "postgresql").replace("postgresqlql", "postgresql"),
    }
