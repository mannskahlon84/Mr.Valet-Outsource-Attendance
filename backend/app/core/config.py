from pydantic_settings import BaseSettings
from typing import Optional
from pydantic import model_validator

# The old public default; a token signed with it could be forged by anyone who read the repo
INSECURE_SECRET_KEYS = {"supersecretkey", "development_secret_key_change_in_production", "changeme", "secret"}


class Settings(BaseSettings):
    PROJECT_NAME: str = "Mr. Valet Parking Outsource Tracking"
    API_V1_STR: str = "/api/v1"
    SECRET_KEY: str = "supersecretkey"
    JWT_SECRET_KEY: Optional[str] = None
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    DATABASE_URL: str = "sqlite:///./test.db"  # Defaults to SQLite for immediate run
    ENVIRONMENT: str = "development"

    # Browser origins allowed to call the API directly, comma-separated. Empty in production
    # when the web app reaches the API through its own same-origin /api/v1 proxy.
    ALLOWED_ORIGINS: Optional[str] = None
    # Where password-reset links point (the web app's public address)
    FRONTEND_URL: str = "http://localhost:3000"
    # Load demo accounts into an empty database. Defaults to on only in development.
    AUTO_SEED: Optional[bool] = None

    # Outgoing email for password resets. Without SMTP_HOST, reset links are only logged in development.
    SMTP_HOST: Optional[str] = None
    SMTP_PORT: int = 587
    SMTP_USERNAME: Optional[str] = None
    SMTP_PASSWORD: Optional[str] = None
    SMTP_FROM: Optional[str] = None
    SMTP_USE_TLS: bool = True

    # Failed-login lockout
    LOGIN_MAX_FAILURES_PER_USER: int = 5
    LOGIN_MAX_FAILURES_PER_IP: int = 20
    LOGIN_LOCKOUT_MINUTES: int = 15

    @property
    def is_production(self) -> bool:
        return self.ENVIRONMENT.strip().lower() == "production"

    @property
    def cors_origins(self) -> list:
        if self.ALLOWED_ORIGINS is not None:
            return [o.strip().rstrip("/") for o in self.ALLOWED_ORIGINS.split(",") if o.strip()]
        # Local development: the web app on :3000 calls the API on :8000 directly
        return [] if self.is_production else ["*"]

    @property
    def auto_seed_enabled(self) -> bool:
        return self.AUTO_SEED if self.AUTO_SEED is not None else not self.is_production

    @model_validator(mode="after")
    def handle_render_env(self):
        self.ENVIRONMENT = self.ENVIRONMENT.strip().lower()
        if self.JWT_SECRET_KEY and self.SECRET_KEY == "supersecretkey":
            self.SECRET_KEY = self.JWT_SECRET_KEY
        # Hosts hand out postgres://, postgresql:// or postgresql+psycopg:// URLs; always use the
        # driver this project installs (psycopg2-binary), whatever the URL asks for
        url = self.DATABASE_URL.strip()
        for prefix in ("postgresql+psycopg2://", "postgresql+psycopg://", "postgresql://", "postgres://"):
            if url.startswith(prefix):
                url = "postgresql+psycopg2://" + url[len(prefix):]
                break
        self.DATABASE_URL = url
        if self.is_production:
            if self.DATABASE_URL.startswith("sqlite"):
                # A SQLite file on a hosted server is wiped on every restart/redeploy, taking all
                # requests and attendance with it. Refuse to start instead of silently losing data.
                raise ValueError("DATABASE_URL must point to PostgreSQL when ENVIRONMENT=production.")
            if self.SECRET_KEY in INSECURE_SECRET_KEYS or len(self.SECRET_KEY) < 32:
                # Anyone could forge login tokens with a public or short key
                raise ValueError("SECRET_KEY must be a random value of at least 32 characters when ENVIRONMENT=production "
                                 "(e.g. python -c \"import secrets; print(secrets.token_urlsafe(48))\").")
        return self

    class Config:
        env_file = ".env"

settings = Settings()
