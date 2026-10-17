from datetime import datetime, timedelta
import pytest
from app.core.security import get_password_hash
from app.core.timeutil import qatar_today
from app.models.all_models import (ManpowerRequest, Notification, RoleEnum, Site, Supplier,
                                   SupplierResponse, SupplierTopUpOffer, User)

PW = "Topup#2026"


def login(client, email):
    res = client.post("/api/v1/auth/login", data={"username": email, "password": PW, "client_id": "pytest-device"})
    assert res.status_code == 200, res.text
    return {"Authorization": f"Bearer {res.json()['access_token']}"}


@pytest.fixture
def world(client, db):
    """Ops asks 10 drivers; Agency A was finalized for 7; Agency B was asked too but is still pending."""
    ops = User(email="ops.topup@example.com", password_hash=get_password_hash(PW), role=RoleEnum.OPS_MANAGER, status="active")
    other_ops = User(email="other.ops@example.com", password_hash=get_password_hash(PW), role=RoleEnum.OPS_MANAGER, status="active")
    a, b = Supplier(name="Agency A", status="active"), Supplier(name="Agency B", status="active")
    db.add_all([ops, other_ops, a, b]); db.flush()
    head_a = User(email="head.a@example.com", password_hash=get_password_hash(PW), role=RoleEnum.SUPPLIER_HEAD, supplier_id=a.id, status="active")
    head_b = User(email="head.b@example.com", password_hash=get_password_hash(PW), role=RoleEnum.SUPPLIER_HEAD, supplier_id=b.id, status="active")
    site = Site(name="Rafal Tower", latitude=25.38, longitude=51.52, geofence_radius_meters=500, manager_id=ops.id, status="active")
    db.add_all([head_a, head_b, site]); db.flush()
    shift_day = datetime.combine(qatar_today() + timedelta(days=1), datetime.min.time())
    mr = ManpowerRequest(ops_manager_id=ops.id, site_id=site.id, required_date=shift_day, start_time="08:00",
                         end_time="16:00", total_required_workers=10, status="PARTIALLY_CONFIRMED")
    db.add(mr); db.flush()
    sr_a = SupplierResponse(manpower_request_id=mr.id, supplier_id=a.id, requested_quantity=10, confirmed_quantity=7, status="ACCEPTED_BY_OM")
    sr_b = SupplierResponse(manpower_request_id=mr.id, supplier_id=b.id, requested_quantity=3, confirmed_quantity=0, status="PENDING")
    db.add_all([sr_a, sr_b]); db.commit()
    return {"mr": mr, "sr_a": sr_a, "sr_b": sr_b, "a": a, "b": b,
            "ops": login(client, "ops.topup@example.com"), "other_ops": login(client, "other.ops@example.com"),
            "head_a": login(client, "head.a@example.com"), "head_b": login(client, "head.b@example.com")}


def url(w, tail=""):
    return f"/api/v1/requests/{w['mr'].id}/topups{tail}"


def overview_row(client, w):
    return next(r for r in client.get("/api/v1/requests/", headers=w["ops"]).json() if r["id"] == w["mr"].id)


def test_agency_offers_three_more_and_ops_accepts(client, db, world):
    w = world
    # Can't offer more than is still needed (10 - 7 = 3)
    res = client.post(url(w), json={"extra_quantity": 4}, headers=w["head_a"])
    assert res.status_code == 400 and "Only 3 more" in res.text

    res = client.post(url(w), json={"extra_quantity": 3, "message": "Found 3 more drivers"}, headers=w["head_a"])
    assert res.status_code == 200, res.text
    offer_id = res.json()["id"]
    # The ops manager is told, and the overview shows the 3 as offered (not yet confirmed)
    assert db.query(Notification).filter(Notification.user_id == w["mr"].ops_manager_id, Notification.title.like("%Extra drivers offered%")).count() == 1
    row = overview_row(client, w)
    assert (row["confirmed_workers"], row["remaining_workers"], row["offered_workers"]) == (7, 3, 3)

    # Only one open offer at a time
    res = client.post(url(w), json={"extra_quantity": 1}, headers=w["head_a"])
    assert res.status_code == 400 and "Withdraw that offer" in res.text

    # Both sides see the offer
    assert client.get(url(w), headers=w["ops"]).json()["offers"][0]["status"] == "PENDING"
    supplier_view = client.get(url(w), headers=w["head_a"]).json()
    assert supplier_view["open_places"] == 3 and supplier_view["offers"][0]["extra_quantity"] == 3

    res = client.post(url(w, f"/{offer_id}/decide"), json={"accept": True}, headers=w["ops"])
    assert res.status_code == 200, res.text
    assert res.json() == {"message": "Offer accepted", "confirmed_quantity": 10, "request_status": "CONFIRMED"}
    db.expire_all()
    assert db.get(SupplierResponse, w["sr_a"].id).confirmed_quantity == 10
    assert db.query(Notification).filter(Notification.supplier_id == w["a"].id, Notification.title.like("%Extra drivers accepted%")).count() == 1
    row = overview_row(client, w)
    assert (row["confirmed_workers"], row["remaining_workers"], row["offered_workers"]) == (10, 0, 0)

    # Fully staffed now: nothing more to offer, and the same offer can't be decided twice
    res = client.post(url(w), json={"extra_quantity": 1}, headers=w["head_a"])
    assert res.status_code == 400 and "fully staffed" in res.text
    assert client.post(url(w, f"/{offer_id}/decide"), json={"accept": True}, headers=w["ops"]).status_code == 400


def test_decline_with_reason_and_withdraw(client, db, world):
    w = world
    offer_id = client.post(url(w), json={"extra_quantity": 2}, headers=w["head_a"]).json()["id"]
    res = client.post(url(w, f"/{offer_id}/decide"), json={"accept": False, "note": "Venue closes early"}, headers=w["ops"])
    assert res.status_code == 200
    db.expire_all()
    assert db.get(SupplierResponse, w["sr_a"].id).confirmed_quantity == 7
    note = db.query(Notification).filter(Notification.supplier_id == w["a"].id, Notification.title.like("%declined%")).one()
    assert "Venue closes early" in note.message

    # A new offer after a decline is fine; the agency can also take it back before ops answers
    offer_id = client.post(url(w), json={"extra_quantity": 1}, headers=w["head_a"]).json()["id"]
    assert client.post(url(w, f"/{offer_id}/withdraw"), headers=w["head_a"]).status_code == 200
    assert db.get(SupplierTopUpOffer, offer_id).status == "WITHDRAWN"
    assert client.post(url(w, f"/{offer_id}/decide"), json={"accept": True}, headers=w["ops"]).status_code == 400
    assert overview_row(client, w)["offered_workers"] == 0


def test_places_filled_by_another_agency_before_ops_answers(client, db, world):
    w = world
    offer_id = client.post(url(w), json={"extra_quantity": 3}, headers=w["head_a"]).json()["id"]
    # Meanwhile Agency B is finalized for 2 of the 3 open places
    sr_b = db.get(SupplierResponse, w["sr_b"].id)
    sr_b.status, sr_b.confirmed_quantity = "ACCEPTED_BY_OM", 2
    db.commit()
    res = client.post(url(w, f"/{offer_id}/decide"), json={"accept": True}, headers=w["ops"])
    assert res.status_code == 409 and "Only 1 more" in res.text
    db.expire_all()
    assert db.get(SupplierResponse, w["sr_a"].id).confirmed_quantity == 7


def test_who_may_do_what(client, db, world):
    w = world
    # Another ops manager can't see or decide; another agency can't touch Agency A's offer
    offer_id = client.post(url(w), json={"extra_quantity": 1}, headers=w["head_a"]).json()["id"]
    assert client.get(url(w), headers=w["other_ops"]).status_code == 403
    assert client.post(url(w, f"/{offer_id}/decide"), json={"accept": True}, headers=w["other_ops"]).status_code == 403
    assert client.post(url(w, f"/{offer_id}/withdraw"), headers=w["head_b"]).status_code == 404
    assert client.post(url(w, f"/{offer_id}/decide"), json={"accept": True}, headers=w["head_a"]).status_code == 403
    # Agency B sees only its own offers
    assert client.get(url(w), headers=w["head_b"]).json()["offers"] == []
    # Before Operations finalized its answer, an agency changes its proposal instead
    res = client.post(url(w), json={"extra_quantity": 1}, headers=w["head_b"])
    assert res.status_code == 400 and "change your proposal" in res.text


def test_no_offers_on_cancelled_or_past_shifts(client, db, world):
    w = world
    mr = db.get(ManpowerRequest, w["mr"].id)
    mr.required_date = datetime.combine(qatar_today() - timedelta(days=1), datetime.min.time())
    db.commit()
    res = client.post(url(w), json={"extra_quantity": 1}, headers=w["head_a"])
    assert res.status_code == 400 and "passed" in res.text
    assert client.get(url(w), headers=w["head_a"]).json()["shift_passed"] is True
    mr.required_date = datetime.combine(qatar_today(), datetime.min.time())
    mr.status = "CANCELLED"
    db.commit()
    res = client.post(url(w), json={"extra_quantity": 1}, headers=w["head_a"])
    assert res.status_code == 400 and "cancelled" in res.text
    assert client.post(url(w), json={"extra_quantity": 0}, headers=w["head_a"]).status_code == 422


def test_supplier_cannot_resend_the_same_answer(client, db, world):
    """Re-clicking accept / counter used to re-notify Operations every time (issue: endless loop)."""
    w = world
    r = f"/api/v1/requests/{w['mr'].id}/respond"
    notes = lambda: db.query(Notification).filter(Notification.user_id == w["mr"].ops_manager_id).count()
    before = notes()
    accept = {"status": "ACCEPTED", "confirmed_quantity": 3, "proposed_start_time": "08:00", "proposed_end_time": "16:00", "supplier_message": ""}
    assert client.patch(r, json=accept, headers=w["head_b"]).status_code == 200
    assert notes() == before + 1
    # Same answer again: refused, Operations not notified again
    res = client.patch(r, json=accept, headers=w["head_b"])
    assert res.status_code == 400 and "already sent" in res.text
    assert notes() == before + 1
    # A real change (counter-proposal with fewer drivers) is still allowed, once
    counter = {**accept, "status": "COUNTER_PROPOSED", "confirmed_quantity": 2, "supplier_message": "Only 2 today"}
    assert client.patch(r, json=counter, headers=w["head_b"]).status_code == 200
    assert client.patch(r, json=counter, headers=w["head_b"]).status_code == 400
    assert notes() == before + 2
    # Never more drivers than the request needs
    res = client.patch(r, json={**counter, "confirmed_quantity": 11}, headers=w["head_b"])
    assert res.status_code == 400 and "only needs 10" in res.text
