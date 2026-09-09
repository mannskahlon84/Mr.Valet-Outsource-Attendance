import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.main import app
from app.db.base import Base
from app.db.session import get_db

SQLALCHEMY_DATABASE_URL = "sqlite:///./pytest.db"
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

@pytest.fixture(scope="function")
def db():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()

@pytest.fixture(scope="function")
def client(db):
    def override_get_db():
        try:
            yield db
        finally:
            pass
    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as c:
        yield c
import pytest
from unittest.mock import patch
from app.services import biometrics, duplicate_identity, liveness

@pytest.fixture(autouse=True)
def mock_biometric_pipeline():
    # Only mock when called with our dummy test string to avoid breaking actual biometric tests
    original_extract = biometrics.extract_face_embedding
    original_liveness = liveness.verify_liveness
    original_verify = biometrics.verify_face_match
    original_duplicate = duplicate_identity.check_duplicate_identity

    def mock_extract(img):
        if img == "FAKE_BASE64_IMAGE" or img == "VALID_BASE64":
            return [0.01] * 512
        elif img == "INVALID_FACE":
            raise ValueError("No face detected")
        return original_extract(img)
        
    def mock_liveness(img):
        if img == "LIVENESS_FAIL":
            return False, 0.1
        elif img in ["FAKE_BASE64_IMAGE", "VALID_BASE64", "INVALID_FACE", "DUPLICATE_FACE"]:
            return True, 0.99
        return original_liveness(img)
        
    def mock_duplicate(db, emb, wid, sid, dt=None):
        # We can trigger duplicate if the embedding is all 0.02 or we use a special flag, 
        # but check_duplicate_identity hits the db.
        # Let's just let the original function run because it's database-backed and safe to test!
        return original_duplicate(db, emb, wid, sid, dt)

    with patch('app.api.routers.attendance.extract_face_embedding', side_effect=mock_extract), \
         patch('app.api.routers.attendance.verify_liveness', side_effect=mock_liveness), \
         patch('app.api.routers.attendance.verify_face_match', side_effect=original_verify), \
         patch('app.api.routers.attendance.check_duplicate_identity', side_effect=mock_duplicate):
        yield
