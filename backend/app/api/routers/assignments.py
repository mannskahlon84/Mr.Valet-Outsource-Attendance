from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models.all_models import WorkerAssignment, SupplierResponse, ManpowerRequest, Worker, Site, User, RoleEnum, Attendance
from app.schemas.assignment import AssignmentDevCreate, AssignmentResponse
from app.api.deps import get_current_user, require_role
from datetime import datetime

router = APIRouter()

# removed, response_model=AssignmentResponse)
def dev_create_assignment(req: AssignmentDevCreate, db: Session = Depends(get_db), current_user: User = Depends(require_role([RoleEnum.SUPER_ADMIN]))):
    # Create dummy request and response
    worker = db.query(Worker).filter(Worker.id == req.worker_id).first()
    if not worker: raise HTTPException(404, "Worker not found")
    site = db.query(Site).filter(Site.id == req.site_id).first()
    if not site: raise HTTPException(404, "Site not found")
    
    mr = ManpowerRequest(
        ops_manager_id=current_user.id,
        site_id=req.site_id,
        required_date=req.required_date,
        start_time=req.start_time,
        end_time=req.end_time,
        total_required_workers=1,
        status="APPROVED"
    )
    db.add(mr)
    db.flush()
    
    sr = SupplierResponse(
        manpower_request_id=mr.id,
        supplier_id=worker.supplier_id,
        requested_quantity=1,
        confirmed_quantity=1,
        status="CONFIRMED"
    )
    db.add(sr)
    db.flush()
    
    wa = WorkerAssignment(
        supplier_response_id=sr.id,
        worker_id=worker.id,
        status="ASSIGNED"
    )
    db.add(wa)
    db.commit()
    
    return {
        "id": wa.id,
        "worker_id": worker.id,
        "site_id": site.id,
        "required_date": mr.required_date,
        "start_time": mr.start_time,
        "end_time": mr.end_time,
        "status": wa.status,
        "site_name": site.name,
        "site_lat": site.latitude,
        "site_lng": site.longitude,
        "site_radius": site.geofence_radius_meters
    }

@router.get("/today", response_model=AssignmentResponse)
def get_today_assignment(db: Session = Depends(get_db), current_user: User = Depends(require_role([RoleEnum.OUTSOURCE_WORKER]))):
    # Fetch today's assignment for worker
    wa = db.query(WorkerAssignment).join(SupplierResponse).join(ManpowerRequest).join(Site).filter(
        WorkerAssignment.worker_id == current_user.worker_id,
        WorkerAssignment.status == "ASSIGNED"
    ).first()
    
    if not wa:
        raise HTTPException(404, "No assignment found")
        
    sr = db.query(SupplierResponse).filter(SupplierResponse.id == wa.supplier_response_id).first()
    mr = db.query(ManpowerRequest).filter(ManpowerRequest.id == sr.manpower_request_id).first()
    site = db.query(Site).filter(Site.id == mr.site_id).first()

    att = db.query(Attendance).filter(Attendance.worker_assignment_id == wa.id).first()
    att_status = "NOT_STARTED"
    check_in_time = None
    check_out_time = None
    if att:
        if att.check_out_time:
            att_status = "CHECKED_OUT"
        elif att.check_in_time:
            att_status = "CHECKED_IN"
        check_in_time = att.check_in_time
        check_out_time = att.check_out_time
    
    return {
        "id": wa.id,
        "worker_id": wa.worker_id,
        "site_id": site.id,
        "required_date": mr.required_date,
        "start_time": mr.start_time,
        "end_time": mr.end_time,
        "status": wa.status,
        "site_name": site.name,
        "site_lat": site.latitude,
        "site_lng": site.longitude,
        "site_radius": site.geofence_radius_meters or 100.0,
        "qr_token": site.qr_token,
        "attendance_status": att_status,
        "check_in_time": check_in_time,
        "check_out_time": check_out_time
    }
