import pytest
from fastapi.testclient import TestClient
from app.models.all_models import User, Site, Supplier, Worker, RoleEnum

def test_master_data_crud(client: TestClient, db):
    # Login as admin
    from app.core.security import get_password_hash
    
    u = db.query(User).filter(User.email == "admin@example.com").first()
    if not u:
        u = User(email="admin@example.com", password_hash=get_password_hash("newpass"), role=RoleEnum.SUPER_ADMIN, status="active")
        db.add(u)
    else:
        u.password_hash = get_password_hash("newpass")
        u.status = "active"
    db.commit()


    req = client.post("/api/v1/auth/login", data={"username": "admin@example.com", "password": "newpass"})
    token = req.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    
    # Create Site
    r1 = client.post("/api/v1/sites/", json={"name": "S1", "latitude": 10.0, "longitude": 20.0, "geofence_radius_meters": 100}, headers=headers)
    site_id = r1.json()["id"]
    
    # Update Site
    r2 = client.put(f"/api/v1/sites/{site_id}", json={"latitude": 15.0, "status": "inactive"}, headers=headers)
    assert r2.status_code == 200
    s = db.query(Site).filter(Site.id == site_id).first()
    assert s.latitude == 15.0
    assert s.status == "inactive"
    
    # Create Supplier
    r3 = client.post("/api/v1/suppliers/", json={"name": "Sup1"}, headers=headers)
    sup_id = r3.json()["id"]
    
    # Update Supplier
    r4 = client.put(f"/api/v1/suppliers/{sup_id}", json={"name": "Sup2", "status": "inactive"}, headers=headers)
    assert r4.status_code == 200
    sup = db.query(Supplier).filter(Supplier.id == sup_id).first()
    assert sup.name == "Sup2"
    assert sup.status == "inactive"
    
    # Create Worker
    client.put(f"/api/v1/suppliers/{sup_id}", json={"status": "active"}, headers=headers)
    r5 = client.post("/api/v1/workers/", json={"internal_worker_id": "W123", "first_name": "W", "last_name": "1", "qid": "123", "whatsapp_number": "+123456", "password": "pass", "supplier_id": sup_id}, headers=headers)
    print("r5:", r5.json())
    w_id = r5.json()["id"]
    
    # Update Worker
    r6 = client.put(f"/api/v1/workers/{w_id}", json={"qid": "456", "status": "inactive"}, headers=headers)
    assert r6.status_code == 200
    w = db.query(Worker).filter(Worker.id == w_id).first()
    assert w.qid == "456"
    assert w.status == "inactive"
    
