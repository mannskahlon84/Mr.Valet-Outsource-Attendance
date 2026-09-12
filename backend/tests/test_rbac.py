import pytest
from tests.test_phase1b import get_auth_token

def test_rbac_gm_readonly(client, db):
    from app.models.all_models import User, RoleEnum
    from app.core.security import get_password_hash
    
    gm = User(email="gm@example.com", password_hash=get_password_hash("pass"), role=RoleEnum.GENERAL_MANAGER)
    db.add(gm)
    db.commit()
    
    token = get_auth_token(client, db, "gm@example.com", "pass")
    headers = {"Authorization": f"Bearer {token}"}
    
    # Can read sites
    res = client.get("/api/v1/sites/", headers=headers)
    assert res.status_code == 200
    
    # Cannot create site
    res = client.post("/api/v1/sites/", json={"name": "GM Site", "latitude": 1, "longitude": 1, "geofence_radius_meters": 10}, headers=headers)
    assert res.status_code == 403

def test_rbac_ops_manager(client, db):
    from app.models.all_models import User, RoleEnum
    from app.core.security import get_password_hash
    
    ops = User(email="ops2@example.com", password_hash=get_password_hash("pass"), role=RoleEnum.OPS_MANAGER)
    db.add(ops)
    db.commit()
    
    token = get_auth_token(client, db, "ops2@example.com", "pass")
    headers = {"Authorization": f"Bearer {token}"}
    
    # Can create site
    res = client.post("/api/v1/sites/", json={"name": "Ops Site", "latitude": 1, "longitude": 1, "geofence_radius_meters": 10}, headers=headers)
    assert res.status_code == 200
    
    # Cannot create worker
    res = client.post("/api/v1/workers/", json={"internal_worker_id": "W-OPS-1", "first_name": "A", "last_name": "B", "supplier_id": 1, "qid": "29563413001", "password": "password123", "whatsapp_number": "+97455033001"}, headers=headers)
    assert res.status_code == 403

def test_rbac_supplier_head(client, db):
    from app.models.all_models import User, RoleEnum, Supplier
    from app.core.security import get_password_hash
    
    token_admin = get_auth_token(client, db, "admin@example.com", "devpass123")
    sup = client.post("/api/v1/suppliers/", json={"name": "Sup RBAC"}, headers={"Authorization": f"Bearer {token_admin}"}).json()
    sup2 = client.post("/api/v1/suppliers/", json={"name": "Sup RBAC 2"}, headers={"Authorization": f"Bearer {token_admin}"}).json()
    
    sup_head = User(email="sup2@example.com", password_hash=get_password_hash("pass"), role=RoleEnum.SUPPLIER_HEAD, supplier_id=sup["id"])
    db.add(sup_head)
    db.commit()
    
    token = get_auth_token(client, db, "sup2@example.com", "pass")
    headers = {"Authorization": f"Bearer {token}"}
    
    # Cannot create site
    res = client.post("/api/v1/sites/", json={"name": "Sup Site", "latitude": 1, "longitude": 1, "geofence_radius_meters": 10}, headers=headers)
    assert res.status_code == 403
    # Can request OTP for own worker
    res = client.post("/api/v1/workers/register-request", json={"internal_worker_id": "W-SUP-1", "first_name": "A", "last_name": "B", "supplier_id": sup["id"], "qid": "29563413002", "password": "password123", "whatsapp_number": "+97455033002"}, headers=headers)
    assert res.status_code == 200
    
    # Cannot request OTP for other supplier worker
    res = client.post("/api/v1/workers/register-request", json={"internal_worker_id": "W-SUP-2", "first_name": "A", "last_name": "B", "supplier_id": sup2["id"], "qid": "29563413003", "password": "password123", "whatsapp_number": "+97455033003"}, headers=headers)
    assert res.status_code == 403
