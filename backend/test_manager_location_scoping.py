import requests
import json
import sys

BASE_FASTAPI = "http://127.0.0.1:8000/api/v1"
BASE_NEXTJS = "http://127.0.0.1:3000/api/v1"
TIMEOUT = 10

MANAGERS = [
    {
        "name": "Maen Klaib",
        "email": "maen.klaib@mrvalet.com",
        "expected_count": 30,
        "sample_site": "Fairmont Hotel",
        "other_mgr_site": "Al Maha Island" # Managed by Brahim
    },
    {
        "name": "Wissem Chagtmi",
        "email": "wissem.chagtmi@mrvalet.com",
        "expected_count": 25,
        "sample_site": "Banana Island",
        "other_mgr_site": "Fairmont Hotel" # Managed by Maen
    },
    {
        "name": "Hani Abdelsallam",
        "email": "hani.abdelsallam@mrvalet.com",
        "expected_count": 19,
        "sample_site": "121 Tower",
        "other_mgr_site": "Banana Island" # Managed by Wissem
    },
    {
        "name": "Brahim Hayouni",
        "email": "brahim.hayouni@mrvalet.com",
        "expected_count": 5,
        "sample_site": "Al Maha Island",
        "other_mgr_site": "121 Tower" # Managed by Hani
    },
    {
        "name": "Ghazi Alshammari",
        "email": "ghazi.alshammari@mrvalet.com",
        "expected_count": 3,
        "sample_site": "M Gallery hotel",
        "other_mgr_site": "Al Maha Island" # Managed by Brahim
    }
]

def run_test():
    print("=" * 80)
    print("   OPERATIONS MANAGERS LOCATION SCOPING & ISOLATION TEST")
    print("=" * 80)

    passed_all = True
    
    # 1. Test Admin sees all 82 sites
    r_admin = requests.post(f"{BASE_FASTAPI}/auth/login", data={"username": "admin@example.com", "password": "devpass123"}, timeout=TIMEOUT)
    admin_token = r_admin.json()["access_token"]
    all_sites = requests.get(f"{BASE_FASTAPI}/sites/", headers={"Authorization": f"Bearer {admin_token}"}, timeout=TIMEOUT).json()
    all_sites_map = {s["name"]: s["id"] for s in all_sites}
    print(f"[INFO] Super Admin loaded {len(all_sites)} total Doha venues.\n")

    for mgr in MANAGERS:
        name = mgr["name"]
        email = mgr["email"]
        expected_count = mgr["expected_count"]
        sample_site = mgr["sample_site"]
        other_site = mgr["other_mgr_site"]

        print(f"--- Testing {name} ({email}) ---")

        # 1. Login
        login_res = requests.post(f"{BASE_FASTAPI}/auth/login", data={"username": email, "password": "devpass123"}, timeout=TIMEOUT)
        if login_res.status_code != 200:
            print(f"[FAIL] Login failed for {name}: {login_res.text}")
            passed_all = False
            continue
        token = login_res.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}

        # 2. Query Sites via FastAPI
        sites_fastapi = requests.get(f"{BASE_FASTAPI}/sites/", headers=headers, timeout=TIMEOUT).json()
        site_names = [s["name"] for s in sites_fastapi]
        count_ok = (len(sites_fastapi) == expected_count)
        has_sample = sample_site in site_names
        no_other = other_site not in site_names

        status_tag = "[PASS]" if (count_ok and has_sample and no_other) else "[FAIL]"
        print(f"{status_tag} FastAPI Sites: count={len(sites_fastapi)}/{expected_count}, has '{sample_site}'={has_sample}, isolated from '{other_site}'={no_other}")
        if not (count_ok and has_sample and no_other):
            passed_all = False

        # 3. Query Sites via Next.js Proxy
        sites_nextjs = requests.get(f"{BASE_NEXTJS}/sites", headers=headers, timeout=TIMEOUT).json()
        nj_names = [s["name"] for s in sites_nextjs]
        nj_count_ok = (len(sites_nextjs) == expected_count)
        nj_has_sample = sample_site in nj_names
        nj_no_other = other_site not in nj_names

        nj_tag = "[PASS]" if (nj_count_ok and nj_has_sample and nj_no_other) else "[FAIL]"
        print(f"{nj_tag} Next.js Sites: count={len(sites_nextjs)}/{expected_count}, has '{sample_site}'={nj_has_sample}, isolated from '{other_site}'={nj_no_other}")
        if not (nj_count_ok and nj_has_sample and nj_no_other):
            passed_all = False

        # 4. Security Enforcement: Can create request for own site
        sample_site_id = all_sites_map.get(sample_site)
        req_own_payload = {
            "site_id": sample_site_id,
            "required_date": "2026-09-21",
            "start_time": "08:00",
            "end_time": "16:00",
            "total_required_workers": 2,
            "skill_category": "Valet Driver",
            "notes": "Scoped shift test",
            "routes": [{"supplier_id": 6, "requested_quantity": 2}]
        }
        res_own = requests.post(f"{BASE_FASTAPI}/requests/", json=req_own_payload, headers=headers, timeout=TIMEOUT)
        can_req_own = res_own.status_code in [200, 201]
        print(f"{'[PASS]' if can_req_own else '[FAIL]'} Create Shift for Own Site ('{sample_site}'): HTTP {res_own.status_code}")
        if not can_req_own:
            passed_all = False

        # 5. Security Enforcement: CANNOT create request for another manager's site
        other_site_id = all_sites_map.get(other_site)
        req_other_payload = {
            "site_id": other_site_id,
            "required_date": "2026-09-21",
            "start_time": "08:00",
            "end_time": "16:00",
            "total_required_workers": 2,
            "skill_category": "Valet Driver",
            "notes": "Unauthorized cross-manager shift test",
            "routes": [{"supplier_id": 6, "requested_quantity": 2}]
        }
        res_other = requests.post(f"{BASE_FASTAPI}/requests/", json=req_other_payload, headers=headers, timeout=TIMEOUT)
        blocked_other = res_other.status_code == 403
        print(f"{'[PASS]' if blocked_other else '[FAIL]'} Blocked from Other Site ('{other_site}'): HTTP {res_other.status_code} (Expected 403 Forbidden)\n")
        if not blocked_other:
            passed_all = False

    print("=" * 80)
    print(f"FINAL RESULT: {'ALL TESTS PASSED (100% ISOLATION VERIFIED)' if passed_all else 'SOME TESTS FAILED'}")
    print("=" * 80)
    return passed_all

if __name__ == "__main__":
    success = run_test()
    sys.exit(0 if success else 1)
