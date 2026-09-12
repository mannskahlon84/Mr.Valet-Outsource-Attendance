def test_phase1d_workflow(client, db):
    from tests.test_phase1b import get_auth_token
    from app.models.all_models import User, RoleEnum
    from app.core.security import get_password_hash
    from datetime import datetime, timezone, timedelta
    
    # 1. Setup Data
    token_admin = get_auth_token(client, db, "admin@example.com", "devpass123")
    headers_admin = {"Authorization": f"Bearer " + token_admin}
    
    
    # Create ops manager
    ops = User(email="ops@example.com", password_hash=get_password_hash("pass"), role=RoleEnum.OPS_MANAGER)
    db.add(ops)
    db.commit()

    res = client.post("/api/v1/sites/", json={"name": "P1D Site", "latitude": 10.0, "longitude": 10.0, "geofence_radius_meters": 100, "manager_id": ops.id}, headers=headers_admin)
    site_id = res.json()["id"]

    sup = client.post("/api/v1/suppliers/", json={"name": "P1D Sup"}, headers=headers_admin).json()
    sup_id = sup["id"]
    
    # Create supplier head
    sup_head = User(email="suphead@example.com", password_hash=get_password_hash("pass"), role=RoleEnum.SUPPLIER_HEAD, supplier_id=sup_id)
    db.add(sup_head)
    db.commit()
    
    ops_token = get_auth_token(client, db, "ops@example.com", "pass")
    headers_ops = {"Authorization": f"Bearer {ops_token}"}
    
    sup_token = get_auth_token(client, db, "suphead@example.com", "pass")
    headers_sup = {"Authorization": f"Bearer {sup_token}"}
    
    # Create workers for this supplier
    workers = []
    for i in range(3):
        w = client.post("/api/v1/workers/", json={"internal_worker_id": f"W-P1D-{i}", "qid": f"2956341100{i}", "password": "password123", "whatsapp_number": f"+9745502100{i}", "supplier_id": sup_id, "first_name": "W", "last_name": str(i)}, headers=headers_admin).json()
        workers.append(w["id"])
        
    req_date = (datetime.now(timezone.utc) + timedelta(days=2)).date().isoformat()
        
    # 2. Ops Manager Creates Request
    req = {
        "site_id": site_id,
        "required_date": req_date,
        "start_time": "08:00",
        "end_time": "16:00",
        "total_required_workers": 2,
        "routes": [{"supplier_id": sup_id, "requested_quantity": 2}]
    }
    mr = client.post("/api/v1/requests/", json=req, headers=headers_ops)
    assert mr.status_code == 200
    mr_id = mr.json()["id"]
    
    # 3. Supplier Head Views Responses
    resps = client.get("/api/v1/requests/supplier-responses", headers=headers_sup)
    assert resps.status_code == 200
    my_resp = [r for r in resps.json() if r["manpower_request_id"] == mr_id][0]
    resp_id = my_resp["id"]
    
    # 4. Supplier Head Accepts Request (Qty: 2)
    patch_res = client.patch(f"/api/v1/requests/responses/{resp_id}", json={"status": "ACCEPTED", "confirmed_quantity": 2}, headers=headers_sup)
    assert patch_res.status_code == 200
    
    # 5. Supplier Head Allocates Workers
    alloc_res = client.post(f"/api/v1/allocations/{resp_id}/allocate-workers", json={"worker_ids": workers[:2]}, headers=headers_sup)
    assert alloc_res.status_code == 200
    assert alloc_res.json()["allocated"] == 2
    
    # 6. Supplier Head Attempts to Over-Allocate (Should Fail)
    alloc_fail = client.post(f"/api/v1/allocations/{resp_id}/allocate-workers", json={"worker_ids": workers}, headers=headers_sup)
    assert alloc_fail.status_code == 400
    
    # 7. Worker Conflict Check
    # Ops creates ANOTHER request for same time
    req2 = {
        "site_id": site_id,
        "required_date": req_date,
        "start_time": "09:00",  # Overlaps 08:00-16:00
        "end_time": "12:00",
        "total_required_workers": 1,
        "routes": [{"supplier_id": sup_id, "requested_quantity": 1}]
    }
    mr2 = client.post("/api/v1/requests/", json=req2, headers=headers_ops).json()
    resps2 = client.get("/api/v1/requests/supplier-responses", headers=headers_sup).json()
    resp2_id = [r for r in resps2 if r["manpower_request_id"] == mr2["id"]][0]["id"]
    
    client.patch(f"/api/v1/requests/responses/{resp2_id}", json={"status": "ACCEPTED", "confirmed_quantity": 1}, headers=headers_sup)
    
    # Attempt to allocate worker 0 again
    alloc_conflict = client.post(f"/api/v1/allocations/{resp2_id}/allocate-workers", json={"worker_ids": [workers[0]]}, headers=headers_sup)
    assert alloc_conflict.status_code == 400
    assert "time conflict" in alloc_conflict.json()["detail"].lower()
    
    # Allocate worker 2 (no conflict)
    alloc_ok = client.post(f"/api/v1/allocations/{resp2_id}/allocate-workers", json={"worker_ids": [workers[2]]}, headers=headers_sup)
    assert alloc_ok.status_code == 200
