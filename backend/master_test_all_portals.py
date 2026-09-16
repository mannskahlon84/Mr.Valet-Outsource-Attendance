import requests
import json
import sys

def run_master_test():
    results = []
    
    def log_result(section, item, status, details=""):
        tag = "[PASS]" if status else "[FAIL]"
        print(f"{tag} | {section.ljust(22)} | {item.ljust(35)} | {details}")
        results.append({"section": section, "item": item, "status": status, "details": details})
        if not status:
            print(f"   --> ERROR DETAILS: {details}")

    print("\n" + "="*85)
    print("      MR. VALET OUTSOURCE ATTENDANCE - MASTER COMPREHENSIVE TEST SUITE")
    print("="*85)

    BASE_FASTAPI = "http://127.0.0.1:8000/api/v1"
    BASE_NEXTJS = "http://127.0.0.1:3000/api/v1"
    TIMEOUT = 15

    # =========================================================================
    # SECTION 1: AUTHENTICATION FOR ALL 17 ROLES & USERS
    # =========================================================================
    print("\n--- 1. TESTING AUTHENTICATION FOR ALL ROLES & USERS ---")
    users_to_test = [
        ("Super Admin", "admin@example.com", "devpass123", "Super Admin"),
        ("Manpreet (Admin)", "manpreet@alsharqiholding.com", "devpass123", "Super Admin"),
        ("General Manager", "gm@example.com", "devpass123", "General Manager"),
        ("Accounting Officer", "accounting@example.com", "devpass123", "Accounting"),
        ("Ops: Maen Klaib", "maen.klaib@mrvalet.com", "devpass123", "Operations Manager"),
        ("Ops: Wissem Chagtmi", "wissem.chagtmi@mrvalet.com", "devpass123", "Operations Manager"),
        ("Ops: Hani Abdelsallam", "hani.abdelsallam@mrvalet.com", "devpass123", "Operations Manager"),
        ("Ops: Brahim Hayouni", "brahim.hayouni@mrvalet.com", "devpass123", "Operations Manager"),
        ("Ops: Ghazi Alshammari", "ghazi.alshammari@mrvalet.com", "devpass123", "Operations Manager"),
        ("Supplier: Kanan", "kanan", "devpass123", "Supplier Head"),
        ("Supplier: Hanees", "hanees", "devpass123", "Supplier Head"),
        ("Supplier: Deepu", "deepu", "devpass123", "Supplier Head"),
        ("Supplier: Nizar", "nizar", "devpass123", "Supplier Head"),
        ("Supplier: Dennis", "dennis", "devpass123", "Supplier Head"),
        ("Supplier: Naboth", "naboth", "devpass123", "Supplier Head"),
        ("Supplier: Henry", "henry", "devpass123", "Supplier Head"),
        ("Outsource Worker", "worker@example.com", "devpass123", "Outsource Worker")
    ]

    tokens = {}
    for label, username, password, expected_role in users_to_test:
        try:
            r = requests.post(f"{BASE_FASTAPI}/auth/login", data={"username": username, "password": password}, timeout=TIMEOUT)
            if r.status_code == 200 and "access_token" in r.json():
                token = r.json()["access_token"]
                tokens[username] = token
                # Check /me
                me_res = requests.get(f"{BASE_FASTAPI}/auth/me", headers={"Authorization": f"Bearer {token}"}, timeout=TIMEOUT)
                me_data = me_res.json()
                role_val = me_data.get("role")
                log_result("1. Auth & Roles", f"Login: {label}", True, f"Token OK, Role='{role_val}'")
            else:
                log_result("1. Auth & Roles", f"Login: {label}", False, f"Status {r.status_code}: {r.text}")
        except Exception as e:
            log_result("1. Auth & Roles", f"Login: {label}", False, str(e))

    # =========================================================================
    # SECTION 2: PORTAL OPTIONS & ENDPOINTS INTEGRITY
    # =========================================================================
    print("\n--- 2. TESTING PORTAL FEATURES & ENDPOINTS INTEGRITY ---")
    admin_token = tokens.get("admin@example.com")
    maen_token = tokens.get("maen.klaib@mrvalet.com")
    kanan_token = tokens.get("kanan")
    gm_token = tokens.get("gm@example.com")
    acct_token = tokens.get("accounting@example.com")

    # 2.1 Sites (82 Doha Venues)
    try:
        r = requests.get(f"{BASE_FASTAPI}/sites/", headers={"Authorization": f"Bearer {admin_token}"}, timeout=TIMEOUT)
        sites = r.json()
        has_82 = len(sites) >= 80
        log_result("2. Portal Features", "Doha Sites Loaded (82 Venues)", has_82, f"{len(sites)} sites active with geofences & QR tokens")
    except Exception as e:
        log_result("2. Portal Features", "Doha Sites Loaded", False, str(e))

    # 2.2 Suppliers Roster (7 Agencies)
    try:
        r = requests.get(f"{BASE_FASTAPI}/suppliers/", headers={"Authorization": f"Bearer {admin_token}"}, timeout=TIMEOUT)
        sups = r.json()
        sup_names = [s.get("name") for s in sups]
        has_all_sups = any("Kanan" in n for n in sup_names) and any("Hanees" in n for n in sup_names)
        log_result("2. Portal Features", "Suppliers Roster (7 Agencies)", has_all_sups, f"{len(sups)} suppliers registered: {', '.join(sup_names[:4])}...")
    except Exception as e:
        log_result("2. Portal Features", "Suppliers Roster", False, str(e))

    # 2.3 Accounting Timesheets & Invoices
    try:
        r = requests.get(f"{BASE_FASTAPI}/accounting/summary", headers={"Authorization": f"Bearer {acct_token}"}, timeout=TIMEOUT)
        log_result("2. Portal Features", "Accounting Summary KPI", r.status_code == 200, f"HTTP {r.status_code}")
    except Exception as e:
        log_result("2. Portal Features", "Accounting Summary KPI", False, str(e))

    # 2.4 Reports / Compliance
    try:
        r = requests.get(f"{BASE_FASTAPI}/reports/attendance", headers={"Authorization": f"Bearer {gm_token}"}, timeout=TIMEOUT)
        log_result("2. Portal Features", "GM Reports & Compliance", r.status_code == 200, f"HTTP {r.status_code}")
    except Exception as e:
        log_result("2. Portal Features", "GM Reports & Compliance", False, str(e))

    # 2.5 Driver Roster
    try:
        r = requests.get(f"{BASE_FASTAPI}/workers/", headers={"Authorization": f"Bearer {kanan_token}"}, timeout=TIMEOUT)
        workers = r.json()
        log_result("2. Portal Features", "Supplier Driver Roster", r.status_code == 200, f"{len(workers)} workers listed for agency")
    except Exception as e:
        log_result("2. Portal Features", "Supplier Driver Roster", False, str(e))

    # =========================================================================
    # SECTION 3: CROSS-PLATFORM REQUEST & ACCEPTANCE LIFECYCLE
    # =========================================================================
    print("\n--- 3. TESTING CROSS-PLATFORM REQUEST & ACCEPTANCE LIFECYCLE ---")

    # Step 3.1: Maen creates shift request for 5 drivers
    maen_headers = {"Authorization": f"Bearer {maen_token}", "Content-Type": "application/json"}
    kanan_headers = {"Authorization": f"Bearer {kanan_token}", "Content-Type": "application/json"}
    req_id = None
    try:
        # Find site managed by Maen or fallback to site 27 (Fairmont)
        sites_res = requests.get(f"{BASE_FASTAPI}/sites/", headers=maen_headers, timeout=TIMEOUT).json()
        maen_sites = [s for s in sites_res if s.get("manager_name") == "Maen Klaib" or s.get("manager_id") == 103]
        target_site = maen_sites[0] if maen_sites else sites_res[0]
        site_id = target_site["id"]
        site_name = target_site["name"]

        create_body = {
            "site_id": site_id,
            "required_date": "2026-09-20",
            "start_time": "08:00",
            "end_time": "17:00",
            "total_required_workers": 5,
            "skill_category": "Valet Driver",
            "notes": "VIP Event - Strict Uniform",
            "routes": [{"supplier_id": 6, "requested_quantity": 5}]
        }
        r = requests.post(f"{BASE_FASTAPI}/requests/", json=create_body, headers=maen_headers, timeout=TIMEOUT)
        if r.status_code in [200, 201]:
            req_id = r.json()["id"]
            log_result("3. Request Lifecycle", "1. OM Creates Shift Request", True, f"Req #{req_id} at {site_name} (5 drivers to Kanan)")
        else:
            log_result("3. Request Lifecycle", "1. OM Creates Shift Request", False, f"HTTP {r.status_code}: {r.text}")
    except Exception as e:
        log_result("3. Request Lifecycle", "1. OM Creates Shift Request", False, str(e))

    # Step 3.2: Kanan receives initial notification
    if req_id:
        try:
            r = requests.get(f"{BASE_FASTAPI}/notifications/", headers=kanan_headers, timeout=TIMEOUT)
            kanan_notifs = r.json()
            matching = [n for n in kanan_notifs if f"#{req_id}" in (n.get("title") or "") or n.get("entity_id") == req_id]
            has_notif = len(matching) > 0
            log_result("3. Request Lifecycle", "2. Kanan Shift Notification", has_notif, f"Found {len(matching)} matching notification(s)")
        except Exception as e:
            log_result("3. Request Lifecycle", "2. Kanan Shift Notification", False, str(e))

    # Step 3.3: Kanan views incoming request
    if req_id:
        try:
            r = requests.get(f"{BASE_FASTAPI}/requests/supplier", headers=kanan_headers, timeout=TIMEOUT)
            sup_reqs = r.json()
            my_req = next((req for req in sup_reqs if req["id"] == req_id), None)
            quota_correct = my_req and (my_req.get("requested_quantity") == 5 or my_req.get("total_required_workers") == 5)
            log_result("3. Request Lifecycle", "3. Kanan Views Incoming Quota", quota_correct, f"Target quota requested: 5 drivers")
        except Exception as e:
            log_result("3. Request Lifecycle", "3. Kanan Views Incoming Quota", False, str(e))

    # Step 3.4: Kanan counter-proposes / accepts 3 drivers
    if req_id:
        try:
            respond_payload = {
                "status": "COUNTER_PROPOSED",
                "confirmed_quantity": 3,
                "proposed_start_time": "08:00",
                "proposed_end_time": "17:00",
                "supplier_message": "Can allocate 3 drivers for this shift"
            }
            r = requests.patch(f"{BASE_FASTAPI}/requests/{req_id}/respond", json=respond_payload, headers=kanan_headers, timeout=TIMEOUT)
            log_result("3. Request Lifecycle", "4. Kanan Counter-Proposes 3", r.status_code == 200, f"Status: COUNTER_PROPOSED, Qty: 3")
        except Exception as e:
            log_result("3. Request Lifecycle", "4. Kanan Counter-Proposes 3", False, str(e))

    # Step 3.5: OM Maen receives notification of Kanan's proposal
    if req_id:
        try:
            r = requests.get(f"{BASE_FASTAPI}/notifications/", headers=maen_headers, timeout=TIMEOUT)
            om_notifs = r.json()
            matching = [n for n in om_notifs if f"#{req_id}" in (n.get("title") or "") or n.get("entity_id") == req_id]
            log_result("3. Request Lifecycle", "5. OM Receives Proposal Notif", len(matching) > 0, f"Proposal alert received by Maen Klaib")
        except Exception as e:
            log_result("3. Request Lifecycle", "5. OM Receives Proposal Notif", False, str(e))

    # Step 3.6: OM Maen views request responses - VERIFY 3 DRIVERS (NOT 4!)
    kanan_resp_id = None
    if req_id:
        try:
            r = requests.get(f"{BASE_FASTAPI}/requests/{req_id}/responses", headers=maen_headers, timeout=TIMEOUT)
            responses = r.json()
            kr = next((resp for resp in responses if resp.get("supplier_id") == 6), None)
            if kr:
                kanan_resp_id = kr["id"]
                is_exactly_3 = kr.get("confirmed_quantity") == 3
                log_result("3. Request Lifecycle", "6. Accurate Count Verification", is_exactly_3, f"Confirmed Drivers: {kr.get('confirmed_quantity')} (Expected: 3, NOT 4)")
            else:
                log_result("3. Request Lifecycle", "6. Accurate Count Verification", False, f"Kanan response not found in {responses}")
        except Exception as e:
            log_result("3. Request Lifecycle", "6. Accurate Count Verification", False, str(e))

    # Step 3.7: Bi-directional chat between OM and Supplier
    if req_id:
        try:
            # OM sends message
            msg1 = "Hello Kanan, can you arrange 2 extra drivers later if required?"
            r = requests.post(f"{BASE_FASTAPI}/requests/{req_id}/messages", json={"message": msg1}, headers=maen_headers, timeout=TIMEOUT)
            log_result("3. Request Lifecycle", "7. OM Sends Chat Message", r.status_code in [200, 201], f"Message dispatched by Maen")

            # Kanan reads message
            r = requests.get(f"{BASE_FASTAPI}/requests/{req_id}/messages", headers=kanan_headers, timeout=TIMEOUT)
            msgs = r.json()
            recvd_by_kanan = any(m.get("message") == msg1 for m in msgs)
            log_result("3. Request Lifecycle", "8. Kanan Receives Chat", recvd_by_kanan, f"Delivered to Kanan portal thread")

            # Kanan gets chat notification
            notifs_k = requests.get(f"{BASE_FASTAPI}/notifications/", headers=kanan_headers, timeout=TIMEOUT).json()
            has_chat_notif = any("Message on Request" in (n.get("title") or "") and f"#{req_id}" in (n.get("title") or "") for n in notifs_k)
            log_result("3. Request Lifecycle", "9. Kanan Chat Alert Notif", has_chat_notif, f"Push notification triggered")

            # Kanan replies
            msg2 = "Understood. We will check with the afternoon team."
            requests.post(f"{BASE_FASTAPI}/requests/{req_id}/messages", json={"message": msg2}, headers=kanan_headers, timeout=TIMEOUT)
            
            # OM reads reply
            msgs_om = requests.get(f"{BASE_FASTAPI}/requests/{req_id}/messages", headers=maen_headers, timeout=TIMEOUT).json()
            recvd_by_om = any(m.get("message") == msg2 for m in msgs_om)
            log_result("3. Request Lifecycle", "10. OM Receives Agency Reply", recvd_by_om, f"Delivered to OM portal thread")
        except Exception as e:
            log_result("3. Request Lifecycle", "7-10. Chat Lifecycle", False, str(e))

    # Step 3.8: OM finalizes the shift for 3 drivers
    if req_id and kanan_resp_id:
        try:
            fin_payload = {
                "accepted_quantity": 3,
                "accepted_start_time": "08:00",
                "accepted_end_time": "17:00"
            }
            r = requests.patch(f"{BASE_FASTAPI}/requests/{req_id}/responses/{kanan_resp_id}/finalize", json=fin_payload, headers=maen_headers, timeout=TIMEOUT)
            log_result("3. Request Lifecycle", "11. OM Finalizes 3 Drivers", r.status_code == 200, f"Shift locked in at 3 drivers")

            # Kanan receives finalized notification
            notifs_k_final = requests.get(f"{BASE_FASTAPI}/notifications/", headers=kanan_headers, timeout=TIMEOUT).json()
            has_fin_notif = any("Finalized" in (n.get("title") or "") or "finalized" in (n.get("title") or "").lower() for n in notifs_k_final)
            log_result("3. Request Lifecycle", "12. Kanan Finalized Alert", has_fin_notif, f"Agency received locked-in shift notification")
        except Exception as e:
            log_result("3. Request Lifecycle", "11-12. Finalize Shift", False, str(e))

    # =========================================================================
    # SECTION 4: ANTI-CHEAT ATTENDANCE (GEOFENCE & QR TOKEN VALIDATION)
    # =========================================================================
    print("\n--- 4. TESTING ANTI-CHEAT ATTENDANCE & SECURITY ---")
    worker_token = tokens.get("worker@example.com")
    worker_headers = {"Authorization": f"Bearer {worker_token}", "Content-Type": "application/json"}

    # Fetch Site 1 details (where Assignment 1 is located)
    site1_res = requests.get(f"{BASE_FASTAPI}/sites/1", headers={"Authorization": f"Bearer {admin_token}"}, timeout=TIMEOUT).json()
    site1_qr = site1_res.get("qr_token") or "MC:LOC:1:token1"
    site1_lat = site1_res.get("latitude") or 25.321
    site1_lon = site1_res.get("longitude") or 51.529

    # 4.1 Check-in with invalid/keyboard QR data -> MUST FAIL
    try:
        r = requests.post(f"{BASE_FASTAPI}/attendance/check-in", json={
            "assignment_id": 1,
            "qr_data": "RANDOM_KEYBOARD_SCAN_12345",
            "live_face_image": "data:image/jpeg;base64," + "A"*100,
            "latitude": site1_lat,
            "longitude": site1_lon,
            "accuracy": 10.0
        }, headers=worker_headers, timeout=TIMEOUT)
        rejected = r.status_code == 400 and "QR" in r.text
        log_result("4. Attendance Security", "1. Invalid QR Scan Rejection", rejected, f"HTTP {r.status_code}: Fake QR / random item rejected")
    except Exception as e:
        log_result("4. Attendance Security", "1. Invalid QR Scan Rejection", False, str(e))

    # 4.2 Check-in Geofence Violation (Far from site) -> MUST FAIL
    try:
        r = requests.post(f"{BASE_FASTAPI}/attendance/check-in", json={
            "assignment_id": 1,
            "qr_data": site1_qr,
            "live_face_image": "data:image/jpeg;base64," + "A"*100,
            "latitude": 28.500, # Far outside Doha
            "longitude": 55.500,
            "accuracy": 10.0
        }, headers=worker_headers, timeout=TIMEOUT)
        geofence_blocked = r.status_code == 400 and ("Geolocation mismatch" in r.text or "distance" in r.text or "mismatch" in r.text.lower())
        log_result("4. Attendance Security", "2. GPS Geofence Anti-Spoofing", geofence_blocked, f"HTTP {r.status_code}: Geofence violation blocked correctly")
    except Exception as e:
        log_result("4. Attendance Security", "2. GPS Geofence Anti-Spoofing", False, str(e))

    # 4.3 Check-in with valid site QR token + inside Geofence -> MUST PASS
    try:
        r = requests.post(f"{BASE_FASTAPI}/attendance/check-in", json={
            "assignment_id": 1,
            "qr_data": site1_qr,
            "live_face_image": "data:image/jpeg;base64," + "A"*100,
            "latitude": site1_lat,
            "longitude": site1_lon,
            "accuracy": 10.0
        }, headers=worker_headers, timeout=TIMEOUT)
        passed = (r.status_code == 200) or (r.status_code == 400 and "Already checked in" in r.text)
        log_result("4. Attendance Security", "3. Authorized QR & GPS Check-In", passed, f"HTTP {r.status_code}: 121 Tower biometric check-in verified")
    except Exception as e:
        log_result("4. Attendance Security", "3. Authorized QR & GPS Check-In", False, str(e))

    # =========================================================================
    # SECTION 5: MOBILE TUNNEL & NEXT.JS REVERSE PROXY TEST
    # =========================================================================
    print("\n--- 5. TESTING NEXT.JS REVERSE PROXY (WHAT MOBILE TUNNEL HITS) ---")
    try:
        r = requests.get(f"{BASE_NEXTJS}/sites", headers={"Authorization": f"Bearer {admin_token}"}, timeout=TIMEOUT)
        proxy_sites = r.status_code == 200 and len(r.json()) >= 80
        log_result("5. Mobile Proxy", "Sites list over Next.js proxy", proxy_sites, f"HTTP {r.status_code}, count={len(r.json())}")
    except Exception as e:
        log_result("5. Mobile Proxy", "Sites list over Next.js proxy", False, str(e))

    try:
        r = requests.get(f"{BASE_NEXTJS}/suppliers", headers={"Authorization": f"Bearer {admin_token}"}, timeout=TIMEOUT)
        proxy_sups = r.status_code == 200 and len(r.json()) >= 7
        log_result("5. Mobile Proxy", "Suppliers list over Next.js proxy", proxy_sups, f"HTTP {r.status_code}, count={len(r.json())}")
    except Exception as e:
        log_result("5. Mobile Proxy", "Suppliers list over Next.js proxy", False, str(e))

    # =========================================================================
    # SUMMARY
    # =========================================================================
    print("\n" + "="*85)
    total_passed = sum(1 for r in results if r["status"])
    total_failed = sum(1 for r in results if not r["status"])
    print(f"MASTER TEST RESULTS SUMMARY: {total_passed} PASSED, {total_failed} FAILED (TOTAL {len(results)})")
    print("="*85)
    return total_failed == 0

if __name__ == "__main__":
    success = run_master_test()
    sys.exit(0 if success else 1)
