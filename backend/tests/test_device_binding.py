from app.models.all_models import Supplier, User, Worker, RoleEnum
from app.core.security import get_password_hash
from tests.test_phase1b import get_auth_token


def test_device_binding_flow(client, db):
    # Own supplier, worker and login in the test database (never the app's real database)
    supplier = Supplier(name="Binding Agency", status="active", billing_rate=45)
    db.add(supplier)
    db.flush()
    worker = Worker(internal_worker_id="W-BIND-1", supplier_id=supplier.id, first_name="Bind", last_name="Test",
                    qid="29535699001", whatsapp_number="+97455099001", status="active")
    db.add(worker)
    db.flush()
    db.add(User(email="29535699001", password_hash=get_password_hash("Bind#2026"),
                role=RoleEnum.OUTSOURCE_WORKER, worker_id=worker.id, status="active"))
    db.commit()

    def login(device):
        return client.post("/api/v1/auth/login", data={"username": "29535699001", "password": "Bind#2026", "client_id": device})

    # Missing device ID is refused
    res = client.post("/api/v1/auth/login", data={"username": "29535699001", "password": "Bind#2026"})
    assert res.status_code == 400

    # First login binds device A; A keeps working
    assert login("DEVICE-A").status_code == 200
    db.refresh(worker)
    assert worker.device_id == "DEVICE-A"
    assert login("DEVICE-A").status_code == 200

    # Device B is blocked
    res = login("DEVICE-B")
    assert res.status_code == 403
    assert "securely bound to another mobile device" in res.text

    # Super Admin resets the binding, then device B can log in and becomes the bound device
    admin_headers = {"Authorization": f"Bearer {get_auth_token(client, db, 'admin@example.com', 'devpass123')}"}
    res = client.post(f"/api/v1/workers/{worker.id}/reset-device", headers=admin_headers)
    assert res.status_code == 200, res.text
    assert login("DEVICE-B").status_code == 200
    assert login("DEVICE-A").status_code == 403
