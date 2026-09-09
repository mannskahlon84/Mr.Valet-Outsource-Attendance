import pytest
from app.models.all_models import User, RoleEnum
from app.core.security import get_password_hash
from app.models.all_models import AuditLog

def test_health(client):
    response = client.get("/health/")
    assert response.status_code == 200

def test_login_and_audit(client, db):
    if not db.query(User).filter(User.email=="test@example.com").first():
        user = User(email="test@example.com", password_hash=get_password_hash("password"), role=RoleEnum.OPS_MANAGER)
        db.add(user)
        db.commit()

    response = client.post("/api/v1/auth/login", data={"username": "test@example.com", "password": "wrongpassword"})
    assert response.status_code == 400

    response = client.post("/api/v1/auth/login", data={"username": "test@example.com", "password": "password"})
    assert response.status_code == 200
    token = response.json()["access_token"]
    
    audit = db.query(AuditLog).filter(AuditLog.action == "user_login").order_by(AuditLog.id.desc()).first()
    assert audit is not None
    assert audit.actor_role == RoleEnum.OPS_MANAGER.value
    
    # Test RBAC
    # User is Ops Manager, calling Super Admin only route should fail
    response = client.get("/api/v1/auth/protected-admin-only", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 403
    
    # Check Unauthorized access
    response = client.get("/api/v1/auth/protected-admin-only")
    assert response.status_code == 401

    # Test logout
    response = client.post('/api/v1/auth/logout', headers={'Authorization': f'Bearer {token}'})
    assert response.status_code == 200
    audit_logout = db.query(AuditLog).filter(AuditLog.action == 'user_logout').order_by(AuditLog.id.desc()).first()
    assert audit_logout is not None
