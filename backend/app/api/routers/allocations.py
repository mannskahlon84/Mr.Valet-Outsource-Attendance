from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models.all_models import ManpowerRequest, SupplierResponse, WorkerAssignment, Worker, User, RoleEnum, Site, Notification
from app.schemas.request import WorkerAllocation
from app.api.deps import require_role
from app.services.audit import log_audit_event

router = APIRouter()

@router.post("/{response_id}/allocate-workers")
def allocate_workers(response_id: int, req: WorkerAllocation, db: Session = Depends(get_db), current_user: User = Depends(require_role([RoleEnum.SUPPLIER_HEAD]))):
    sr = db.query(SupplierResponse).filter(SupplierResponse.id == response_id).first()
    if not sr: raise HTTPException(404, "Response not found")
    if sr.supplier_id != current_user.supplier_id: raise HTTPException(403, "Not your response")
    
    mr = db.query(ManpowerRequest).filter(ManpowerRequest.id == sr.manpower_request_id).first()
    
    # Check total unique worker count against confirmed quantity
    if len(set(req.worker_ids)) > sr.confirmed_quantity:
        raise HTTPException(400, "Cannot allocate more workers than confirmed quantity")
        
    try:
        # Prevent concurrent allocation: we process sequentially with basic overlap checks.
        allocated_count = 0
        for wid in set(req.worker_ids):
            worker = db.query(Worker).filter(Worker.id == wid).first()
            if not worker: raise HTTPException(404, f"Worker {wid} not found")
            if worker.supplier_id != current_user.supplier_id:
                raise HTTPException(403, f"Worker {wid} does not belong to you")
            if worker.status != "active":
                raise HTTPException(400, f"Worker {wid} is not active")
                
            # Conflict check
            # Find all active assignments for this worker on the same date
            conflicts = db.query(WorkerAssignment).join(SupplierResponse).join(ManpowerRequest).filter(
                WorkerAssignment.worker_id == wid,
                WorkerAssignment.status == "ASSIGNED",
                ManpowerRequest.required_date == mr.required_date
            ).all()
            
            # Simple time overlap check (Assuming HH:MM formats for start_time/end_time string)
            for c in conflicts:
                
                csr = db.query(SupplierResponse).filter(SupplierResponse.id == c.supplier_response_id).first()
                cmr = db.query(ManpowerRequest).filter(ManpowerRequest.id == csr.manpower_request_id).first()

                if cmr.id == mr.id:
                    raise HTTPException(400, f"Worker {wid} already assigned to this request")
                
                # Check string overlap (e.g. "09:00" < "17:00")
                if not (mr.end_time <= cmr.start_time or mr.start_time >= cmr.end_time):
                    raise HTTPException(400, f"Worker {wid} has a time conflict on this date")
            
            wa = WorkerAssignment(
                supplier_response_id=sr.id,
                worker_id=wid,
                status="ASSIGNED"
            )
            db.add(wa)
            db.flush()

            # In-App Push Notification to Worker
            site = db.query(Site).filter(Site.id == mr.site_id).first()
            site_name = site.name if site else f"Location #{mr.site_id}"
            req_date_str = mr.required_date.strftime('%Y-%m-%d') if hasattr(mr.required_date, 'strftime') else str(mr.required_date)
            w_notif = Notification(
                worker_id=wid,
                title="🚘 Shift Assignment",
                message=f"You have been assigned to valet shift at {site_name} on {req_date_str} ({mr.start_time} - {mr.end_time}).",
                entity_type="SHIFT_ASSIGNMENT",
                entity_id=wa.id
            )
            db.add(w_notif)
            allocated_count += 1
            
        # In-App Push Notification to Operations Manager
        if mr.ops_manager_id:
            om_notif = Notification(
                user_id=mr.ops_manager_id,
                title="👥 Drivers Assigned",
                message=f"Agency assigned {allocated_count} driver(s) for Request #{mr.id} at {site_name if 'site_name' in locals() else 'Site'}.",
                entity_type="OPS_ALERT",
                entity_id=mr.id
            )
            db.add(om_notif)

        db.commit()
        log_audit_event(db, current_user.id, current_user.role.value, "workers_allocated", "worker_assignments", sr.id, None, {"allocated": allocated_count})
        return {"status": "success", "allocated": allocated_count}
    except Exception as e:
        db.rollback()
        raise e
