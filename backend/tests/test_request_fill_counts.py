from datetime import datetime
from app.models.all_models import ManpowerRequest, Site, Supplier, SupplierResponse
from tests.test_phase1b import get_auth_token


def test_request_list_shows_confirmed_remaining_and_offered(client, db):
    # Ops asks for 10 drivers: one agency is approved for 7, another has offered 2 that ops
    # hasn't approved yet, a third declined. Overview must read 10 / 7 confirmed / 3 remaining.
    site = Site(name="Fill Count Tower", latitude=25.3, longitude=51.5, geofence_radius_meters=200, status="active")
    a, b, c = (Supplier(name=n, status="active") for n in ("Agency A", "Agency B", "Agency C"))
    db.add_all([site, a, b, c])
    db.flush()
    mr = ManpowerRequest(site_id=site.id, required_date=datetime(2026, 10, 20), start_time="08:00",
                         end_time="16:00", total_required_workers=10, status="PARTIALLY_CONFIRMED")
    db.add(mr)
    db.flush()
    db.add_all([
        SupplierResponse(manpower_request_id=mr.id, supplier_id=a.id, requested_quantity=10, confirmed_quantity=7, status="ACCEPTED_BY_OM"),
        SupplierResponse(manpower_request_id=mr.id, supplier_id=b.id, requested_quantity=3, confirmed_quantity=2, status="COUNTER_PROPOSED"),
        SupplierResponse(manpower_request_id=mr.id, supplier_id=c.id, requested_quantity=3, confirmed_quantity=0, status="REJECTED"),
    ])
    db.commit()

    token = get_auth_token(client, db, "admin@example.com", "devpass123")
    res = client.get("/api/v1/requests/", headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 200, res.text
    row = next(r for r in res.json() if r["id"] == mr.id)
    assert row["total_required_workers"] == 10
    assert row["confirmed_workers"] == 7
    assert row["remaining_workers"] == 3
    assert row["offered_workers"] == 2

