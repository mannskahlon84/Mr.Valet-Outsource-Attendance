import pytest
from datetime import datetime, timezone, timedelta

def create_real_assignment(client, headers_admin, headers_sup, site_id, sup_id, worker_id, required_date_iso):
    # Create request
    req = {
        "site_id": site_id,
        "required_date": required_date_iso[:10],
        "start_time": "09:00",
        "end_time": "17:00",
        "total_required_workers": 1,
        "routes": [{"supplier_id": sup_id, "requested_quantity": 1}]
    }
    mr = client.post("/api/v1/requests/", json=req, headers=headers_admin).json()
    
    # Sup fetches responses
    resps = client.get("/api/v1/requests/supplier-responses", headers=headers_sup).json()
    my_resp = [r for r in resps if r["manpower_request_id"] == mr["id"]][0]
    resp_id = my_resp["id"]
    
    # Sup confirms 1
    client.patch(f"/api/v1/requests/responses/{resp_id}", json={"status": "ACCEPTED", "confirmed_quantity": 1}, headers=headers_sup)
    
    # Sup allocates
    alloc = client.post(f"/api/v1/allocations/{resp_id}/allocate-workers", json={"worker_ids": [worker_id]}, headers=headers_sup).json()
    
    # Return the created assignment
    # We don't have a GET /assignments/ for admin yet, but we can just fetch it from DB for tests
    return mr["id"]
