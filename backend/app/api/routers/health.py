from fastapi import APIRouter
from app.core.config import settings

router = APIRouter()

@router.get("/")
def health_check():
    # Which database kind is in use tells at a glance whether data will survive a restart
    return {
        "status": "ok",
        "environment": settings.ENVIRONMENT,
        "database": "postgresql" if settings.DATABASE_URL.startswith("postgresql") else settings.DATABASE_URL.split(":", 1)[0],
    }
