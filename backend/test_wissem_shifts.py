import sys
from datetime import date, timedelta
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

print("\n" + "="*75)
print("VERIFYING OPERATIONS MANAGER LOCATION ISOLATION & MULTI-SHIFT DISPATCH")
print("="*75)

# 1. Login as Wissem Chagtmi
login_res = client.post("/api/v1/auth/login", data={"username": "wissem.chagtmi@mrvalet.com", "password": "devpass123"})
assert login_res.status_code == 200, f"Wissem login failed: {login_res.text}"
wissem_token = login_res.json()["access_token"]
wissem_headers = {"Authorization": f"Bearer {wissem_token}"}
print("[PASS] Wissem Chagtmi logged in successfully.")

# 2. Check Sites returned for Wissem
sites_res = client.get("/api/v1/sites/", headers=wissem_headers)
assert sites_res.status_code == 200, f"Failed to get sites: {sites_res.text}"
wissem_sites = sites_res.json()
print(f"[PASS] Wissem retrieved {len(wissem_sites)} locations (strictly his assigned sites).")
for s in wissem_sites[:5]:
    print(f"       • ID {s['id']}: {s['name']}")
assert len(wissem_sites) == 25, f"Expected 25 sites for Wissem, got {len(wissem_sites)}"

# 3. Check Sites returned for Hani Abdelsallam
hani_login = client.post("/api/v1/auth/login", data={"username": "hani.abdelsallam@mrvalet.com", "password": "devpass123"})
assert hani_login.status_code == 200, f"Hani login failed: {hani_login.text}"
hani_token = hani_login.json()["access_token"]
hani_headers = {"Authorization": f"Bearer {hani_token}"}
hani_sites = client.get("/api/v1/sites/", headers=hani_headers).json()
print(f"[PASS] Hani Abdelsallam retrieved {len(hani_sites)} locations (strictly his assigned sites).")
assert len(hani_sites) == 18, f"Expected 18 sites for Hani, got {len(hani_sites)}"

# Verify no overlap between Wissem's and Hani's sites
wissem_ids = {s['id'] for s in wissem_sites}
hani_ids = {s['id'] for s in hani_sites}
overlap = wissem_ids.intersection(hani_ids)
assert len(overlap) == 0, f"Isolation failure! Sites overlap: {overlap}"
print("[PASS] Complete location isolation verified: 0 overlapping sites between managers.")

# 4. Get Suppliers for routing
sup_res = client.get("/api/v1/suppliers/", headers=wissem_headers)
suppliers = sup_res.json()
assert len(suppliers) > 0, "No suppliers available"
primary_sup_id = suppliers[0]["id"]
print(f"[PASS] Found {len(suppliers)} agency suppliers. Routing test to supplier ID: {primary_sup_id}")

# 5. Dispatch 2 shifts for Wissem's first site
target_site = wissem_sites[0]
target_date = (date.today() + timedelta(days=2)).isoformat()
print(f"\nDispatching 2 shifts for '{target_site['name']}' (ID: {target_site['id']}) on {target_date}:")

# Shift 1 (Morning)
shift1_payload = {
    "site_id": target_site["id"],
    "required_date": target_date,
    "start_time": "08:00",
    "end_time": "16:00",
    "total_required_workers": 5,
    "skill_category": "Valet Driver",
    "notes": "[Shift 1 (Morning)] Main hotel entrance",
    "routes": [{"supplier_id": primary_sup_id, "requested_quantity": 5}]
}
res1 = client.post("/api/v1/requests/", json=shift1_payload, headers=wissem_headers)
assert res1.status_code == 200, f"Shift 1 failed: {res1.text}"
shift1_id = res1.json()["id"]
print(f"[PASS] Shift 1 (Morning 08:00-16:00) dispatched -> Request ID #{shift1_id}")

# Shift 2 (Evening)
shift2_payload = {
    "site_id": target_site["id"],
    "required_date": target_date,
    "start_time": "16:00",
    "end_time": "00:00",
    "total_required_workers": 7,
    "skill_category": "VIP Valet Driver",
    "notes": "[Shift 2 (Evening)] Peak banquet arrival",
    "routes": [{"supplier_id": primary_sup_id, "requested_quantity": 7}]
}
res2 = client.post("/api/v1/requests/", json=shift2_payload, headers=wissem_headers)
assert res2.status_code == 200, f"Shift 2 failed: {res2.text}"
shift2_id = res2.json()["id"]
print(f"[PASS] Shift 2 (Evening 16:00-00:00) dispatched -> Request ID #{shift2_id}")

# 6. Verify GET /api/v1/requests/ returns both shifts with site_name
reqs_res = client.get("/api/v1/requests/", headers=wissem_headers)
assert reqs_res.status_code == 200
my_requests = reqs_res.json()
created_reqs = [r for r in my_requests if r["id"] in (shift1_id, shift2_id)]
assert len(created_reqs) == 2, f"Expected 2 created requests in list, found {len(created_reqs)}"

for r in created_reqs:
    print(f"[PASS] Request #{r['id']}: Site='{r['site_name']}' | Time={r['start_time']}-{r['end_time']} | Headcount={r['total_required_workers']} | Status={r['status']}")
    assert r["site_name"] == target_site["name"], f"Expected {target_site['name']}, got {r['site_name']}"

# 7. Verify Cross-Manager Security: Hani cannot dispatch request for Wissem's site
unauth_res = client.post("/api/v1/requests/", json=shift1_payload, headers=hani_headers)
assert unauth_res.status_code == 403, f"Expected 403 Forbidden for cross-manager site request, got {unauth_res.status_code}"
print("[PASS] Security enforcement verified: Hani cannot dispatch request for Wissem's location (HTTP 403).")

print("\n" + "="*75)
print("ALL OPERATIONS PORTAL VERIFICATION CHECKS PASSED SUCCESSFULLY!")
print("="*75 + "\n")
