import os
import sys
from fastapi.testclient import TestClient

# Add backend to path so we can import app modules
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.main import app
from app.db.session import SessionLocal
from app.models.all_models import Worker

client = TestClient(app)

def test_device_binding_flow():
    print("Testing device binding flow...")
    db = SessionLocal()
    
    # 1. Reset worker's device ID to clean state
    # We will use Demo Worker 1 (worker@example.com) for this test
    # Or just a worker from DB
    worker = db.query(Worker).first()
    if not worker:
        print("No workers found to test with.")
        return
        
    print(f"Testing with worker: {worker.first_name} {worker.last_name} (QID: {worker.qid})")
    
    worker.device_id = None
    db.commit()
    
    # We need the user login for this worker
    from app.models.all_models import User
    user = db.query(User).filter(User.worker_id == worker.id).first()
    if not user:
        print("Worker does not have a user account.")
        return
        
    username = user.email
    password = "devpass123"
    
    print(f"Logging in with username: {username}")
    
    # 2. First login (should bind device A)
    device_a = "DEVICE-A-UUID-123"
    res1 = client.post("/api/v1/auth/login", data={
        "username": username,
        "password": password,
        "client_id": device_a
    })
    
    assert res1.status_code == 200, f"Failed to login: {res1.text}"
    print("✅ First login (Device A) successful. Device bound.")
    
    # 3. Second login (from Device A again)
    res2 = client.post("/api/v1/auth/login", data={
        "username": username,
        "password": password,
        "client_id": device_a
    })
    assert res2.status_code == 200, f"Failed to login with same device: {res2.text}"
    print("✅ Second login (Device A) successful.")
    
    # 4. Third login (from Device B - Should Fail)
    device_b = "DEVICE-B-UUID-999"
    res3 = client.post("/api/v1/auth/login", data={
        "username": username,
        "password": password,
        "client_id": device_b
    })
    assert res3.status_code == 403, f"Expected 403, got {res3.status_code}: {res3.text}"
    assert "securely bound to another mobile device" in res3.text
    print("✅ Login from new device (Device B) correctly blocked.")
    
    # 5. Super Admin resets the device binding
    admin_user = db.query(User).filter(User.email == "admin@example.com").first()
    # Mocking admin token
    from app.core.security import create_access_token
    admin_token = create_access_token(admin_user.id)
    
    res4 = client.post(
        f"/api/v1/workers/{worker.id}/reset-device",
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert res4.status_code == 200, f"Failed to reset device: {res4.text}"
    print("✅ Admin successfully reset the device binding.")
    
    # 6. Fourth login (from Device B - Should now Succeed)
    res5 = client.post("/api/v1/auth/login", data={
        "username": username,
        "password": password,
        "client_id": device_b
    })
    assert res5.status_code == 200, f"Failed to login with new device after reset: {res5.text}"
    print("✅ Login from new device (Device B) successful after reset.")
    
    print("🎉 All device binding tests passed!")

if __name__ == "__main__":
    test_device_binding_flow()
