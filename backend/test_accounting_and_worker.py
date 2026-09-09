import requests
import sys

BASE_URL = "http://127.0.0.1:8000/api/v1"

def test_all():
    print("==================================================")
    print("1. Testing Accounting Custom Invoice Features")
    print("==================================================")
    # Login as Accounting
    acc_login = requests.post(
        f"{BASE_URL}/auth/login",
        data={"username": "accounting@example.com", "password": "devpass123"}
    )
    assert acc_login.status_code == 200, f"Accounting login failed: {acc_login.text}"
    acc_token = acc_login.json()["access_token"]
    acc_headers = {"Authorization": f"Bearer {acc_token}"}
    print("[OK] Logged in as accounting@example.com")

    # Fetch suppliers to ensure only names are needed
    sups_resp = requests.get(f"{BASE_URL}/suppliers/", headers=acc_headers)
    assert sups_resp.status_code == 200
    suppliers = sups_resp.json()
    assert len(suppliers) > 0
    sup = suppliers[0]
    print(f"[OK] Target supplier selected: '{sup['name']}' (ID: {sup['id']})")

    # Test custom invoice download with separate custom rate and billing unit
    for unit in ["PER_HOUR", "PER_DAY", "PER_EMPLOYEE"]:
        payload = {
            "supplier_id": sup["id"],
            "start_date": "2026-09-01",
            "end_date": "2026-09-30",
            "custom_rate": 55.0,
            "rate_unit": unit
        }
        res = requests.post(f"{BASE_URL}/accounting/invoices/custom/download", json=payload, headers=acc_headers)
        # If there are confirmed requests in that period, it will return 200 and PDF bytes
        print(f"  Testing custom invoice with rate_unit={unit}, custom_rate=55.0 -> Status: {res.status_code}")
        if res.status_code == 200:
            assert res.headers.get("content-type") == "application/pdf"
            print(f"  [OK] PDF generated successfully ({len(res.content)} bytes)")
        elif res.status_code == 400:
            print(f"  [INFO] No shift data for range (expected 400 with 'No workers found'): {res.json().get('detail')}")

    print("\n==================================================")
    print("2. Testing Worker Portal - Shift Status & Biometrics")
    print("==================================================")
    # Login as Worker
    w_login = requests.post(
        f"{BASE_URL}/auth/login",
        data={"username": "worker@example.com", "password": "devpass123"}
    )
    assert w_login.status_code == 200, f"Worker login failed: {w_login.text}"
    w_token = w_login.json()["access_token"]
    w_headers = {"Authorization": f"Bearer {w_token}"}
    print("[OK] Logged in as worker@example.com")

    # Fetch today's assignment
    today_resp = requests.get(f"{BASE_URL}/assignments/today", headers=w_headers)
    assert today_resp.status_code == 200, f"Assignment today failed: {today_resp.text}"
    assign_data = today_resp.json()
    print(f"[OK] Today's assigned venue: {assign_data.get('site_name')}")
    print(f"[OK] Initial attendance_status: '{assign_data.get('attendance_status')}' (Awaiting start shift)")
    assert assign_data.get("attendance_status") in ["NOT_STARTED", "CHECKED_IN", "CHECKED_OUT"]

    # Test Check-in validation: Wrong QR code should be rejected
    dummy_selfie = "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA="
    wrong_qr_resp = requests.post(
        f"{BASE_URL}/attendance/check-in",
        json={
            "assignment_id": assign_data["id"],
            "latitude": assign_data.get("site_lat", 25.2861),
            "longitude": assign_data.get("site_lng", 51.5310),
            "accuracy": 10.0,
            "qr_data": "MC:LOC:9999", # Invalid / wrong site
            "live_face_image": dummy_selfie
        },
        headers=w_headers
    )
    print(f"[OK] Wrong QR Code rejection test: Status {wrong_qr_resp.status_code} - Detail: {wrong_qr_resp.text}")
    assert wrong_qr_resp.status_code in [400, 403], "Expected rejection on wrong QR code"

    # Test Check-in validation: Outside geofence should be rejected
    geofence_fail_resp = requests.post(
        f"{BASE_URL}/attendance/check-in",
        json={
            "assignment_id": assign_data["id"],
            "latitude": 24.0000, # Far away in desert
            "longitude": 50.0000,
            "accuracy": 10.0,
            "qr_data": assign_data.get("qr_token") or f"MC:LOC:{assign_data['site_id']}",
            "live_face_image": dummy_selfie
        },
        headers=w_headers
    )
    print(f"✓ Geofence violation rejection test: Status {geofence_fail_resp.status_code} - Detail: {geofence_fail_resp.text}")
    assert geofence_fail_resp.status_code == 400, "Expected rejection on geofence mismatch"

    print("\nALL BACKEND TESTS PASSED!")

if __name__ == "__main__":
    test_all()
