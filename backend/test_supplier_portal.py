import requests
import sys

BASE_URL = "http://127.0.0.1:8000/api/v1"

def test_supplier():
    print("1. Logging in as supplier@example.com...")
    login_resp = requests.post(
        f"{BASE_URL}/auth/login",
        data={"username": "supplier@example.com", "password": "devpass123"}
    )
    if login_resp.status_code != 200:
        print(f"Login failed: {login_resp.status_code} {login_resp.text}")
        sys.exit(1)
    
    token = login_resp.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    print("   Supplier login successful!")

    print("\n2. Testing GET /api/v1/workers/next-id...")
    next_id_resp = requests.get(f"{BASE_URL}/workers/next-id", headers=headers)
    assert next_id_resp.status_code == 200, f"Error: {next_id_resp.text}"
    next_worker_id = next_id_resp.json().get("next_id")
    print(f"   Next worker ID in series: {next_worker_id}")
    assert next_worker_id.startswith("WRK-"), f"Unexpected ID: {next_worker_id}"

    print("\n3. Testing GET /api/v1/sites/ (Supplier should have read access, no 403 or 500)...")
    sites_resp = requests.get(f"{BASE_URL}/sites/", headers=headers)
    assert sites_resp.status_code == 200, f"Sites endpoint error: {sites_resp.status_code} {sites_resp.text}"
    sites = sites_resp.json()
    print(f"   Successfully fetched {len(sites)} sites without error!")

    print("\n4. Testing GET /api/v1/requests/supplier...")
    req_resp = requests.get(f"{BASE_URL}/requests/supplier", headers=headers)
    assert req_resp.status_code == 200, f"Supplier requests error: {req_resp.text}"
    requests_list = req_resp.json()
    print(f"   Supplier has {len(requests_list)} shift requests.")
    if requests_list:
        sample_req = requests_list[0]
        req_id = sample_req["id"]
        print(f"   Sample request ID: {req_id}, Site: {sample_req.get('site_name')}")
        
        print(f"\n5. Testing GET /api/v1/requests/{req_id} (used by Respond & Assign detail page)...")
        detail_resp = requests.get(f"{BASE_URL}/requests/{req_id}", headers=headers)
        assert detail_resp.status_code == 200, f"Detail error: {detail_resp.status_code} {detail_resp.text}"
        detail_data = detail_resp.json()
        print(f"   Request #{req_id} detail loaded successfully! Site Name: {detail_data.get('site_name')}")

    print("\n6. Testing POST /api/v1/workers/ (enroll new driver)...")
    test_qid = f"999{next_worker_id.replace('-', '')}001"[-11:].zfill(11)
    test_mobile = f"+97455{next_worker_id.replace('-', '')}01"[-12:]
    
    new_worker_payload = {
        "first_name": "TestAuto",
        "last_name": "Driver",
        "internal_worker_id": "WILL_BE_OVERRIDDEN_BY_SYSTEM",
        "qid": test_qid,
        "whatsapp_number": test_mobile,
        "password": "devpass123"
    }
    create_worker_resp = requests.post(f"{BASE_URL}/workers/", json=new_worker_payload, headers=headers)
    assert create_worker_resp.status_code == 200, f"Worker create failed: {create_worker_resp.status_code} {create_worker_resp.text}"
    created_worker = create_worker_resp.json()
    print(f"   Created worker: ID={created_worker['id']}, Internal Worker ID={created_worker['internal_worker_id']}")
    assert created_worker["internal_worker_id"] == next_worker_id, f"Expected {next_worker_id}, got {created_worker['internal_worker_id']}"
    print(f"   SUCCESS: System assigned internal worker ID in series ({created_worker['internal_worker_id']})!")

    print("\n7. Verifying next series ID increments...")
    after_id_resp = requests.get(f"{BASE_URL}/workers/next-id", headers=headers)
    assert after_id_resp.status_code == 200
    after_worker_id = after_id_resp.json().get("next_id")
    print(f"   New next worker ID in series: {after_worker_id}")
    assert after_worker_id != next_worker_id, "Worker ID series did not advance!"

    print("\nALL SUPPLIER TESTS PASSED! Both bugs verified completely resolved.")

if __name__ == "__main__":
    test_supplier()
