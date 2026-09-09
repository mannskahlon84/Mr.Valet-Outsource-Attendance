import pytest
from datetime import datetime, timezone, timedelta
from app.models.all_models import WorkerAssignment, Site, Worker, Supplier, User, RoleEnum, ManpowerRequest, SupplierResponse, Attendance
from tests.test_phase1b import get_auth_token
from app.core.security import get_password_hash

def test_reports_functionality(client, db):
    # Setup roles
    token_admin = get_auth_token(client, db, "admin@example.com", "devpass123")
    headers_admin = {"Authorization": f"Bearer {token_admin}"}
    
    # Check simple empty reports
    res = client.get("/api/v1/reports/attendance", headers=headers_admin)
    assert res.status_code == 200
    
    # We should have some data from the seeded locations and earlier tests, 
    # but let's create a dedicated historic dataset to be sure.
    site = client.post("/api/v1/sites/", json={"name": "Rep Site 1", "latitude": 0.0, "longitude": 0.0, "geofence_radius_meters": 100}, headers=headers_admin).json()
    site_id = site["id"]
    sup = client.post("/api/v1/suppliers/", json={"name": "Rep Sup 1"}, headers=headers_admin).json()
    sup_id = sup["id"]
    
    ops = User(email="rep_ops@example.com", password_hash=get_password_hash("pass"), role=RoleEnum.OPS_MANAGER)
    db.add(ops)
    db.flush()
    ops_id = ops.id
    
    # update site manager
    s = db.query(Site).filter(Site.id == site_id).first()
    s.manager_id = ops_id
    
    w1_res = client.post("/api/v1/workers/", json={"internal_worker_id": "W-REP-1", "supplier_id": sup_id, "first_name": "Hist", "last_name": "Work", "qid": "Q-REP-1", "password": "password123", "whatsapp_number": "W-REP-1"}, headers=headers_admin)
    w1_id = w1_res.json()["id"]
    
    db.commit()
    
    # Create two assignments for two different days
    now = datetime.now(timezone.utc)
    day1 = now - timedelta(days=5)
    day2 = now - timedelta(days=2)
    day3 = now + timedelta(days=1)
    
    # Day 1: Present (8 hours)
    mr1 = ManpowerRequest(ops_manager_id=ops_id, site_id=site_id, required_date=day1, start_time="09:00", end_time="17:00", total_required_workers=1, status="SUBMITTED")
    db.add(mr1)
    db.flush()
    sr1 = SupplierResponse(manpower_request_id=mr1.id, supplier_id=sup_id, requested_quantity=1, confirmed_quantity=1, status="ACCEPTED")
    db.add(sr1)
    db.flush()
    wa1 = WorkerAssignment(supplier_response_id=sr1.id, worker_id=w1_id, status="ASSIGNED")
    db.add(wa1)
    db.flush()
    att1 = Attendance(worker_assignment_id=wa1.id, check_in_time=day1, check_out_time=day1+timedelta(hours=8), status="CHECKED_OUT")
    db.add(att1)
    
    # Day 2: Absent
    mr2 = ManpowerRequest(ops_manager_id=ops_id, site_id=site_id, required_date=day2, start_time="09:00", end_time="17:00", total_required_workers=1, status="SUBMITTED")
    db.add(mr2)
    db.flush()
    sr2 = SupplierResponse(manpower_request_id=mr2.id, supplier_id=sup_id, requested_quantity=1, confirmed_quantity=1, status="ACCEPTED")
    db.add(sr2)
    db.flush()
    wa2 = WorkerAssignment(supplier_response_id=sr2.id, worker_id=w1_id, status="ASSIGNED")
    db.add(wa2)
    
    # Day 3: Future
    mr3 = ManpowerRequest(ops_manager_id=ops_id, site_id=site_id, required_date=day3, start_time="09:00", end_time="17:00", total_required_workers=1, status="SUBMITTED")
    db.add(mr3)
    db.flush()
    sr3 = SupplierResponse(manpower_request_id=mr3.id, supplier_id=sup_id, requested_quantity=1, confirmed_quantity=1, status="ACCEPTED")
    db.add(sr3)
    db.flush()
    wa3 = WorkerAssignment(supplier_response_id=sr3.id, worker_id=w1_id, status="ASSIGNED")
    db.add(wa3)
    db.commit()
    
    # 1. Fetch JSON Report
    res = client.get(f"/api/v1/reports/attendance?worker_id={w1_id}", headers=headers_admin)
    assert res.status_code == 200
    data = res.json()
    
    assert len(data['records']) == 3
    assert data['summary']['total_present_days'] == 1
    assert data['summary']['total_absent_days'] == 1
    assert data['summary']['total_duty_hours'] == 8.0
    
    # 2. Filter by Status (ABSENT)
    res = client.get(f"/api/v1/reports/attendance?worker_id={w1_id}&status=ABSENT", headers=headers_admin)
    assert len(res.json()['records']) == 1
    
    # 3. RBAC checks - Ops Manager
    token_ops = get_auth_token(client, db, "rep_ops@example.com", "pass")
    headers_ops = {"Authorization": f"Bearer {token_ops}"}
    res = client.get(f"/api/v1/reports/attendance", headers=headers_ops)
    assert res.status_code == 200
    # Ops manager should see the 3 records (since they own the site)
    assert any(r['worker_id'] == w1_id for r in res.json()['records'])
    
    # 4. Inactive worker shouldn't delete attendance
    client.patch(f"/api/v1/workers/{w1_id}/status?status=inactive", headers=headers_admin)
    res = client.get(f"/api/v1/reports/attendance?worker_id={w1_id}", headers=headers_admin)
    assert res.status_code == 200
    assert len(res.json()['records']) == 3
    
    # 5. Export Excel
    res = client.get(f"/api/v1/reports/attendance/export/excel?worker_id={w1_id}", headers=headers_admin)
    assert res.status_code == 200
    assert res.headers['content-type'] == 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    
    # 6. Export PDF
    res = client.get(f"/api/v1/reports/attendance/export/pdf?worker_id={w1_id}", headers=headers_admin)
    assert res.status_code == 200
    assert res.headers['content-type'] == 'application/pdf'
