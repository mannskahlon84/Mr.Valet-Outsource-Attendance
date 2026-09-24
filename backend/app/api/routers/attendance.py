import json
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.db.session import get_db
from app.models.all_models import Attendance, WorkerAssignment, SupplierResponse, ManpowerRequest, Site, User, RoleEnum, Worker, Notification, Supplier
from app.schemas.attendance import CheckInRequest, CheckOutRequest, AttendanceResponse
from app.api.deps import get_current_user, require_role
from app.services.audit import log_audit_event
from app.services.biometrics import extract_face_embedding, verify_face_match
from app.services.liveness import verify_liveness
from app.services.duplicate_identity import check_duplicate_identity
from datetime import datetime, timezone
from pydantic import BaseModel
from app.core.config import settings
import math

router = APIRouter()

# A shift is workable once the supplier accepted it or ops finalized it
CONFIRMED_RESPONSE_STATUSES = ["ACCEPTED", "ACCEPTED_BY_OM"]

def haversine_distance(lat1, lon1, lat2, lon2):
    R = 6371000 # Earth radius in meters
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)
    a = math.sin(delta_phi/2.0)**2 + math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda/2.0)**2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c

def resolve_site_from_qr(db: Session, qr_data: str) -> Site:
    """The site whose current, active poster carries exactly this QR text."""
    token = (qr_data or "").strip()
    qr_site = db.query(Site).filter(Site.qr_token == token).first() if token else None
    if not qr_site:
        raise HTTPException(400, "Invalid location QR code. Please scan the QR code posted at your venue.")
    if qr_site.status == "inactive" or qr_site.qr_status != "ACTIVE":
        raise HTTPException(400, "This venue's QR code is no longer active. Ask your supervisor for the current poster.")
    return qr_site


def site_summary(site: Site) -> dict:
    return {
        "id": site.id,
        "name": site.name,
        "address": site.address,
        "lat": site.latitude,
        "lng": site.longitude,
        "radius": site.geofence_radius_meters or 100.0,
    }


class QrLookup(BaseModel):
    qr_data: str


@router.post("/resolve-qr")
def resolve_qr(req: QrLookup, db: Session = Depends(get_db), current_user: User = Depends(require_role([RoleEnum.OUTSOURCE_WORKER]))):
    """Tells the worker app which venue a scanned poster belongs to, before check-in."""
    return site_summary(resolve_site_from_qr(db, req.qr_data))


@router.get("/test-venues")
def test_venues(db: Session = Depends(get_db), current_user: User = Depends(require_role([RoleEnum.OUTSOURCE_WORKER]))):
    """Development only: today's confirmed venues for this worker's agency, with their QR text,
    so check-in can be tried without a printed poster. Disabled when ENVIRONMENT is not development."""
    if settings.ENVIRONMENT != "development":
        raise HTTPException(404, "Not found")
    worker = db.query(Worker).filter(Worker.id == current_user.worker_id).first()
    if not worker:
        return []
    today = datetime.now(timezone.utc).date()
    rows = db.query(Site).join(ManpowerRequest, ManpowerRequest.site_id == Site.id).join(
        SupplierResponse, SupplierResponse.manpower_request_id == ManpowerRequest.id
    ).filter(
        SupplierResponse.supplier_id == worker.supplier_id,
        SupplierResponse.status.in_(CONFIRMED_RESPONSE_STATUSES),
        ManpowerRequest.status != "CANCELLED",
        Site.qr_status == "ACTIVE",
    ).all()
    sites = {s.id: s for s in rows}.values()
    venues = []
    for s in sites:
        has_today = any(m.required_date.date() == today for m in db.query(ManpowerRequest).filter(ManpowerRequest.site_id == s.id).all())
        if has_today:
            venues.append({**site_summary(s), "qr_data": s.qr_token})
    return venues


@router.post("/check-in", response_model=AttendanceResponse)
def check_in(req: CheckInRequest, db: Session = Depends(get_db), current_user: User = Depends(require_role([RoleEnum.OUTSOURCE_WORKER]))):
    # Check GPS Accuracy
    if req.accuracy > 100:
        log_audit_event(db, current_user.id, current_user.role.value, "attendance_rejected", "attendance", 0, None, {"reason": "accuracy", "val": req.accuracy})
        raise HTTPException(400, "Unable to verify your current location.")
        
    # Check QR validity: only the exact token printed on the venue's current poster counts
    qr_site = resolve_site_from_qr(db, req.qr_data)
        
    assignment_site = qr_site

    worker = db.query(Worker).filter(Worker.id == current_user.worker_id).first()
    if not worker:
        raise HTTPException(400, "Worker profile missing.")

    # Find active ManpowerRequest and SupplierResponse
    today = datetime.now(timezone.utc).date()
    mrs = db.query(ManpowerRequest).filter(ManpowerRequest.site_id == assignment_site.id).all()
    mrs = [m for m in mrs if m.required_date.date() == today and m.status != "CANCELLED"]
    
    sr = None
    mr = None
    for req_mr in mrs:
        sr = db.query(SupplierResponse).filter(
            SupplierResponse.manpower_request_id == req_mr.id,
            SupplierResponse.supplier_id == worker.supplier_id,
            SupplierResponse.status.in_(CONFIRMED_RESPONSE_STATUSES)
        ).first()
        if sr:
            mr = req_mr
            break
            
    if not sr:
        log_audit_event(db, current_user.id, current_user.role.value, "attendance_rejected", "attendance", 0, None, {"reason": "no_active_shift"})
        raise HTTPException(403, "Your agency does not have a confirmed shift at this location today.")

    # Dynamically find or create WorkerAssignment
    wa = db.query(WorkerAssignment).filter(
        WorkerAssignment.supplier_response_id == sr.id,
        WorkerAssignment.worker_id == worker.id
    ).first()
    
    if not wa:
        wa = WorkerAssignment(
            supplier_response_id=sr.id,
            worker_id=worker.id,
            status="ASSIGNED"
        )
        db.add(wa)
        db.flush()
    
    # Check Geofence
    if assignment_site.latitude is not None and assignment_site.longitude is not None:
        dist = haversine_distance(req.latitude, req.longitude, assignment_site.latitude, assignment_site.longitude)
        allowed_radius = assignment_site.geofence_radius_meters or 100.0
        if dist > allowed_radius:
            log_audit_event(db, current_user.id, current_user.role.value, "attendance_rejected", "attendance", 0, None, {"reason": "geofence", "dist": dist})
            raise HTTPException(400, f"Geolocation mismatch: You are {int(dist)}m away from {assignment_site.name} (allowed: {int(allowed_radius)}m). You must be physically at the location to check in.")
        
    # Duplicate attendance
    att = db.query(Attendance).filter(Attendance.worker_assignment_id == wa.id).first()
    if att and att.check_in_time:
        raise HTTPException(400, "Already checked in for this shift.")
        
    worker = db.query(Worker).filter(Worker.id == current_user.worker_id).first()
    if not worker:
        raise HTTPException(400, "Worker profile missing.")

    # Biometric Pipeline
    # 1. Liveness
    is_live, l_score = verify_liveness(req.live_face_image)
    if not is_live:
        log_audit_event(db, current_user.id, current_user.role.value, "attendance_rejected", "attendance", 0, None, {"reason": "liveness_failed"})
        raise HTTPException(400, "Passive liveness check failed. Please look directly into the camera.")

    # 2. Extract Embedding
    try:
        live_embedding = extract_face_embedding(req.live_face_image)
    except ValueError as e:
        log_audit_event(db, current_user.id, current_user.role.value, "attendance_rejected", "attendance", 0, None, {"reason": "face_extraction_failed"})
        raise HTTPException(400, f"Face detection failed: {str(e)}")
        
    # 3. 1:1 Match against enrolled identity (skipped when no face engine is installed)
    if live_embedding is None:
        pass
    elif not worker.face_embedding:
        # Enrolls this face identity for this worker on initial check-in
        worker.face_embedding = json.dumps(live_embedding)
        db.add(worker)
        db.flush()
    else:
        try:
            enrolled_embedding = json.loads(worker.face_embedding)
            is_match, similarity = verify_face_match(live_embedding, enrolled_embedding)
        except Exception:
            raise HTTPException(400, "Biometric verification error. Please retry photo.")

        if not is_match:
            log_audit_event(db, current_user.id, current_user.role.value, "attendance_rejected", "attendance", 0, None, {"reason": "face_mismatch"})
            raise HTTPException(400, "Face verification failed! This selfie does not match the registered employee. Proxy check-in is not permitted.")
        
    # 4. Duplicate Identity Check (Anti-Cheating across other workers today)
    is_unique = True
    if live_embedding is not None:
        is_unique, msg = check_duplicate_identity(db, live_embedding, worker.id, qr_site.id)
    if not is_unique:
        log_audit_event(db, current_user.id, current_user.role.value, "attendance_rejected", "attendance", 0, None, {"reason": "duplicate_identity"})
        raise HTTPException(400, "Attendance has already been recorded for this identity today under another worker profile.")

    # Atomically create attendance
    if not att:
        att = Attendance(worker_assignment_id=wa.id)
        db.add(att)
        
    att.check_in_time = datetime.now(timezone.utc)
    att.check_in_lat = req.latitude
    att.check_in_lng = req.longitude
    att.check_in_accuracy = req.accuracy
    att.check_in_qr_id = qr_site.id
    att.check_in_verification_method = "QR_GPS_FACE" if live_embedding is not None else "QR_GPS_SELFIE"
    att.device_info = req.device_info
    att.status = "CHECKED_IN"
    att.check_in_face_embedding = json.dumps(live_embedding) if live_embedding is not None else None
    
    # Record biometrics
    att.face_verified = live_embedding is not None
    att.liveness_score = l_score if live_embedding is not None else None
    
    # Notify Supplier Head & Operations Manager
    w_name = f"{worker.first_name} {worker.last_name}"
    sup = db.query(Supplier).filter(Supplier.id == worker.supplier_id).first() if worker.supplier_id else None
    sup_name = sup.name if sup else "Agency"

    if worker.supplier_id:
        db.add(Notification(
            supplier_id=worker.supplier_id,
            title=f"🟢 Shift Started: {w_name}",
            message=f"{w_name} clocked in at {qr_site.name} ({mr.start_time} - {mr.end_time}).",
            entity_type="SHIFT_CHECKIN",
            entity_id=att.id
        ))

    if mr.ops_manager_id:
        db.add(Notification(
            user_id=mr.ops_manager_id,
            title=f"🟢 Driver Arrived: {qr_site.name}",
            message=f"{w_name} ({sup_name}) clocked in at {qr_site.name}.",
            entity_type="SHIFT_CHECKIN",
            entity_id=att.id
        ))

    db.commit()
    db.refresh(att)
    log_audit_event(db, current_user.id, current_user.role.value, "attendance_check_in", "attendance", att.id, None, {})
    return att

@router.post("/check-out", response_model=AttendanceResponse)
def check_out(req: CheckOutRequest, db: Session = Depends(get_db), current_user: User = Depends(require_role([RoleEnum.OUTSOURCE_WORKER]))):
    if req.accuracy > 100:
        raise HTTPException(400, "Unable to verify your current location.")
        
    if req.assignment_id is not None:
        wa = db.query(WorkerAssignment).filter(WorkerAssignment.id == req.assignment_id).first()
    else:
        # Close the worker's open shift: checked in, not yet checked out
        wa = db.query(WorkerAssignment).join(
            Attendance, Attendance.worker_assignment_id == WorkerAssignment.id
        ).filter(
            WorkerAssignment.worker_id == current_user.worker_id,
            Attendance.check_in_time.isnot(None),
            Attendance.check_out_time.is_(None)
        ).order_by(Attendance.check_in_time.desc()).first()
        if not wa:
            raise HTTPException(400, "You have not checked in for this shift yet.")
    if not wa or wa.worker_id != current_user.worker_id:
        raise HTTPException(403, "You are not assigned to this location.")
        
    sr = db.query(SupplierResponse).filter(SupplierResponse.id == wa.supplier_response_id).first()
    mr = db.query(ManpowerRequest).filter(ManpowerRequest.id == sr.manpower_request_id).first()
    assignment_site = db.query(Site).filter(Site.id == mr.site_id).first()
    if assignment_site.status == "inactive": 
        raise HTTPException(400, "Location is inactive")

    # QR validity
    qr_site = resolve_site_from_qr(db, req.qr_data)
        
    # Site match
    if qr_site.id != assignment_site.id:
        raise HTTPException(403, f"QR code is for '{qr_site.name}', but your shift was at '{assignment_site.name}'.")

    # Geofence
    if assignment_site.latitude is not None and assignment_site.longitude is not None:
        dist = haversine_distance(req.latitude, req.longitude, assignment_site.latitude, assignment_site.longitude)
        allowed_radius = assignment_site.geofence_radius_meters or 100.0
        if dist > allowed_radius:
            raise HTTPException(400, f"You are outside the permitted location area ({int(dist)}m away). You must be at the site to check out.")

    att = db.query(Attendance).filter(Attendance.worker_assignment_id == wa.id).first()
    if not att or not att.check_in_time:
        raise HTTPException(400, "You have not checked in for this shift yet.")
        
    if att.check_out_time:
        raise HTTPException(400, "Shift already clocked out.")
        
    worker = db.query(Worker).filter(Worker.id == current_user.worker_id).first()
    if not worker:
        raise HTTPException(400, "Worker profile missing.")

    # Biometric Pipeline (Checkout - Enforces exact same person check-out)
    is_live, l_score = verify_liveness(req.live_face_image)
    if not is_live:
        raise HTTPException(400, "Unable to verify live face presence. Please face the camera directly.")

    try:
        live_embedding = extract_face_embedding(req.live_face_image)
    except ValueError as e:
        raise HTTPException(400, f"Face verification failed: {str(e)}")
        
    # Verify checkout face matches morning check-in face (Same person for the entire day!)
    reference_embedding = None
    if att.check_in_face_embedding:
        try:
            reference_embedding = json.loads(att.check_in_face_embedding)
        except Exception:
            pass
    if not reference_embedding and worker.face_embedding:
        try:
            reference_embedding = json.loads(worker.face_embedding)
        except Exception:
            pass

    if reference_embedding and live_embedding is not None:
        is_match, similarity = verify_face_match(live_embedding, reference_embedding)
        if not is_match:
            raise HTTPException(400, "Check-out face does not match the employee who clocked in today! Proxy check-out prohibited.")
    
    att.check_out_time = datetime.now(timezone.utc)
    att.check_out_lat = req.latitude
    att.check_out_lng = req.longitude
    att.check_out_accuracy = req.accuracy
    att.check_out_qr_id = qr_site.id
    att.check_out_verification_method = "QR_GPS_FACE" if live_embedding is not None else "QR_GPS_SELFIE"
    att.status = "CHECKED_OUT"
    
    # Notify Supplier Head & Operations Manager
    duty_hours = 0.0
    if att.check_in_time and att.check_out_time:
        t_out = att.check_out_time.replace(tzinfo=None) if att.check_out_time.tzinfo else att.check_out_time
        t_in = att.check_in_time.replace(tzinfo=None) if att.check_in_time.tzinfo else att.check_in_time
        delta = t_out - t_in
        duty_hours = round(max(0.0, delta.total_seconds() / 3600.0), 2)

    w_name = f"{worker.first_name} {worker.last_name}"
    sup = db.query(Supplier).filter(Supplier.id == worker.supplier_id).first() if worker.supplier_id else None
    sup_name = sup.name if sup else "Agency"

    if worker.supplier_id:
        db.add(Notification(
            supplier_id=worker.supplier_id,
            title=f"🔴 Shift Ended: {w_name}",
            message=f"{w_name} completed shift at {qr_site.name}. Total duty hours: {duty_hours} hrs.",
            entity_type="SHIFT_CHECKOUT",
            entity_id=att.id
        ))

    if mr.ops_manager_id:
        db.add(Notification(
            user_id=mr.ops_manager_id,
            title=f"🔴 Driver Clocked Out: {qr_site.name}",
            message=f"{w_name} ({sup_name}) clocked out at {qr_site.name} ({duty_hours} hrs).",
            entity_type="SHIFT_CHECKOUT",
            entity_id=att.id
        ))

    db.commit()
    db.refresh(att)
    log_audit_event(db, current_user.id, current_user.role.value, "attendance_check_out", "attendance", att.id, None, {})
    return att

@router.get("/location-shifts")
def get_location_shifts(
    target_date: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Location-wise shift monitoring: how many employees start shift on this location, and how many end shift on same location."""
    if current_user.role not in [RoleEnum.OPS_MANAGER, RoleEnum.SUPER_ADMIN, RoleEnum.GENERAL_MANAGER, RoleEnum.ACCOUNTING]:
        raise HTTPException(status_code=403, detail="Forbidden")

    if target_date:
        try:
            filter_date = datetime.strptime(target_date, "%Y-%m-%d").date()
        except Exception:
            filter_date = datetime.now(timezone.utc).date()
    else:
        filter_date = datetime.now(timezone.utc).date()

    site_query = db.query(Site)
    if current_user.role == RoleEnum.OPS_MANAGER:
        site_query = site_query.filter(Site.manager_id == current_user.id)
    sites = site_query.all()

    results = []
    for site in sites:
        reqs = db.query(ManpowerRequest).filter(
            ManpowerRequest.site_id == site.id,
            func.date(ManpowerRequest.required_date) == filter_date
        ).all()

        total_scheduled = sum(r.total_required_workers for r in reqs)
        req_ids = [r.id for r in reqs]

        assignments = db.query(WorkerAssignment, Attendance, Worker, Supplier)\
            .join(SupplierResponse, WorkerAssignment.supplier_response_id == SupplierResponse.id)\
            .outerjoin(Attendance, Attendance.worker_assignment_id == WorkerAssignment.id)\
            .join(Worker, WorkerAssignment.worker_id == Worker.id)\
            .join(Supplier, Worker.supplier_id == Supplier.id)\
            .filter(SupplierResponse.manpower_request_id.in_(req_ids)).all() if req_ids else []

        started_count = sum(1 for _, a, _, _ in assignments if a and a.check_in_time is not None)
        ended_count = sum(1 for _, a, _, _ in assignments if a and a.check_out_time is not None)
        active_on_site = started_count - ended_count

        worker_list = []
        for wa, a, wrk, sup in assignments:
            worker_list.append({
                "assignment_id": wa.id,
                "worker_id": wrk.id,
                "worker_name": f"{wrk.first_name} {wrk.last_name}",
                "internal_worker_id": wrk.internal_worker_id,
                "supplier_name": sup.name,
                "check_in_time": a.check_in_time.isoformat() if a and a.check_in_time else None,
                "check_out_time": a.check_out_time.isoformat() if a and a.check_out_time else None,
                "status": a.status if a else "SCHEDULED"
            })

        results.append({
            "site_id": site.id,
            "site_name": site.name,
            "site_address": site.address or "",
            "date": filter_date.strftime("%Y-%m-%d"),
            "total_scheduled": total_scheduled,
            "started_shift_count": started_count,
            "ended_shift_count": ended_count,
            "active_on_site": max(active_on_site, 0),
            "workers": worker_list
        })

    return results

@router.get("/supplier-live")
def get_supplier_live_attendance(
    target_date: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role([RoleEnum.SUPPLIER_HEAD]))
):
    """Supplier Head live employee shift tracking: which workers started shift, location, time, and status."""
    if target_date:
        try:
            filter_date = datetime.strptime(target_date, "%Y-%m-%d").date()
        except Exception:
            filter_date = datetime.now(timezone.utc).date()
    else:
        filter_date = datetime.now(timezone.utc).date()

    records = db.query(WorkerAssignment, Attendance, Worker, ManpowerRequest, Site)\
        .join(SupplierResponse, WorkerAssignment.supplier_response_id == SupplierResponse.id)\
        .join(ManpowerRequest, SupplierResponse.manpower_request_id == ManpowerRequest.id)\
        .join(Site, ManpowerRequest.site_id == Site.id)\
        .join(Worker, WorkerAssignment.worker_id == Worker.id)\
        .outerjoin(Attendance, Attendance.worker_assignment_id == WorkerAssignment.id)\
        .filter(
            SupplierResponse.supplier_id == current_user.supplier_id,
            func.date(ManpowerRequest.required_date) == filter_date
        ).all()

    results = []
    for wa, a, wrk, mr, site in records:
        status_label = "SCHEDULED"
        if a:
            if a.check_out_time:
                status_label = "SHIFT_ENDED"
            elif a.check_in_time:
                status_label = "ON_SHIFT"

        duty_hours = 0.0
        if a and a.check_in_time and a.check_out_time:
            delta = a.check_out_time - a.check_in_time
            duty_hours = round(delta.total_seconds() / 3600.0, 2)

        results.append({
            "worker_id": wrk.id,
            "worker_name": f"{wrk.first_name} {wrk.last_name}",
            "internal_worker_id": wrk.internal_worker_id,
            "qid": wrk.qid or "",
            "phone": wrk.whatsapp_number or wrk.phone or "",
            "site_name": site.name,
            "shift_window": f"{mr.start_time} - {mr.end_time}",
            "check_in_time": a.check_in_time.isoformat() if a and a.check_in_time else None,
            "check_out_time": a.check_out_time.isoformat() if a and a.check_out_time else None,
            "duty_hours": duty_hours,
            "status": status_label
        })

    return results
