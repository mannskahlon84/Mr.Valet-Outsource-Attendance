from datetime import datetime, timedelta

import pytest

from app.api.routers.allocations import shifts_overlap
from app.core.security import get_password_hash
from app.core.timeutil import qatar_today
from app.models.all_models import (Attendance, ManpowerRequest, RoleEnum, Site, Supplier, SupplierResponse, User, Worker,
                                   WorkerAssignment)

PASSWORD = "Str0ngPass123"


def login(client, username):
    token = client.post("/api/v1/auth/login", data={"username": username, "password": PASSWORD}).json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def day_of_shifts(db):
    """Today: agency A has a finalized shift with two drivers (one finished, one not started);
    agency B has nothing; agency C only has a cancelled shift."""
    today = datetime.combine(qatar_today(), datetime.min.time())
    site = Site(name="Dar Global", latitude=25.3, longitude=51.5)
    sup_a, sup_b, sup_c = (Supplier(name=n, billing_rate=100.0) for n in ("Agency A", "Agency B", "Agency C"))
    db.add_all([site, sup_a, sup_b, sup_c])
    db.flush()
    ops = User(email="ops-x@example.com", password_hash=get_password_hash(PASSWORD), role=RoleEnum.OPS_MANAGER)
    db.add_all([
        ops,
        User(email="acct-x@example.com", password_hash=get_password_hash(PASSWORD), role=RoleEnum.ACCOUNTING),
        User(email="head-a@example.com", password_hash=get_password_hash(PASSWORD), role=RoleEnum.SUPPLIER_HEAD, supplier_id=sup_a.id),
    ])
    db.flush()

    mr = ManpowerRequest(ops_manager_id=ops.id, site_id=site.id, required_date=today, start_time="14:00", end_time="23:00",
                         total_required_workers=3, status="PARTIALLY_CONFIRMED")
    cancelled = ManpowerRequest(ops_manager_id=ops.id, site_id=site.id, required_date=today, start_time="09:00", end_time="12:00",
                                total_required_workers=1, status="CANCELLED")
    db.add_all([mr, cancelled])
    db.flush()
    sr = SupplierResponse(manpower_request_id=mr.id, supplier_id=sup_a.id, requested_quantity=3, confirmed_quantity=3, status="ACCEPTED_BY_OM")
    sr_cancelled = SupplierResponse(manpower_request_id=cancelled.id, supplier_id=sup_c.id, requested_quantity=1, confirmed_quantity=1, status="ACCEPTED_BY_OM")
    db.add_all([sr, sr_cancelled])
    db.flush()

    workers = []
    for n, qid in enumerate(["29535600001", "29535600002", "29535600003"], start=1):
        w = Worker(internal_worker_id=f"WRK-9{n}", supplier_id=sup_a.id, first_name="Driver", last_name=str(n), qid=qid, status="active")
        db.add(w)
        workers.append(w)
    db.flush()
    finished = WorkerAssignment(supplier_response_id=sr.id, worker_id=workers[0].id, status="ASSIGNED")
    waiting = WorkerAssignment(supplier_response_id=sr.id, worker_id=workers[1].id, status="ASSIGNED")
    db.add_all([finished, waiting])
    db.flush()
    check_in = datetime.utcnow() - timedelta(hours=5)
    db.add(Attendance(worker_assignment_id=finished.id, check_in_time=check_in, check_out_time=check_in + timedelta(hours=4),
                      status="CHECKED_OUT"))
    db.commit()
    return {"sr": sr, "workers": workers, "waiting": waiting, "finished": finished}


def test_daily_breakdown_lists_only_agencies_working_that_day(client, db, day_of_shifts):
    data = client.get("/api/v1/accounting/daily-breakdown", headers=login(client, "acct-x@example.com")).json()
    assert [s["supplier_name"] for s in data["suppliers"]] == ["Agency A"]
    agency = data["suppliers"][0]
    assert (agency["total_workers_allocated"], agency["assigned_workers_count"]) == (3, 2)
    assert (agency["started_shift_count"], agency["ended_shift_count"], agency["on_duty_count"]) == (1, 1, 0)
    assert agency["total_duty_hours"] == 4.0
    assert data["total_daily_payables"] == 100.0
    assert data["total_scheduled"] == 3 and data["total_assigned"] == 2


def test_daily_breakdown_rejects_bad_dates(client, db, day_of_shifts):
    res = client.get("/api/v1/accounting/daily-breakdown?target_date=27-09-2026", headers=login(client, "acct-x@example.com"))
    assert res.status_code == 400


@pytest.mark.parametrize("path", [
    "/api/v1/accounting/daily-breakdown/export/{fmt}",
    "/api/v1/accounting/summary/export/{fmt}?month={month}&year={year}",
    "/api/v1/accounting/invoices/export/{fmt}",
    "/api/v1/reports/attendance/export/{fmt}",
])
@pytest.mark.parametrize("fmt,magic", [("excel", b"PK"), ("pdf", b"%PDF")])
def test_every_accounting_report_downloads_as_excel_and_pdf(client, db, day_of_shifts, path, fmt, magic):
    today = qatar_today()
    res = client.get(path.format(fmt=fmt, month=today.month, year=today.year), headers=login(client, "acct-x@example.com"))
    assert res.status_code == 200, res.text
    assert res.content[:len(magic)] == magic
    assert "attachment" in res.headers["content-disposition"]


def test_custom_invoice_downloads_as_excel_and_pdf(client, db, day_of_shifts):
    headers = login(client, "acct-x@example.com")
    today = qatar_today().isoformat()
    sup_id = day_of_shifts["sr"].supplier_id
    for fmt, magic in [("excel", b"PK"), ("pdf", b"%PDF")]:
        res = client.post("/api/v1/accounting/invoices/custom/download", headers=headers,
                          json={"supplier_id": sup_id, "start_date": today, "end_date": today, "format": fmt})
        assert res.status_code == 200, res.text
        assert res.content[:len(magic)] == magic


def test_exports_need_an_accounting_role(client, db, day_of_shifts):
    res = client.get("/api/v1/accounting/daily-breakdown/export/pdf", headers=login(client, "ops-x@example.com"))
    assert res.status_code == 403


@pytest.fixture
def agency_shift(db, monkeypatch):
    """Agency A confirmed 2 drivers at Rafal Tower today. Nobody is assigned by name."""
    import app.api.routers.attendance as attendance
    # Every test selfie is the same fake face; the same-face-twice rule is covered elsewhere
    monkeypatch.setattr(attendance, "check_duplicate_identity", lambda *a, **k: (True, ""))
    today = datetime.combine(qatar_today(), datetime.min.time())
    site = Site(name="Rafal Tower", latitude=25.32, longitude=51.53, geofence_radius_meters=100, qr_token="QR-RAFAL", qr_status="ACTIVE")
    sup_a, sup_b = Supplier(name="Deepu", billing_rate=50.0), Supplier(name="Naboth", billing_rate=50.0)
    db.add_all([site, sup_a, sup_b])
    db.flush()
    ops = User(email="ops-y@example.com", password_hash=get_password_hash(PASSWORD), role=RoleEnum.OPS_MANAGER)
    head = User(email="head-deepu@example.com", password_hash=get_password_hash(PASSWORD), role=RoleEnum.SUPPLIER_HEAD, supplier_id=sup_a.id)
    db.add_all([ops, head])
    db.flush()
    mr = ManpowerRequest(ops_manager_id=ops.id, site_id=site.id, required_date=today, start_time="00:00", end_time="23:59",
                         total_required_workers=2, status="CONFIRMED")
    db.add(mr)
    db.flush()
    sr = SupplierResponse(manpower_request_id=mr.id, supplier_id=sup_a.id, requested_quantity=2, confirmed_quantity=2, status="ACCEPTED_BY_OM")
    db.add(sr)
    drivers = {}
    for n, (sup, qid) in enumerate([(sup_a, "29535611111"), (sup_a, "29535611112"), (sup_a, "29535611113"), (sup_b, "29535611114")], start=1):
        w = Worker(internal_worker_id=f"WRK-7{n}", supplier_id=sup.id, first_name="Driver", last_name=f"D{n}", qid=qid, status="active")
        db.add(w)
        db.flush()
        db.add(User(email=qid, password_hash=get_password_hash(PASSWORD), role=RoleEnum.OUTSOURCE_WORKER, worker_id=w.id, supplier_id=sup.id))
        drivers[n] = qid
    db.commit()
    return {"sr": sr, "drivers": drivers}


def worker_headers(client, qid):
    res = client.post("/api/v1/auth/login", data={"username": qid, "password": PASSWORD, "client_id": f"phone-{qid}"})
    return {"Authorization": f"Bearer {res.json()['access_token']}"}


def check_in(client, qid):
    return client.post("/api/v1/attendance/check-in", headers=worker_headers(client, qid), json={
        "latitude": 25.32, "longitude": 51.53, "accuracy": 10, "qr_data": "QR-RAFAL", "live_face_image": "FAKE_BASE64_IMAGE"})


def test_agency_drivers_check_in_without_being_assigned(client, db, agency_shift):
    d = agency_shift["drivers"]
    assert check_in(client, d[1]).status_code == 200
    assert check_in(client, d[2]).status_code == 200
    # Both confirmed places are taken: a third driver of the same agency is turned away
    res = check_in(client, d[3])
    assert res.status_code == 403 and "already checked in" in res.json()["detail"]
    # Checking in twice doesn't take a second place
    assert check_in(client, d[1]).json()["detail"] == "Already checked in for this shift."


def test_driver_of_an_agency_without_a_shift_is_refused(client, db, agency_shift):
    res = check_in(client, agency_shift["drivers"][4])
    assert res.status_code == 403
    assert "does not have a confirmed shift at this location today" in res.json()["detail"]


def test_agency_sees_checked_in_and_missing_counts(client, db, agency_shift):
    check_in(client, agency_shift["drivers"][1])
    head = login(client, "head-deepu@example.com")
    count = client.get(f"/api/v1/attendance/response/{agency_shift['sr'].id}/headcount", headers=head).json()
    assert (count["confirmed"], count["checked_in"], count["on_duty"], count["missing"]) == (2, 1, 1, 1)
    assert [x["name"] for x in count["drivers"]] == ["Driver D1"]
    shifts = client.get("/api/v1/attendance/supplier-shifts", headers=head).json()
    assert len(shifts) == 1 and shifts[0]["site_name"] == "Rafal Tower" and shifts[0]["missing"] == 1


def test_other_agencies_cannot_see_a_headcount(client, db, agency_shift):
    other = Supplier(name="Agency Z", billing_rate=1.0)
    db.add(other)
    db.flush()
    db.add(User(email="head-z@example.com", password_hash=get_password_hash(PASSWORD), role=RoleEnum.SUPPLIER_HEAD, supplier_id=other.id))
    db.commit()
    res = client.get(f"/api/v1/attendance/response/{agency_shift['sr'].id}/headcount", headers=login(client, "head-z@example.com"))
    assert res.status_code == 403


@pytest.mark.parametrize("a,b,overlap", [
    (("09:00", "17:00"), ("17:00", "23:00"), False),
    (("09:00", "17:00"), ("16:00", "20:00"), True),
    (("22:00", "06:00"), ("23:00", "23:30"), True),   # overnight shift covers late evening
    (("17:00", "02:00"), ("09:00", "12:00"), False),
    (("17:00", "02:00"), ("18:00", "20:00"), True),
])
def test_shift_overlap_handles_overnight_shifts(a, b, overlap):
    assert shifts_overlap(*a, *b) is overlap
