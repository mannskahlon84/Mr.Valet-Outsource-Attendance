import pytest
import io
from app.models.all_models import Supplier, Worker, Site

def get_auth_token(client, db, email="admin@example.com", password="password"):
    res = client.post("/api/v1/auth/login", data={"username": email, "password": password})
    if res.status_code != 200:
        from app.models.all_models import User, RoleEnum
        from app.core.security import get_password_hash
        user = db.query(User).filter(User.email == email).first()
        if user:
            user.password_hash = get_password_hash(password)
            user.status = "active"
        else:
            user = User(email=email, password_hash=get_password_hash(password), role=RoleEnum.SUPER_ADMIN, status="active")
            db.add(user)
        db.commit()
        res = client.post("/api/v1/auth/login", data={"username": email, "password": password})
    return res.json()["access_token"]


def test_suppliers_crud(client, db):
    token = get_auth_token(client, db, "admin@example.com", "devpass123")
    headers = {"Authorization": f"Bearer " + token}
    
    # Create
    res = client.post("/api/v1/suppliers/", json={"name": "Test Supplier", "contact_person": "Bob"}, headers=headers)
    assert res.status_code == 200
    sup_id = res.json()["id"]
    
    # Read
    res = client.get("/api/v1/suppliers/", headers=headers)
    assert len(res.json()) >= 1
    
    # Deactivate
    res = client.patch("/api/v1/suppliers/" + str(sup_id) + "/status?status=inactive", headers=headers)
    assert res.status_code == 200
    assert res.json()["status"] == "inactive"

def test_workers_crud(client, db):
    token = get_auth_token(client, db, "admin@example.com", "devpass123")
    headers = {"Authorization": f"Bearer " + token}
    
    sup = client.post("/api/v1/suppliers/", json={"name": "Active Sup"}, headers=headers).json()
    
    # Create Worker
    res = client.post("/api/v1/workers/", json={
        "internal_worker_id": "W-999",
        "supplier_id": sup["id"],
        "first_name": "John",
        "last_name": "Smith"
    , "qid": "QID-7f16df0b", "password": "password123", "whatsapp_number": "WAPP-7f16df0b"}, headers=headers)
    assert res.status_code == 200
    w_id = res.json()["id"]
    
    # Read Worker
    res = client.get("/api/v1/workers/", headers=headers)
    assert len(res.json()) >= 1
    
    # Deactivate Worker
    res = client.patch("/api/v1/workers/" + str(w_id) + "/status?status=inactive", headers=headers)
    assert res.status_code == 200
    assert res.json()["status"] == "inactive"

def test_bulk_import(client, db):
    token = get_auth_token(client, db, "admin@example.com", "devpass123")
    headers = {"Authorization": f"Bearer " + token}
    
    sup = client.post("/api/v1/suppliers/", json={"name": "Bulk Sup"}, headers=headers).json()
    s_id = sup["id"]
    
    csv_content = f"internal_worker_id,supplier_id,first_name,last_name,phone\nB-1,{s_id},A,B,123\nB-1,{s_id},C,D,123\nB-2,9999,E,F,123"
    files = {"file": ("test.csv", io.BytesIO(csv_content.encode("utf-8")), "text/csv")}
    
    # Preview
    res = client.post("/api/v1/workers/bulk-import/preview", headers=headers, files=files)
    assert res.status_code == 200
    data = res.json()
    assert data["invalid_count"] == 2 # 1 duplicate, 1 bad supplier
    assert data["valid_count"] == 1
    
    # Commit
    files2 = {"file": ("test.csv", io.BytesIO(csv_content.encode("utf-8")), "text/csv")}
    res = client.post("/api/v1/workers/bulk-import/commit", headers=headers, files=files2)
    assert res.status_code == 200
    assert res.json()["imported"] == 1
    assert res.json()["skipped"] == 2

def test_sites_crud(client, db):
    token = get_auth_token(client, db, "admin@example.com", "devpass123")
    headers = {"Authorization": f"Bearer " + token}
    
    res = client.post("/api/v1/sites/", json={"name": "Test Site", "latitude": 12.34, "longitude": 56.78, "geofence_radius_meters": 150}, headers=headers)
    assert res.status_code == 200
    
    # Invalid lat/lng
    res = client.post("/api/v1/sites/", json={"name": "Bad Site", "latitude": 95.0, "longitude": 0.0, "geofence_radius_meters": 10}, headers=headers)
    assert res.status_code == 422
def test_rbac_supplier_head(client, db):
    # Setup admin to create suppliers and workers
    token_admin = get_auth_token(client, db, "admin@example.com", "devpass123")
    headers_admin = {"Authorization": f"Bearer " + token_admin}
    
    # Create 2 suppliers
    sup1 = client.post("/api/v1/suppliers/", json={"name": "Supplier A"}, headers=headers_admin).json()
    sup2 = client.post("/api/v1/suppliers/", json={"name": "Supplier B"}, headers=headers_admin).json()
    
    # Create a worker for sup2
    client.post("/api/v1/workers/", json={"internal_worker_id": "W-SUP2", "supplier_id": sup2["id"], "first_name": "Sup", "last_name": "Two", "qid": "QID-cf8bb42c", "password": "password123", "whatsapp_number": "WAPP-cf8bb42c"}, headers=headers_admin)
    
    # Create Supplier Head user for sup1
    from app.models.all_models import User, RoleEnum
    from app.core.security import get_password_hash
    head_user = User(email="head@suppliera.com", password_hash=get_password_hash("pass"), role=RoleEnum.SUPPLIER_HEAD, supplier_id=sup1["id"])
    db.add(head_user)
    db.commit()
    
    token_head = get_auth_token(client, db, "head@suppliera.com", "pass")
    headers_head = {"Authorization": f"Bearer " + token_head}
    
    # Supplier head fetches workers
    res = client.get("/api/v1/workers/", headers=headers_head)
    assert res.status_code == 200
    workers = res.json()
    
    # Should not see sup2's worker
    for w in workers:
        assert w["supplier_id"] == sup1["id"]
        assert w["internal_worker_id"] != "W-SUP2"
