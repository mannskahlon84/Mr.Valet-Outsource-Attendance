import requests
import json
import sys
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')

def test_flow(base_url):
    print(f"\n==========================================")
    print(f"Testing Flow against: {base_url}")
    print(f"==========================================")
    
    # 1. Login Maen Klaib
    res = requests.post(f"{base_url}/auth/login", data={"username": "maen.klaib@mrvalet.com", "password": "devpass123"})
    assert res.status_code == 200, f"Maen login failed: {res.text}"
    maen_token = res.json()["access_token"]
    maen_headers = {"Authorization": f"Bearer {maen_token}", "Content-Type": "application/json"}
    print("[PASS] Maen logged in successfully")
    
    # 2. Get Sites
    sites_res = requests.get(f"{base_url}/sites/", headers=maen_headers)
    assert sites_res.status_code == 200, f"Sites fetch failed: {sites_res.text}"
    sites = sites_res.json()
    maen_sites = [s for s in sites if s.get("manager_name") == "Maen Klaib" or s.get("manager_id") == 103]
    site_id = maen_sites[0]["id"] if maen_sites else 27
    print(f"[PASS] Using Site ID {site_id} ({maen_sites[0]['name'] if maen_sites else 'Fairmont'})")
    
    # 3. Create Request for 5 drivers to Kanan (supplier_id 6)
    req_body = {
        "site_id": site_id,
        "required_date": "2026-09-15",
        "start_time": "08:00",
        "end_time": "17:00",
        "total_required_workers": 5,
        "skill_category": "Valet Driver",
        "notes": "Testing cross platform request",
        "routes": [
            {"supplier_id": 6, "requested_quantity": 5}
        ]
    }
    create_res = requests.post(f"{base_url}/requests/", json=req_body, headers=maen_headers)
    assert create_res.status_code in [200, 201], f"Request creation failed: {create_res.text}"
    req_id = create_res.json()["id"]
    print(f"[PASS] Created Shift Request #{req_id} for 5 drivers")
    
    # 4. Login Kanan
    res_kanan = requests.post(f"{base_url}/auth/login", data={"username": "kanan", "password": "devpass123"})
    assert res_kanan.status_code == 200, f"Kanan login failed: {res_kanan.text}"
    kanan_token = res_kanan.json()["access_token"]
    kanan_headers = {"Authorization": f"Bearer {kanan_token}", "Content-Type": "application/json"}
    print("[PASS] Kanan logged in successfully")
    
    # 5. Check Kanan's Notifications for initial request
    kanan_notifs = requests.get(f"{base_url}/notifications/", headers=kanan_headers).json()
    req_notif = next((n for n in kanan_notifs if f"#{req_id}" in n.get("title", "") or n.get("entity_id") == req_id), None)
    assert req_notif is not None, f"Kanan did not receive initial notification for request #{req_id}. Notifs: {kanan_notifs}"
    print(f"[PASS] Kanan received initial notification: '{req_notif['title']}'")
    
    # 6. Kanan views incoming request
    sup_reqs = requests.get(f"{base_url}/requests/supplier", headers=kanan_headers).json()
    my_req = next((r for r in sup_reqs if r["id"] == req_id), None)
    assert my_req is not None, f"Request #{req_id} not found in Kanan's supplier requests"
    assert (my_req.get("requested_quantity") == 5 or my_req.get("total_required_workers") == 5), f"Expected 5 drivers requested, got {my_req}"
    print(f"[PASS] Kanan sees Request #{req_id} with requested quota = 5")
    
    # 7. Kanan partially accepts / counter-proposes for 3 drivers
    respond_body = {
        "status": "COUNTER_PROPOSED",
        "confirmed_quantity": 3,
        "proposed_start_time": "08:00",
        "proposed_end_time": "17:00",
        "supplier_message": "We can only provide 3 drivers for this shift"
    }
    respond_res = requests.patch(f"{base_url}/requests/{req_id}/respond", json=respond_body, headers=kanan_headers)
    assert respond_res.status_code == 200, f"Respond failed: {respond_res.text}"
    print("[PASS] Kanan responded with 3 drivers (COUNTER_PROPOSED)")
    
    # 8. Check Maen's notifications for Kanan's response
    maen_notifs = requests.get(f"{base_url}/notifications/", headers=maen_headers).json()
    resp_notif = next((n for n in maen_notifs if f"#{req_id}" in n.get("title", "") or n.get("entity_id") == req_id), None)
    assert resp_notif is not None, f"Maen did not receive notification of Kanan's proposal. Notifs: {maen_notifs}"
    print(f"[PASS] Maen received notification: '{resp_notif['title']}' - '{resp_notif.get('message')}'")
    
    # 9. Maen views request responses and verifies 3 drivers (NOT 4!)
    responses_res = requests.get(f"{base_url}/requests/{req_id}/responses", headers=maen_headers)
    assert responses_res.status_code == 200, f"Fetch responses failed: {responses_res.text}"
    responses = responses_res.json()
    kanan_resp = next((r for r in responses if r.get("supplier_id") == 6), None)
    assert kanan_resp is not None, f"Kanan response not found in {responses}"
    assert kanan_resp["confirmed_quantity"] == 3, f"CRITICAL: Expected confirmed_quantity to be 3, but was {kanan_resp['confirmed_quantity']}!"
    print(f"[PASS] Verified Maen sees EXACTLY {kanan_resp['confirmed_quantity']} drivers accepted (NOT 4!)")
    
    # 10. Maen writes message in chat
    chat_body = {"message": "Hello Kanan, can you arrange 2 more drivers later?"}
    chat_res = requests.post(f"{base_url}/requests/{req_id}/messages", json=chat_body, headers=maen_headers)
    assert chat_res.status_code in [200, 201], f"Sending chat failed: {chat_res.text}"
    print("[PASS] Maen sent chat message")
    
    # 11. Check Kanan's notifications for Maen's chat message
    kanan_notifs_after_chat = requests.get(f"{base_url}/notifications/", headers=kanan_headers).json()
    chat_notif = next((n for n in kanan_notifs_after_chat if "Message on Request" in n.get("title", "") and f"#{req_id}" in n.get("title", "")), None)
    assert chat_notif is not None, f"Kanan did not receive notification for chat message! Notifs: {kanan_notifs_after_chat}"
    print(f"[PASS] Kanan received chat notification: '{chat_notif['title']}'")
    
    # 12. Kanan reads messages and receives Maen's chat
    kanan_msgs = requests.get(f"{base_url}/requests/{req_id}/messages", headers=kanan_headers).json()
    last_msg = next((m for m in kanan_msgs if m.get("message") == chat_body["message"]), None)
    assert last_msg is not None, f"Maen's chat message was NOT received by Kanan! Messages: {kanan_msgs}"
    print(f"[PASS] Kanan received Maen's message in chat: '{last_msg['message']}' from '{last_msg.get('sender_name')}'")
    
    # 13. Kanan replies in chat
    reply_body = {"message": "We will try our best to source 2 more by evening."}
    reply_res = requests.post(f"{base_url}/requests/{req_id}/messages", json=reply_body, headers=kanan_headers)
    assert reply_res.status_code in [200, 201], f"Kanan reply failed: {reply_res.text}"
    print("[PASS] Kanan sent reply in chat")
    
    # 14. Maen reads messages and sees Kanan's reply
    maen_msgs = requests.get(f"{base_url}/requests/{req_id}/messages", headers=maen_headers).json()
    last_reply = next((m for m in maen_msgs if m.get("message") == reply_body["message"]), None)
    assert last_reply is not None, f"Kanan's reply was NOT received by Maen! Messages: {maen_msgs}"
    print(f"[PASS] Maen received Kanan's reply in chat: '{last_reply['message']}'")
    
    # 15. Maen finalizes the 3 drivers
    finalize_res = requests.patch(
        f"{base_url}/requests/{req_id}/responses/{kanan_resp['id']}/finalize",
        json={
            "accepted_quantity": 3,
            "accepted_start_time": "08:00",
            "accepted_end_time": "17:00"
        },
        headers=maen_headers
    )
    assert finalize_res.status_code == 200, f"Finalize failed: {finalize_res.text}"
    print("[PASS] Maen finalized the 3 drivers")
    
    # 16. Kanan receives finalized notification
    kanan_notifs_final = requests.get(f"{base_url}/notifications/", headers=kanan_headers).json()
    final_notif = next((n for n in kanan_notifs_final if "Finalized" in n.get("title", "") or "finalized" in n.get("title", "").lower()), None)
    assert final_notif is not None, f"Kanan did not receive finalized shift notification! Notifs: {kanan_notifs_final}"
    print(f"[PASS] Kanan received finalized notification: '{final_notif['title']}'")
    
    print("\n>>> ALL 16 CHECKS PASSED PERFECTLY! <<<\n")

if __name__ == "__main__":
    # Test directly against FastAPI
    test_flow("http://127.0.0.1:8000/api/v1")
    # Test via Next.js reverse proxy (what mobile untun hits)
    test_flow("http://127.0.0.1:3000/api/v1")
