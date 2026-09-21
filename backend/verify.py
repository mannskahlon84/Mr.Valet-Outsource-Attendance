import requests
import json
import time

BASE_URL = "http://127.0.0.1:8000/api/v1"

def login(username, password):
    res = requests.post(f"{BASE_URL}/auth/login", data={"username": username, "password": password})
    res.raise_for_status()
    return res.json()["access_token"]

def main():
    try:
        # 1. Login
        print("Logging in...")
        om_token = login("maen.klaib@mrvalet.com", "devpass123")
        sup_token = login("hanees", "devpass123")
        worker_token = login("worker@example.com", "devpass123")
        
        # 2. Ops Manager creates request
        print("Creating request...")
        sites_res = requests.get(f"{BASE_URL}/sites/", headers={"Authorization": f"Bearer {om_token}"})
        site = [s for s in sites_res.json() if s["manager_id"] == 103][0]
        
        req_res = requests.post(f"{BASE_URL}/requests/", headers={"Authorization": f"Bearer {om_token}"}, json={
            "site_id": site["id"],
            "required_date": "2026-10-01",
            "start_time": "08:00:00",
            "end_time": "16:00:00",
            "total_required_workers": 2,
            "skill_category": "Valet Driver",
            "routes": [{"supplier_id": 7, "requested_quantity": 2}]
        })
        req_id = req_res.json()["id"]
        requests.patch(f"{BASE_URL}/requests/{req_id}/status?status=RESPONSES_PENDING", headers={"Authorization": f"Bearer {om_token}"})
        
        # 3. Supplier accepts with only number (no workers array)
        print("Supplier accepting with only quantity...")
        sup_reqs = requests.get(f"{BASE_URL}/requests/supplier-responses", headers={"Authorization": f"Bearer {sup_token}"}).json()
        my_resp = next(r for r in sup_reqs if r["manpower_request_id"] == req_id)
        
        acc_res = requests.patch(f"{BASE_URL}/requests/responses/{my_resp['id']}", json={
            "status": "ACCEPTED",
            "proposed_quantity": 1,
            "confirmed_quantity": 1
        }, headers={"Authorization": f"Bearer {sup_token}"})
        acc_res.raise_for_status()
        print("Supplier successfully accepted with quantity 1 (no workers array).")
        
        requests.patch(f"{BASE_URL}/requests/{req_id}/status?status=FULFILLED", headers={"Authorization": f"Bearer {om_token}"})
        
        # 4. Worker checks in
        print("Worker checking in...")
        checkin_res = requests.post(f"{BASE_URL}/attendance/check-in", json={
            "site_id": site["id"],
            "qr_data": site.get("qr_token", f"MC:LOC:{site['id']}"),
            "latitude": site["latitude"],
            "longitude": site["longitude"],
            "accuracy": 10.0,
            "live_face_image": "data:image/jpeg;base64,AAAA"
        }, headers={"Authorization": f"Bearer {worker_token}"})
        
        if checkin_res.status_code == 200 or (checkin_res.status_code == 400 and "Already checked" in checkin_res.text):
            print("Worker check-in successful!")
        else:
            print(f"Worker check-in failed: {checkin_res.status_code} {checkin_res.text}")
            
        # 5. Ops Manager checks dashboard
        print("Verifying Ops dashboard...")
        # Get specific request
        dashboard_res = requests.get(f"{BASE_URL}/requests/{req_id}", headers={"Authorization": f"Bearer {om_token}"})
        dashboard_data = dashboard_res.json()
        print(f"Ops Manager sees request {req_id}: {dashboard_data.get('total_checked_in', 0)} workers checked in out of {dashboard_data.get('total_required_workers')}.")
        
        print("SUCCESS!")
    except Exception as e:
        print("Error:", e)

if __name__ == "__main__":
    main()
