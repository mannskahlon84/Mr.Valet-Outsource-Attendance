import json
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models.all_models import Attendance, WorkerAssignment, SupplierResponse, ManpowerRequest, Site, User, RoleEnum, Worker
from app.schemas.attendance import CheckInRequest, CheckOutRequest, AttendanceResponse
from app.api.deps import get_current_user, require_role
from app.services.audit import log_audit_event
from app.services.biometrics import extract_face_embedding, verify_face_match
from app.services.liveness import verify_liveness
from app.services.duplicate_identity import check_duplicate_identity
from datetime import datetime, timezone
import math

router = APIRouter()

def haversine_distance(lat1, lon1, lat2, lon2):
    R = 6371000 # Earth radius in meters
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)
    a = math.sin(delta_phi/2.0)**2 + math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda/2.0)**2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c

@router.post("/check-in", response_model=AttendanceResponse)
def check_in(req: CheckInRequest, db: Session = Depends(get_db), current_user: User = Depends(require_role([RoleEnum.OUTSOURCE_WORKER]))):
    # Check GPS Accuracy
    if req.accuracy > 100:
        log_audit_event(db, current_user.id, current_user.role.value, "attendance_rejected", "attendance", 0, None, {"reason": "accuracy", "val": req.accuracy})
        raise HTTPException(400, "Unable to verify your current location.")
        
    # Check Assignment
    wa = db.query(WorkerAssignment).filter(WorkerAssignment.id == req.assignment_id).first()
    if not wa: 
        raise HTTPException(404, "Assignment not found")
    if wa.worker_id != current_user.worker_id:
        log_audit_event(db, current_user.id, current_user.role.value, "attendance_rejected", "attendance", 0, None, {"reason": "wrong_worker"})
        raise HTTPException(403, "You are not assigned to this location.")

    if wa.status != "ASSIGNED":
        raise HTTPException(400, "Assignment is not active")
        
    sr = db.query(SupplierResponse).filter(SupplierResponse.id == wa.supplier_response_id).first()
    mr = db.query(ManpowerRequest).filter(ManpowerRequest.id == sr.manpower_request_id).first()
    assignment_site = db.query(Site).filter(Site.id == mr.site_id).first()
    if assignment_site.status == "inactive": 
        raise HTTPException(400, "Location is inactive")
    
    # Check Date
    today = datetime.now(timezone.utc).date()
    if mr.required_date.date() != today:
        raise HTTPException(400, "Assignment is not for today's date")
        
    # Check QR validity
    qr_site = db.query(Site).filter(Site.qr_token == req.qr_data).first()
    if not qr_site:
        raise HTTPException(400, "Invalid location QR code.")
    if qr_site.qr_status != "ACTIVE":
        raise HTTPException(400, "Invalid location QR code.")
        
    # Check Assignment/Site match
    if qr_site.id != assignment_site.id:
        raise HTTPException(403, "You are not assigned to this location.")
    
    # Check Geofence
    dist = haversine_distance(req.latitude, req.longitude, assignment_site.latitude, assignment_site.longitude)
    if dist > assignment_site.geofence_radius_meters:
        log_audit_event(db, current_user.id, current_user.role.value, "attendance_rejected", "attendance", 0, None, {"reason": "geofence", "dist": dist})
        raise HTTPException(400, "You are outside the permitted attendance area.")
        
    # Duplicate attendance
    att = db.query(Attendance).filter(Attendance.worker_assignment_id == req.assignment_id).first()
    if att and att.check_in_time:
        raise HTTPException(400, "Already checked in")
        
    worker = db.query(Worker).filter(Worker.id == current_user.worker_id).first()
    if not worker or not worker.face_embedding:
        raise HTTPException(400, "Face enrollment missing.")

    # Biometric Pipeline
    # 1. Liveness
    is_live, l_score = verify_liveness(req.live_face_image)
    if not is_live:
        log_audit_event(db, current_user.id, current_user.role.value, "attendance_rejected", "attendance", 0, None, {"reason": "liveness_failed"})
        raise HTTPException(400, "Unable to verify that you are present. Please try again.")

    # 2. Extract Embedding
    try:
        live_embedding = extract_face_embedding(req.live_face_image)
    except ValueError as e:
        log_audit_event(db, current_user.id, current_user.role.value, "attendance_rejected", "attendance", 0, None, {"reason": "face_extraction_failed"})
        raise HTTPException(400, "Face verification failed. Please try again.")
        
    # 3. 1:1 Match against enrolled identity
    try:
        enrolled_embedding = json.loads(worker.face_embedding)
        is_match, similarity = verify_face_match(live_embedding, enrolled_embedding)
    except Exception:
        raise HTTPException(400, "Face verification failed. Please try again.")

    if not is_match:
        log_audit_event(db, current_user.id, current_user.role.value, "attendance_rejected", "attendance", 0, None, {"reason": "face_mismatch"})
        raise HTTPException(400, "Face verification failed. Please try again.")
        
    # 4. Duplicate Identity Check (Anti-Cheating)
    is_unique, msg = check_duplicate_identity(db, live_embedding, worker.id, qr_site.id)
    if not is_unique:
        log_audit_event(db, current_user.id, current_user.role.value, "attendance_rejected", "attendance", 0, None, {"reason": "duplicate_identity"})
        raise HTTPException(400, "Attendance has already been recorded for this identity.")

    # Atomically create attendance
    if not att:
        att = Attendance(worker_assignment_id=req.assignment_id)
        db.add(att)
        
    att.check_in_time = datetime.now(timezone.utc)
    att.check_in_lat = req.latitude
    att.check_in_lng = req.longitude
    att.check_in_accuracy = req.accuracy
    att.check_in_qr_id = qr_site.id
    att.check_in_verification_method = "QR_GPS_FACE"
    att.device_info = req.device_info
    att.status = "CHECKED_IN"
    
    # Record biometrics
    att.face_verified = True
    att.liveness_score = l_score
    
    db.commit()
    db.refresh(att)
    log_audit_event(db, current_user.id, current_user.role.value, "attendance_check_in", "attendance", att.id, None, {})
    return att

@router.post("/check-out", response_model=AttendanceResponse)
def check_out(req: CheckOutRequest, db: Session = Depends(get_db), current_user: User = Depends(require_role([RoleEnum.OUTSOURCE_WORKER]))):
    if req.accuracy > 100:
        raise HTTPException(400, "Unable to verify your current location.")
        
    wa = db.query(WorkerAssignment).filter(WorkerAssignment.id == req.assignment_id).first()
    if not wa or wa.worker_id != current_user.worker_id:
        raise HTTPException(403, "You are not assigned to this location.")
        
    sr = db.query(SupplierResponse).filter(SupplierResponse.id == wa.supplier_response_id).first()
    mr = db.query(ManpowerRequest).filter(ManpowerRequest.id == sr.manpower_request_id).first()
    assignment_site = db.query(Site).filter(Site.id == mr.site_id).first()
    if assignment_site.status == "inactive": 
        raise HTTPException(400, "Location is inactive")

    # QR validity
    qr_site = db.query(Site).filter(Site.qr_token == req.qr_data).first()
    if not qr_site or qr_site.qr_status != "ACTIVE":
        raise HTTPException(400, "Invalid location QR code.")
        
    # Site match
    if qr_site.id != assignment_site.id:
        raise HTTPException(403, "You are not assigned to this location.")

    # Geofence
    dist = haversine_distance(req.latitude, req.longitude, assignment_site.latitude, assignment_site.longitude)
    if dist > assignment_site.geofence_radius_meters:
        raise HTTPException(400, "You are outside the permitted attendance area.")

    att = db.query(Attendance).filter(Attendance.worker_assignment_id == req.assignment_id).first()
    if not att or not att.check_in_time:
        raise HTTPException(400, "Not checked in")
        
    if att.check_out_time:
        raise HTTPException(400, "Already checked out")
        
    worker = db.query(Worker).filter(Worker.id == current_user.worker_id).first()
    if not worker or not worker.face_embedding:
        raise HTTPException(400, "Face enrollment missing.")

    # Biometric Pipeline (Checkout)
    is_live, l_score = verify_liveness(req.live_face_image)
    if not is_live:
        raise HTTPException(400, "Unable to verify that you are present. Please try again.")

    try:
        live_embedding = extract_face_embedding(req.live_face_image)
    except ValueError as e:
        raise HTTPException(400, "Face verification failed. Please try again.")
        
    try:
        enrolled_embedding = json.loads(worker.face_embedding)
        is_match, similarity = verify_face_match(live_embedding, enrolled_embedding)
    except Exception:
        raise HTTPException(400, "Face verification failed. Please try again.")

    if not is_match:
        raise HTTPException(400, "Face verification failed. Please try again.")
        
    # We do NOT run duplicate identity protection on check_out because they are just leaving.
    # The identity is already tied to the attendance record for the day.
    
    att.check_out_time = datetime.now(timezone.utc)
    att.check_out_lat = req.latitude
    att.check_out_lng = req.longitude
    att.check_out_accuracy = req.accuracy
    att.check_out_qr_id = qr_site.id
    att.check_out_verification_method = "QR_GPS_FACE"
    att.status = "CHECKED_OUT"
    
    db.commit()
    db.refresh(att)
    log_audit_event(db, current_user.id, current_user.role.value, "attendance_check_out", "attendance", att.id, None, {})
    return att
