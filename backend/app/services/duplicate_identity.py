import json
from datetime import date, datetime, timedelta
from typing import Optional, Tuple, List
from sqlalchemy.orm import Session
from app.models.all_models import Attendance, ManpowerRequest, Site, SupplierResponse, Worker, WorkerAssignment, AttendanceAudit
from app.core.timeutil import QATAR_TZ, qatar_today
from app.services.biometrics import verify_face_match

# check_in_time is stored as a naive UTC value, so "today" (Qatar calendar day, UTC+3) is
# converted to its UTC-instant boundaries before comparing against that column.
def _qatar_day_bounds_in_utc(qatar_date: date) -> Tuple[datetime, datetime]:
    start_local = datetime.combine(qatar_date, datetime.min.time(), tzinfo=QATAR_TZ)
    start_utc = (start_local - start_local.utcoffset()).replace(tzinfo=None)
    end_utc = start_utc + timedelta(days=1)
    return start_utc, end_utc


def check_duplicate_identity(
    db: Session,
    live_embedding: List[float],
    current_worker_id: int,
    site_id: int,
    current_date: Optional[date] = None
) -> Tuple[bool, str]:
    if current_date is None:
        current_date = qatar_today()

    start_of_day, end_of_day = _qatar_day_bounds_in_utc(current_date)

    # CONCURRENCY PROTECTION
    # Force a write lock on the Site to serialize checks.
    # Works across both SQLite (upgrades to EXCLUSIVE) and PostgreSQL (Row Exclusive lock).
    site = db.query(Site).filter(Site.id == site_id).first()
    if site:
        site.name = site.name # Dummy update to trigger row lock
        db.add(site)
        db.flush()

    # Detection itself only needs Worker -> WorkerAssignment -> Attendance: keep this exactly
    # as permissive as before so a test/edge-case assignment with no supplier-response chain
    # still gets caught, rather than silently slipping through an inner join it doesn't satisfy.
    todays_attendances = db.query(Worker, Attendance).join(
        WorkerAssignment, WorkerAssignment.worker_id == Worker.id
    ).join(
        Attendance, Attendance.worker_assignment_id == WorkerAssignment.id
    ).filter(
        Attendance.check_in_time >= start_of_day,
        Attendance.check_in_time < end_of_day,
        Attendance.face_verified == True
    ).all()

    for worker, attendance in todays_attendances:
        if worker.id == current_worker_id or not worker.face_embedding:
            continue
        try:
            enrolled_embedding = json.loads(worker.face_embedding)
            is_match, _ = verify_face_match(live_embedding, enrolled_embedding)
        except Exception:
            continue
        if is_match:
            audit = AttendanceAudit(
                worker_id=current_worker_id,
                site_id=site_id,
                failure_reason="IDENTITY_ALREADY_RECORDED"
            )
            db.add(audit)
            db.flush()
            message = f"IDENTITY_ALREADY_RECORDED: {_describe_prior_checkin(db, worker, attendance)}"
            return False, message

    return True, ""


def _describe_prior_checkin(db: Session, worker: Worker, attendance: Attendance) -> str:
    """Best-effort human-readable detail for the block message; never blocks detection itself."""
    checked_in_site_name = "another location"
    try:
        wa = db.query(WorkerAssignment).filter(WorkerAssignment.id == attendance.worker_assignment_id).first()
        sr = db.query(SupplierResponse).filter(SupplierResponse.id == wa.supplier_response_id).first() if wa else None
        mr = db.query(ManpowerRequest).filter(ManpowerRequest.id == sr.manpower_request_id).first() if sr else None
        site = db.query(Site).filter(Site.id == mr.site_id).first() if mr else None
        if site:
            checked_in_site_name = site.name
    except Exception:
        pass

    if attendance.check_in_time:
        qatar_time = (attendance.check_in_time + QATAR_TZ.utcoffset(None)).strftime("%H:%M")
    else:
        qatar_time = "earlier today"

    return (
        f"This face already checked in today as {worker.first_name} {worker.last_name} "
        f"(Worker #{worker.internal_worker_id}) at {checked_in_site_name}, {qatar_time} Qatar time."
    )

