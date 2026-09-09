from pydantic_settings import BaseSettings
from typing import Optional

class Settings(BaseSettings):
    PROJECT_NAME: str = "Mr. Valet Parking Outsource Tracking"
    API_V1_STR: str = "/api/v1"
    SECRET_KEY: str = "supersecretkey"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    DATABASE_URL: str = "sqlite:///./test.db"  # Defaults to SQLite for immediate run
    ENVIRONMENT: str = "development"

    class Config:
        env_file = ".env"

settings = Settings()
