import hashlib
import secrets
from datetime import datetime, timedelta

import pytest
from sqlalchemy import create_engine, inspect

from app.core.config import Settings
from app.core.security import get_password_hash
from app.db.base import Base
from app.models.all_models import PasswordReset, RoleEnum, User


def make_admin(db, email="secure-admin@example.com", password="Real#Pass2026"):
    user = User(email=email, password_hash=get_password_hash(password), role=RoleEnum.SUPER_ADMIN, status="active")
    db.add(user)
    db.commit()
    return user


def login(client, username, password):
    return client.post("/api/v1/auth/login", data={"username": username, "password": password})


@pytest.mark.parametrize("old_master_password", ["devpass123", "Supplier123!"])
def test_former_master_passwords_no_longer_log_in(client, db, old_master_password):
    make_admin(db)
    assert login(client, "secure-admin@example.com", old_master_password).status_code == 400
    assert login(client, "secure-admin@example.com", "Real#Pass2026").status_code == 200


def test_repeated_failures_lock_the_login_name(client, db):
    make_admin(db)
    for _ in range(5):
        assert login(client, "secure-admin@example.com", "wrong-guess-1").status_code == 400
    # Even the right password is refused while locked out
    res = login(client, "Secure-Admin@example.com ", "Real#Pass2026")
    assert res.status_code == 429
    assert "Too many failed" in res.json()["detail"]


def test_successful_login_resets_the_failure_count(client, db):
    make_admin(db)
    for _ in range(4):
        login(client, "secure-admin@example.com", "wrong-guess-1")
    assert login(client, "secure-admin@example.com", "Real#Pass2026").status_code == 200
    for _ in range(4):
        login(client, "secure-admin@example.com", "wrong-guess-1")
    assert login(client, "secure-admin@example.com", "Real#Pass2026").status_code == 200


def test_many_failures_from_one_address_are_blocked(client, db):
    make_admin(db)
    headers = {"X-Forwarded-For": "203.0.113.7"}
    for n in range(20):
        client.post("/api/v1/auth/login", data={"username": f"nobody{n}@example.com", "password": "x"}, headers=headers)
    res = client.post("/api/v1/auth/login", data={"username": "secure-admin@example.com", "password": "Real#Pass2026"}, headers=headers)
    assert res.status_code == 429
    # Another address is unaffected
    assert login(client, "secure-admin@example.com", "Real#Pass2026").status_code == 200


def test_reset_password_rejects_weak_passwords(client, db):
    user = make_admin(db)
    raw = secrets.token_urlsafe(32)
    db.add(PasswordReset(user_id=user.id, token_hash=hashlib.sha256(raw.encode()).hexdigest(),
                         expires_at=datetime.utcnow() + timedelta(minutes=30)))
    db.commit()
    for weak in ["short1", "onlyletters", "12345678901", "devpass123"]:
        res = client.post("/api/v1/auth/reset-password", json={"token": raw, "new_password": weak})
        assert res.status_code == 400, weak
    res = client.post("/api/v1/auth/reset-password", json={"token": raw, "new_password": "Brand1NewPass"})
    assert res.status_code == 200


def test_security_headers_on_api_responses(client):
    res = client.get("/health/")
    assert res.headers["x-content-type-options"] == "nosniff"
    assert res.headers["x-frame-options"] == "DENY"
    assert res.headers["referrer-policy"] == "no-referrer"


def test_production_refuses_insecure_settings():
    pg = "postgresql://u:p@db:5432/app"
    with pytest.raises(ValueError, match="SECRET_KEY"):
        Settings(ENVIRONMENT="production", DATABASE_URL=pg, SECRET_KEY="supersecretkey")
    with pytest.raises(ValueError, match="SECRET_KEY"):
        Settings(ENVIRONMENT="production", DATABASE_URL=pg, SECRET_KEY="too-short")
    with pytest.raises(ValueError, match="PostgreSQL"):
        Settings(ENVIRONMENT="production", DATABASE_URL="sqlite:///x.db", SECRET_KEY="k" * 40)

    ok = Settings(ENVIRONMENT="Production ", DATABASE_URL=pg, SECRET_KEY=secrets.token_urlsafe(48))
    assert ok.is_production
    assert ok.cors_origins == []
    assert ok.auto_seed_enabled is False


def test_development_defaults():
    dev = Settings(ENVIRONMENT="development", DATABASE_URL="sqlite:///x.db")
    assert dev.cors_origins == ["*"]
    assert dev.auto_seed_enabled is True
    explicit = Settings(ENVIRONMENT="production", DATABASE_URL="postgresql://u:p@h/d", SECRET_KEY="k" * 40,
                        ALLOWED_ORIGINS="https://app.example.com/, https://www.example.com", AUTO_SEED=False)
    assert explicit.cors_origins == ["https://app.example.com", "https://www.example.com"]


def migrate(monkeypatch, url):
    from app.db import migrate as migrate_module
    engine = create_engine(url)
    monkeypatch.setattr(migrate_module, "engine", engine)
    migrate_module.run_migrations()
    return engine


def alembic_revision(engine):
    with engine.connect() as conn:
        return conn.exec_driver_sql("SELECT version_num FROM alembic_version").scalar()


def test_migrations_build_a_new_database(monkeypatch, tmp_path):
    engine = migrate(monkeypatch, f"sqlite:///{tmp_path}/fresh.db")
    assert set(Base.metadata.tables) <= set(inspect(engine).get_table_names())
    assert alembic_revision(engine) == "0002_login_attempts_indexes"


def test_migrations_upgrade_a_pre_migration_production_database(monkeypatch, tmp_path):
    """A database made by the old create_all() startup gets stamped, then gains the new table."""
    from alembic import command
    from app.db.migrate import alembic_config

    # The schema as it existed before migrations, with no record of any migration having run
    url = f"sqlite:///{tmp_path}/legacy.db"
    with create_engine(url).connect() as conn:
        command.upgrade(alembic_config(conn), "0001_baseline")
        conn.exec_driver_sql("DROP TABLE alembic_version")
        conn.commit()
        assert "login_attempts" not in inspect(conn).get_table_names()

    engine = migrate(monkeypatch, url)
    assert "login_attempts" in inspect(engine).get_table_names()
    assert alembic_revision(engine) == "0002_login_attempts_indexes"
    # Running again on every restart is a no-op
    migrate(monkeypatch, url)
    assert alembic_revision(engine) == "0002_login_attempts_indexes"
