import json
import pytest
from app.models.all_models import Site, RoleEnum, WorkerAssignment, User, Worker, Supplier, ManpowerRequest, SupplierResponse
from app.core.security import get_password_hash
from datetime import datetime, timezone
import uuid

def test_qr_security_checks(client, db):
    from tests.test_phase1b import get_auth_token
    token_admin = get_auth_token(client, db, "admin@example.com", "devpass123")
    headers_admin = {"Authorization": f"Bearer {token_admin}"}
    
    # 1. Create two sites
    site1 = client.post("/api/v1/sites/", json={"name": "QR Site 1", "latitude": 20.0, "longitude": 20.0, "geofence_radius_meters": 100}, headers=headers_admin).json()
    site2 = client.post("/api/v1/sites/", json={"name": "QR Site 2", "latitude": 30.0, "longitude": 30.0, "geofence_radius_meters": 100}, headers=headers_admin).json()
    
    # Generate QR for Site 1
    s1_qr_res = client.post(f"/api/v1/sites/{site1['id']}/qr", headers=headers_admin)
    assert s1_qr_res.status_code == 200
    qr_token_1 = s1_qr_res.json()["qr_token"]
    
    # Generate QR for Site 2
    s2_qr_res = client.post(f"/api/v1/sites/{site2['id']}/qr", headers=headers_admin)
    qr_token_2 = s2_qr_res.json()["qr_token"]
    
    # Generate Revoked QR for Site 1
    # We revoke the current one
    
    
    # Now generate a NEW active one for Site 1, so we have one active and one revoked
    # Actually wait, the revoke just sets qr_status='REVOKED'. The site only holds one qr_token natively, so the old one is revoked.
    # To test revoked, we can just use a fake token or set it up.
    # Let's just create a 3rd site, generate its QR, and revoke it.
    site3 = client.post("/api/v1/sites/", json={"name": "QR Site 3", "latitude": 40.0, "longitude": 40.0, "geofence_radius_meters": 100}, headers=headers_admin).json()
    qr_token_3 = client.post(f"/api/v1/sites/{site3['id']}/qr", headers=headers_admin).json()["qr_token"]
    client.patch(f"/api/v1/sites/{site3['id']}/qr/revoke", headers=headers_admin)
    
    # 2. Setup Worker and Assignment
    sup = client.post("/api/v1/suppliers/", json={"name": "QR Sup 1"}, headers=headers_admin).json()
    worker_res = client.post("/api/v1/workers/", json={"internal_worker_id": "W-QR-1", "supplier_id": sup["id"], "first_name": "A", "last_name": "B", "qid": f"QID-{uuid.uuid4().hex[:8]}", "password": "password123", "whatsapp_number": f"WAPP-{uuid.uuid4().hex[:8]}"}, headers=headers_admin)
    worker_id = worker_res.json()["id"]
    
    worker_db = db.query(Worker).filter(Worker.id == worker_id).first()
    worker_db.face_embedding = json.dumps([0.01]*512)
    db.commit()
    w_user = User(email="workerqr@att.com", password_hash=get_password_hash("pass"), role=RoleEnum.OUTSOURCE_WORKER, worker_id=worker_id)
    db.add(w_user)
    db.commit()
    
    # Give the worker an assignment at Site 2
    mr = ManpowerRequest(ops_manager_id=1, site_id=site2["id"], required_date=datetime.now(timezone.utc), start_time="09:00", end_time="17:00", total_required_workers=1, status="SUBMITTED")
    db.add(mr)
    db.flush()
    sr = SupplierResponse(manpower_request_id=mr.id, supplier_id=sup["id"], requested_quantity=1, confirmed_quantity=1, status="ACCEPTED")
    db.add(sr)
    db.flush()
    wa = WorkerAssignment(supplier_response_id=sr.id, worker_id=worker_id, status="ASSIGNED")
    db.add(wa)
    db.commit()
    assign_id = wa.id
    
    w_token = get_auth_token(client, db, "workerqr@att.com", "pass")
    w_headers = {"Authorization": f"Bearer {w_token}"}
    
    # TESTS
    # a. Invalid QR -> rejected
    res = client.post("/api/v1/attendance/check-in", json={"assignment_id": assign_id, "latitude": 30.0, "longitude": 30.0, "accuracy": 10, "qr_data": "FAKE_QR", "live_face_image": "FAKE_BASE64_IMAGE"}, headers=w_headers)
    assert res.status_code == 400
    assert "Invalid location QR" in res.json()["detail"]
    
    # b. Revoked QR -> rejected
    res = client.post("/api/v1/attendance/check-in", json={"assignment_id": assign_id, "latitude": 30.0, "longitude": 30.0, "accuracy": 10, "qr_data": qr_token_3, "live_face_image": "FAKE_BASE64_IMAGE"}, headers=w_headers)
    assert res.status_code == 400
    assert "Invalid location QR" in res.json()["detail"]
    
    # c. QR from another location -> rejected
    res = client.post("/api/v1/attendance/check-in", json={"assignment_id": assign_id, "latitude": 30.0, "longitude": 30.0, "accuracy": 10, "qr_data": qr_token_1, "live_face_image": "FAKE_BASE64_IMAGE"}, headers=w_headers)
    assert res.status_code == 403
    assert "You are not assigned" in res.json()["detail"]
    
    # d. Correct QR + GPS outside geofence -> rejected
    res = client.post("/api/v1/attendance/check-in", json={"assignment_id": assign_id, "latitude": 30.01, "longitude": 30.01, "accuracy": 10, "qr_data": qr_token_2, "live_face_image": "FAKE_BASE64_IMAGE"}, headers=w_headers)
    assert res.status_code == 400
    assert "outside" in res.json()["detail"]
    
    # e. Correct QR + poor GPS accuracy -> rejected
    res = client.post("/api/v1/attendance/check-in", json={"assignment_id": assign_id, "latitude": 30.0, "longitude": 30.0, "accuracy": 101, "qr_data": qr_token_2, "live_face_image": "FAKE_BASE64_IMAGE"}, headers=w_headers)
    assert res.status_code == 400
    
    # f. Valid QR + correct assignment + inside GPS -> accepted
    res = client.post("/api/v1/attendance/check-in", json={"assignment_id": assign_id, "latitude": 30.0, "longitude": 30.0, "accuracy": 10, "qr_data": qr_token_2, "live_face_image": "FAKE_BASE64_IMAGE"}, headers=w_headers)
    if res.status_code != 200:
        print(res.json())
    assert res.status_code == 200
    
    # g. Client attempts duplicate check-in -> rejected
    res = client.post("/api/v1/attendance/check-in", json={"assignment_id": assign_id, "latitude": 30.0, "longitude": 30.0, "accuracy": 10, "qr_data": qr_token_2, "live_face_image": "FAKE_BASE64_IMAGE"}, headers=w_headers)
    assert res.status_code == 400
    assert "Already checked in" in res.json()["detail"]

    # h. Unauthorized user cannot generate/revoke QR codes
    res = client.post(f"/api/v1/sites/{site2['id']}/qr", headers=w_headers)
    assert res.status_code == 403
    
    # Check-out Valid
    res = client.post("/api/v1/attendance/check-out", json={"assignment_id": assign_id, "latitude": 30.0, "longitude": 30.0, "accuracy": 10, "qr_data": qr_token_2, "live_face_image": "FAKE_BASE64_IMAGE"}, headers=w_headers)
    if res.status_code != 200:
        print(res.json())
    assert res.status_code == 200








