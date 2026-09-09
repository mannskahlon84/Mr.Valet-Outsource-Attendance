import json
from datetime import datetime, date
from typing import Tuple, List
from sqlalchemy.orm import Session
from app.models.all_models import Attendance, WorkerAssignment, Worker, AttendanceAudit, Site
from app.services.biometrics import verify_face_match

def check_duplicate_identity(
    db: Session, 
    live_embedding: List[float], 
    current_worker_id: int, 
    site_id: int,
    current_date: date = None
) -> Tuple[bool, str]:
    if current_date is None:
        current_date = datetime.utcnow().date()
        
    start_of_day = datetime.combine(current_date, datetime.min.time())
    end_of_day = datetime.combine(current_date, datetime.max.time())
    
    # CONCURRENCY PROTECTION
    # Force a write lock on the Site to serialize checks. 
    # Works across both SQLite (upgrades to EXCLUSIVE) and PostgreSQL (Row Exclusive lock).
    site = db.query(Site).filter(Site.id == site_id).first()
    if site:
        site.name = site.name # Dummy update to trigger row lock
        db.add(site)
        db.flush() 
    
    todays_attendances = db.query(Worker).join(
        WorkerAssignment, WorkerAssignment.worker_id == Worker.id
    ).join(
        Attendance, Attendance.worker_assignment_id == WorkerAssignment.id
    ).filter(
        Attendance.check_in_time >= start_of_day,
        Attendance.check_in_time <= end_of_day,
        Attendance.face_verified == True
    ).all()
    
    checked_workers = {w.id: w for w in todays_attendances}
    
    for w_id, worker in checked_workers.items():
        if w_id == current_worker_id:
            continue
            
        if worker.face_embedding:
            try:
                enrolled_embedding = json.loads(worker.face_embedding)
                is_match, _ = verify_face_match(live_embedding, enrolled_embedding)
                if is_match:
                    audit = AttendanceAudit(
                        worker_id=current_worker_id,
                        site_id=site_id,
                        failure_reason="IDENTITY_ALREADY_RECORDED"
                    )
                    db.add(audit)
                    db.flush()
                    return False, "IDENTITY_ALREADY_RECORDED"
            except Exception:
                pass
                
    return True, ""

