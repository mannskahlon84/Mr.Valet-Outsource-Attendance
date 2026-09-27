from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models.all_models import ManpowerRequest, SupplierResponse, WorkerAssignment, Worker, User, RoleEnum, Site, Notification
from app.schemas.request import WorkerAllocation
from app.api.deps import require_role
from app.services.audit import log_audit_event

router = APIRouter()


def minutes(hhmm: str) -> int:
    h, m = (hhmm or "0:0").split(":")[:2]
    return int(h) * 60 + int(m)


def shifts_overlap(start_a: str, end_a: str, start_b: str, end_b: str) -> bool:
    """Same-day shifts overlap; a shift ending at or before its start runs past midnight (22:00-06:00)."""
    def span(start, end):
        s, e = minutes(start), minutes(end)
        return s, (e + 24 * 60 if e <= s else e)
    a0, a1 = span(start_a, end_a)
    b0, b1 = span(start_b, end_b)
    return a0 < b1 and b0 < a1


def own_response(db: Session, response_id: int, current_user: User) -> SupplierResponse:
    sr = db.query(SupplierResponse).filter(SupplierResponse.id == response_id).first()
    if not sr:
        raise HTTPException(404, "Response not found")
    if current_user.role == RoleEnum.SUPPLIER_HEAD and sr.supplier_id != current_user.supplier_id:
        raise HTTPException(403, "Not your response")
    return sr


@router.get("/{response_id}")
def list_assigned_workers(response_id: int, db: Session = Depends(get_db),
                          current_user: User = Depends(require_role([RoleEnum.SUPPLIER_HEAD, RoleEnum.SUPER_ADMIN]))):
    """The drivers currently assigned to one agency response, with their attendance state."""
    from app.models.all_models import Attendance
    sr = own_response(db, response_id, current_user)
    rows = db.query(WorkerAssignment, Worker).join(Worker, WorkerAssignment.worker_id == Worker.id).filter(
        WorkerAssignment.supplier_response_id == sr.id, WorkerAssignment.status == "ASSIGNED"
    ).order_by(Worker.first_name).all()
    result = []
    for wa, w in rows:
        att = db.query(Attendance).filter(Attendance.worker_assignment_id == wa.id).first()
        state = "SHIFT_ENDED" if att and att.check_out_time else ("ON_DUTY" if att and att.check_in_time else "NOT_STARTED")
        result.append({"assignment_id": wa.id, "worker_id": w.id, "name": f"{w.first_name} {w.last_name}",
                       "internal_worker_id": w.internal_worker_id, "qid": w.qid, "attendance": state})
    return {"response_id": sr.id, "confirmed_quantity": sr.confirmed_quantity or 0, "status": sr.status, "assigned": result}


@router.post("/{response_id}/unassign/{assignment_id}")
def unassign_worker(response_id: int, assignment_id: int, db: Session = Depends(get_db),
                    current_user: User = Depends(require_role([RoleEnum.SUPPLIER_HEAD]))):
    """Take a driver off a shift, as long as they have not clocked in."""
    from app.models.all_models import Attendance
    sr = own_response(db, response_id, current_user)
    wa = db.query(WorkerAssignment).filter(WorkerAssignment.id == assignment_id, WorkerAssignment.supplier_response_id == sr.id,
                                           WorkerAssignment.status == "ASSIGNED").first()
    if not wa:
        raise HTTPException(404, "Assignment not found")
    att = db.query(Attendance).filter(Attendance.worker_assignment_id == wa.id).first()
    if att and att.check_in_time:
        raise HTTPException(400, "This driver has already clocked in for the shift and cannot be removed.")
    wa.status = "CANCELLED"
    db.add(Notification(worker_id=wa.worker_id, title="Shift assignment removed",
                        message="Your agency removed you from an upcoming shift. Please check your assignments.",
                        entity_type="SHIFT_ASSIGNMENT", entity_id=wa.id))
    db.commit()
    log_audit_event(db, current_user.id, current_user.role.value, "worker_unassigned", "worker_assignments", wa.id,
                    {"status": "ASSIGNED"}, {"status": "CANCELLED"})
    return {"status": "success"}

@router.post("/{response_id}/allocate-workers")
def allocate_workers(response_id: int, req: WorkerAllocation, db: Session = Depends(get_db), current_user: User = Depends(require_role([RoleEnum.SUPPLIER_HEAD]))):
    sr = db.query(SupplierResponse).filter(SupplierResponse.id == response_id).first()
    if not sr: raise HTTPException(404, "Response not found")
    if sr.supplier_id != current_user.supplier_id: raise HTTPException(403, "Not your response")
    
    mr = db.query(ManpowerRequest).filter(ManpowerRequest.id == sr.manpower_request_id).first()
    if mr.status == "CANCELLED":
        raise HTTPException(400, "Request is cancelled")
    if sr.status not in ["ACCEPTED", "ACCEPTED_BY_OM"]:
        raise HTTPException(400, "Workers can only be assigned once the shift is confirmed.")
    
    # Everyone already on this response counts toward the confirmed quantity
    already_assigned = {
        wa.worker_id for wa in db.query(WorkerAssignment).filter(
            WorkerAssignment.supplier_response_id == sr.id,
            WorkerAssignment.status == "ASSIGNED"
        ).all()
    }
    if len(already_assigned | set(req.worker_ids)) > sr.confirmed_quantity:
        raise HTTPException(400, f"Cannot allocate more workers than confirmed quantity ({sr.confirmed_quantity}); {len(already_assigned)} already assigned.")
        
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
                
                if shifts_overlap(mr.start_time, mr.end_time, cmr.start_time, cmr.end_time):
                    raise HTTPException(400, f"{worker.first_name} {worker.last_name} has a time conflict: another shift at an overlapping time on this date")
            
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
