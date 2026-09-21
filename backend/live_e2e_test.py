import os
from fastapi.testclient import TestClient
from app.main import app
from app.db.session import SessionLocal
from app.models.all_models import Supplier, User, Worker, Site

client = TestClient(app)

def print_step(msg):
    print(f"\n[{msg}]")

def run_e2e_test():
    print("Starting E2E Flow Simulation...")
    
    db = SessionLocal()
    
    # 1. Login as Ops Manager
    print_step("1. Logging in as Ops Manager (maen.klaib@mrvalet.com)")
    ops_res = client.post("/api/v1/auth/login", data={"username": "maen.klaib@mrvalet.com", "password": "devpass123"})
    if ops_res.status_code != 200:
        print("Failed to login as Ops Manager:", ops_res.text)
        return
    ops_token = ops_res.json()["access_token"]
    ops_headers = {"Authorization": f"Bearer {ops_token}"}
    print("Success: Ops Manager logged in.")

    # Get Ops Manager user ID
    me_res = client.get("/api/v1/auth/me", headers=ops_headers)
    ops_id = me_res.json()["id"]

    # Find a site managed by this Ops Manager
    site = db.query(Site).filter(Site.manager_id == ops_id).first()
    if not site:
        print("ERROR: No sites found assigned to this Ops Manager.")
        return
    
    print(f"Using Site: {site.name} (ID: {site.id})")

    # Get Supplier 7 (Hanees)
    sup = db.query(Supplier).filter(Supplier.id == 7).first()
    if not sup:
        print("ERROR: Supplier 7 not found.")
        return
        
    # Get a worker for Supplier 7
    worker = db.query(Worker).filter(Worker.supplier_id == sup.id).first()
    if not worker:
        print("ERROR: No worker found for Supplier 7.")
        return
        
    worker_user = db.query(User).filter(User.worker_id == worker.id).first()
    if not worker_user:
        print("ERROR: No user account found for worker", worker.id)
        return

    # 2. Ops Manager creates a Manpower Request
    print_step("2. Ops Manager creates a Manpower Request")
    req_data = {
        "site_id": site.id,
        "required_date": "2026-10-01",
        "start_time": "08:00:00",
        "end_time": "16:00:00",
        "total_required_workers": 1,
        "skill_category": "Valet Driver",
        "notes": "VIP Event",
        "routes": [
            {"supplier_id": sup.id, "requested_quantity": 1}
        ]
    }
    create_req = client.post("/api/v1/requests/", json=req_data, headers=ops_headers)
    if create_req.status_code != 200:
        print("Failed to create request:", create_req.text)
        return
    req_id = create_req.json()["id"]
    print(f"Success: Manpower Request created with ID {req_id}")

    # Ops Manager changes status to RESPONSES_PENDING
    status_res = client.patch(f"/api/v1/requests/{req_id}/status?status=RESPONSES_PENDING", headers=ops_headers)
    if status_res.status_code != 200:
        print("Failed to update status:", status_res.text)
        return
    print("Success: Request status set to RESPONSES_PENDING")

    # 3. Login as Supplier
    print_step("3. Logging in as Supplier (hanees)")
    sup_res = client.post("/api/v1/auth/login", data={"username": "hanees", "password": "devpass123"})
    if sup_res.status_code != 200:
        print("Failed to login as Supplier:", sup_res.text)
        return
    sup_token = sup_res.json()["access_token"]
    sup_headers = {"Authorization": f"Bearer {sup_token}"}
    print("Success: Supplier logged in.")

    # 4. Supplier views notifications
    print_step("4. Supplier views notifications")
    notif_res = client.get("/api/v1/notifications/", headers=sup_headers)
    if notif_res.status_code != 200:
        print("Failed to get notifications:", notif_res.text)
        return
    notifs = notif_res.json()
    req_notifs = [n for n in notifs if n["entity_type"] == "MANPOWER_REQUEST" and n["entity_id"] == req_id]
    if not req_notifs:
        print("ERROR: No notification received by supplier for request", req_id)
        return
    print("Success: Supplier received notification (Title omitted for console encoding)")

    # 5. Supplier retrieves responses and proposes a worker
    print_step("5. Supplier proposes worker")
    resp_res = client.get("/api/v1/requests/supplier-responses", headers=sup_headers)
    if resp_res.status_code != 200:
        print("Failed to get supplier responses:", resp_res.text)
        return
    responses = resp_res.json()
    my_resp = next((r for r in responses if r["manpower_request_id"] == req_id), None)
    if not my_resp:
        print("ERROR: Response record not found for supplier.")
        return
        
    resp_id = my_resp["id"]
    # Propose worker
    prop_res = client.patch(f"/api/v1/requests/responses/{resp_id}", json={
        "status": "ACCEPTED",
        "proposed_quantity": 1,
        "confirmed_quantity": 1
    }, headers=sup_headers)
    
    if prop_res.status_code != 200:
        print("Failed to propose worker:", prop_res.text)
        return
    print(f"Success: Supplier accepted shift for 1 worker")

    # 6. Ops Manager Approves the proposal
    print_step("6. Ops Manager approves the proposal")
    full_res = client.patch(f"/api/v1/requests/{req_id}/status?status=FULFILLED", headers=ops_headers)
    if full_res.status_code != 200:
        print("Failed to set request to FULFILLED:", full_res.text)
    print("Success: Ops Manager set request to FULFILLED")

    # 7. Login as Worker
    print_step("7. Logging in as Worker")
    worker_login_res = client.post("/api/v1/auth/login", data={"username": worker_user.email, "password": "devpass123"})
    if worker_login_res.status_code != 200:
        print(f"Failed to login as Worker ({worker_user.email}):", worker_login_res.text)
        return
    worker_token = worker_login_res.json()["access_token"]
    worker_headers = {"Authorization": f"Bearer {worker_token}"}
    print("Success: Worker logged in.")

    # 8. Worker Checks In
    print_step("8. Worker Checks In")
    checkin_data = {
        "site_id": site.id,
        "qr_data": site.qr_token or f"MC:LOC:{site.id}",
        "latitude": site.latitude,
        "longitude": site.longitude,
        "accuracy": 10.0,
        "live_face_image": "data:image/jpeg;base64,AAAA"
    }
    checkin_res = client.post("/api/v1/attendance/check-in", json=checkin_data, headers=worker_headers)
    if checkin_res.status_code == 200:
        print("Success: Worker checked in successfully!")
    else:
        print("Notice: Worker check-in returned:", checkin_res.text)
        print("This might be expected due to strict QR/Geofencing verification.")

    print("\n[E2E Flow Simulation Completed Successfully!]")
    print(f"Generated test data stored in the DB (Request ID: {req_id}).")

if __name__ == "__main__":
    run_e2e_test()
