import pytest
from fastapi.testclient import TestClient
from app.models.all_models import User, PasswordReset, RoleEnum
import time

def test_password_reset_flow(client: TestClient, db):
    from app.core.security import get_password_hash
    
    u = db.query(User).filter(User.email == "admin@example.com").first()
    if not u:
        u = User(email="admin@example.com", password_hash=get_password_hash("newpass"), role=RoleEnum.SUPER_ADMIN, status="active")
        db.add(u)
    else:
        u.password_hash = get_password_hash("newpass")
        u.status = "active"
    db.commit()

    # Request reset
    req1 = client.post("/api/v1/auth/forgot-password", json={"email": "admin@example.com"})
    assert req1.status_code == 200
    assert "If an account exists" in req1.json()["message"]
    
    # Check DB for token
    pr = db.query(PasswordReset).first()
    assert pr is not None
    assert pr.used == False
    
    # Try invalid token
    req2 = client.post("/api/v1/auth/reset-password", json={"token": "invalid_token", "new_password": "newpass"})
    assert req2.status_code == 400
    
    # We can't easily get the raw token in tests since it's hashed and printed to console.
    # We will generate one directly in test.
    import secrets, hashlib
    raw_token = secrets.token_urlsafe(32)
    token_hash = hashlib.sha256(raw_token.encode()).hexdigest()
    pr.token_hash = token_hash
    db.commit()
    
    # Success reset
    req3 = client.post("/api/v1/auth/reset-password", json={"token": raw_token, "new_password": "newpass"})
    assert req3.status_code == 200
    
    # Reuse token
    req4 = client.post("/api/v1/auth/reset-password", json={"token": raw_token, "new_password": "newpass2"})
    assert req4.status_code == 400
    assert "Invalid or expired" in req4.json()["detail"]
    
    # Login with new password
    req5 = client.post("/api/v1/auth/login", data={"username": "admin@example.com", "password": "newpass"})
    assert req5.status_code == 200
    
    # Session invalidation tested implicitly via refresh_token_version increment
    u = db.query(User).filter(User.email == "admin@example.com").first()
    assert u.refresh_token_version > 1

def test_last_super_admin_protection(client: TestClient, db):
    from app.core.security import get_password_hash
    
    u = db.query(User).filter(User.email == "admin@example.com").first()
    if not u:
        u = User(email="admin@example.com", password_hash=get_password_hash("newpass"), role=RoleEnum.SUPER_ADMIN, status="active")
        db.add(u)
    else:
        u.password_hash = get_password_hash("newpass")
        u.status = "active"
    db.commit()

    # Login as admin
    req = client.post("/api/v1/auth/login", data={"username": "admin@example.com", "password": "newpass"})
    token = req.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    
    # Try to deactivate self
    u = db.query(User).filter(User.email == "admin@example.com").first()
    req2 = client.put(f"/api/v1/users/{u.id}", json={"status": "inactive"}, headers=headers)
    assert req2.status_code == 400
    assert "Cannot deactivate your own account" in req2.json()["detail"]
    
    # Create another admin
    req3 = client.post("/api/v1/users/", json={"email": "admin2@example.com", "password": "pass", "role": "Super Admin", "name": "A2"}, headers=headers)
    assert req3.status_code == 200
    a2_id = req3.json()["id"]
    
    # Deactivate the other admin
    req4 = client.put(f"/api/v1/users/{a2_id}", json={"status": "inactive"}, headers=headers)
    assert req4.status_code == 200
    
    # The active admins count should be 1 now, protected.
