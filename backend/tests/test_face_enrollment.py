import json
from datetime import datetime
import pytest
from app.core.security import get_password_hash
from app.core.timeutil import qatar_today
from app.models.all_models import (ManpowerRequest, RoleEnum, Site, Supplier, SupplierResponse, User,
                                   Worker, WorkerAssignment)
import app.api.routers.attendance as attendance_router

PW = "Face#2026"
# Two clearly different people (unit vectors at right angles never match)
YOUR_FACE = [1.0] + [0.0] * 511
OTHER_FACE = [0.0, 1.0] + [0.0] * 510
FACES = {"YOUR_FACE": YOUR_FACE, "OTHER_FACE": OTHER_FACE}


@pytest.fixture
def venue(client, db, monkeypatch):
    monkeypatch.setattr(attendance_router, "extract_face_embedding", lambda img: FACES[img])
    sup = Supplier(name="Face Agency", status="active")
    db.add(sup); db.flush()
    site = Site(name="Rafal Tower", latitude=25.0, longitude=51.0, geofence_radius_meters=500, status="active",
                qr_token="MC:LOC:TEST:face", qr_status="ACTIVE")
    db.add(site); db.flush()
    mr = ManpowerRequest(site_id=site.id, required_date=datetime.combine(qatar_today(), datetime.min.time()),
                         start_time="00:00", end_time="23:59", total_required_workers=2, status="CONFIRMED")
    db.add(mr); db.flush()
    sr = SupplierResponse(manpower_request_id=mr.id, supplier_id=sup.id, requested_quantity=2, confirmed_quantity=2, status="ACCEPTED_BY_OM")
    db.add(sr); db.flush()
    drivers = {}
    for n, (first, qid) in enumerate((("QA", "29563400191"), ("Tariq", "29309876591"))):
        w = Worker(internal_worker_id=f"WRK-F{n}", supplier_id=sup.id, first_name=first, last_name="Test", qid=qid,
                   whatsapp_number=f"+9745550019{n}", status="active")
        db.add(w); db.flush()
        db.add(User(email=qid, password_hash=get_password_hash(PW), role=RoleEnum.OUTSOURCE_WORKER, worker_id=w.id, status="active"))
        wa = WorkerAssignment(supplier_response_id=sr.id, worker_id=w.id, status="ASSIGNED")
        db.add(wa); db.flush()
        drivers[first] = (w, wa)
    db.commit()

    def check_in(first, face):
        w, wa = drivers[first]
        login = client.post("/api/v1/auth/login", data={"username": w.qid, "password": PW, "client_id": f"phone-{first}"})
        headers = {"Authorization": f"Bearer {login.json()['access_token']}"}
        return client.post("/api/v1/attendance/check-in", headers=headers, json={
            "assignment_id": wa.id, "latitude": 25.0, "longitude": 51.0, "accuracy": 10,
            "qr_data": site.qr_token, "live_face_image": face})
    return drivers, check_in


def registered_face(db, worker):
    db.expire_all()
    raw = db.get(Worker, worker.id).face_embedding
    return json.loads(raw) if raw else None


def test_blocked_attempt_does_not_register_the_face(client, db, venue):
    """The bug: a check-in refused by the one-day rule still saved the face as the driver's own,
    so the real driver was then rejected as a "proxy"."""
    drivers, check_in = venue
    assert check_in("QA", "YOUR_FACE").status_code == 200

    res = check_in("Tariq", "YOUR_FACE")
    assert res.status_code == 400 and "already checked in today as QA" in res.text
    assert registered_face(db, drivers["Tariq"][0]) is None   # nothing registered by a refused attempt

    res = check_in("Tariq", "OTHER_FACE")                     # the real Tariq can still check in
    assert res.status_code == 200, res.text
    assert registered_face(db, drivers["Tariq"][0]) == OTHER_FACE


def test_registered_face_still_blocks_a_proxy(client, db, venue):
    drivers, check_in = venue
    assert check_in("Tariq", "OTHER_FACE").status_code == 200
    assert registered_face(db, drivers["Tariq"][0]) == OTHER_FACE
    # Another person on Tariq's account on a later shift is still refused
    w, wa = drivers["Tariq"]
    db.query(attendance_router.Attendance).filter_by(worker_assignment_id=wa.id).delete(); db.commit()
    res = check_in("Tariq", "YOUR_FACE")
    assert res.status_code == 400 and "does not match the registered employee" in res.text


def test_super_admin_can_reset_a_wrongly_registered_face(client, db, venue):
    """How Tariq's live account gets repaired: clear the face, the real Tariq checks in fresh."""
    from tests.test_phase1b import get_auth_token
    drivers, check_in = venue
    tariq, wa = drivers["Tariq"]
    tariq_db = db.get(Worker, tariq.id)
    tariq_db.face_embedding = json.dumps(YOUR_FACE)   # wrong person registered (the state on live)
    db.commit()
    assert check_in("Tariq", "OTHER_FACE").status_code == 400

    admin = {"Authorization": f"Bearer {get_auth_token(client, db, 'admin@example.com', 'devpass123')}"}
    listed = next(w for w in client.get("/api/v1/workers/", headers=admin).json() if w["id"] == tariq.id)
    assert listed["face_registered"] is True and "face_embedding" not in listed

    # Only a Super Admin may clear it
    driver_login = client.post("/api/v1/auth/login", data={"username": tariq.qid, "password": PW, "client_id": "phone-Tariq"})
    assert client.post(f"/api/v1/workers/{tariq.id}/reset-face",
                       headers={"Authorization": f"Bearer {driver_login.json()['access_token']}"}).status_code == 403
    assert client.post(f"/api/v1/workers/{tariq.id}/reset-face", headers=admin).status_code == 200
    assert registered_face(db, tariq) is None

    assert check_in("Tariq", "OTHER_FACE").status_code == 200
    assert registered_face(db, tariq) == OTHER_FACE
