from pydantic_settings import BaseSettings
from typing import Optional
from pydantic import model_validator

class Settings(BaseSettings):
    PROJECT_NAME: str = "Mr. Valet Parking Outsource Tracking"
    API_V1_STR: str = "/api/v1"
    SECRET_KEY: str = "supersecretkey"
    JWT_SECRET_KEY: Optional[str] = None
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    DATABASE_URL: str = "sqlite:///./test.db"  # Defaults to SQLite for immediate run
    ENVIRONMENT: str = "development"

    @model_validator(mode="after")
    def handle_render_env(self):
        if self.JWT_SECRET_KEY and self.SECRET_KEY == "supersecretkey":
            self.SECRET_KEY = self.JWT_SECRET_KEY
        if self.DATABASE_URL.startswith("postgres://"):
            self.DATABASE_URL = self.DATABASE_URL.replace("postgres://", "postgresql://", 1)
        if self.ENVIRONMENT == "production" and self.DATABASE_URL.startswith("sqlite"):
            # A SQLite file on a hosted server is wiped on every restart/redeploy, taking all
            # requests and attendance with it. Refuse to start instead of silently losing data.
            raise ValueError("DATABASE_URL must point to PostgreSQL when ENVIRONMENT=production.")
        return self

    class Config:
        env_file = ".env"

settings = Settings()

