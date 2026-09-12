import re
from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.db.session import get_db
from app.models.all_models import Worker, Supplier, User, RoleEnum, OtpSession, WorkerAssignment, Attendance, AttendanceException, Notification
from app.schemas.worker import WorkerCreate, WorkerUpdate, WorkerResponse, OtpRequest, OtpVerify
from app.api.deps import get_current_user, require_role
from app.services.audit import log_audit_event
from app.services.qid_validator import validate_qatar_id
from app.core.security import get_password_hash, verify_password
from typing import List, Optional
from pydantic import BaseModel
import csv
import io
import random
from datetime import datetime, timezone, timedelta

router = APIRouter()

def generate_internal_worker_id(db: Session) -> str:
    workers = db.query(Worker.internal_worker_id).all()
    max_num = 0
    for (w_id,) in workers:
        if not w_id:
            continue
        digits = re.sub(r"\D", "", w_id)
        if digits:
            try:
                num = int(digits)
                if num > max_num:
                    max_num = num
            except ValueError:
                pass
    next_num = max(max_num + 1, 1)
    return f"WRK-{next_num:03d}"

def check_worker_registration_constraints(db: Session, qid: str, first_name: str, last_name: str, whatsapp_number: str):
    """
    Enforces strict Qatar MOI QID validation and cross-supplier duplicate prevention.
    If an employee is already registered under ANY supplier, rejects registration with clear message.
    """
    # 1. Structural & Anti-Bogus QID Validation
    qid_res = validate_qatar_id(qid)
    if not qid_res["is_valid"]:
        raise HTTPException(status_code=400, detail=f"Invalid Qatar ID (QID): {qid_res['error_message']}")

    cleaned_qid = qid_res.get("cleaned_qid", qid)

    # 2. Cross-Supplier Duplicate Check by QID
    existing_by_qid = db.query(Worker).filter(Worker.qid == cleaned_qid).first()
    if existing_by_qid:
        sup = db.query(Supplier).filter(Supplier.id == existing_by_qid.supplier_id).first()
        sup_name = sup.name if sup else f"Agency #{existing_by_qid.supplier_id}"
        raise HTTPException(
            status_code=400,
            detail=f"Registration Rejected: Employee '{existing_by_qid.first_name} {existing_by_qid.last_name}' with QID {qid} is already registered under supplier '{sup_name}'. Only Super Admin can release or delete this employee from the database to allow re-registration."
        )

    # 3. Cross-Supplier Duplicate Check by Name (case-insensitive)
    if first_name and last_name:
        existing_by_name = db.query(Worker).filter(
            func.lower(Worker.first_name) == first_name.strip().lower(),
            func.lower(Worker.last_name) == last_name.strip().lower()
        ).first()
        if existing_by_name:
            sup = db.query(Supplier).filter(Supplier.id == existing_by_name.supplier_id).first()
            sup_name = sup.name if sup else f"Agency #{existing_by_name.supplier_id}"
            raise HTTPException(
                status_code=400,
                detail=f"Registration Rejected: An employee named '{first_name} {last_name}' is already registered in the system under supplier '{sup_name}' (QID: {existing_by_name.qid or 'N/A'}). Only Super Admin can release or delete this employee from the database to allow re-registration."
            )

    # 4. Mobile number collision
    if whatsapp_number and db.query(Worker).filter(Worker.whatsapp_number == whatsapp_number).first():
        raise HTTPException(status_code=400, detail="This mobile number is already registered with another employee.")


class QidValidationRequest(BaseModel):
    qid: str

@router.post("/validate-qid")
def validate_qid_endpoint(req: QidValidationRequest, db: Session = Depends(get_db)):
    """
    Real-time endpoint for frontend forms to check QID validity, extract nationality/age,
    and verify whether it is already registered under another supplier.
    """
    result = validate_qatar_id(req.qid)
    if not result["is_valid"]:
        return {
            "is_valid": False,
            "error_message": result["error_message"],
            "already_registered": False,
            "existing_supplier": None
        }

    cleaned = result.get("cleaned_qid", req.qid)
    existing = db.query(Worker).filter(Worker.qid == cleaned).first()
    if existing:
        sup = db.query(Supplier).filter(Supplier.id == existing.supplier_id).first()
        sup_name = sup.name if sup else f"Agency #{existing.supplier_id}"
        return {
            "is_valid": False,
            "error_message": f"This employee is already registered under supplier '{sup_name}'. Only Super Admin can delete or release this employee.",
            "already_registered": True,
            "existing_supplier": sup_name,
            "worker_name": f"{existing.first_name} {existing.last_name}",
            "birth_year": result.get("birth_year"),
            "age": result.get("age"),
            "nationality": result.get("nationality")
        }

    return {
        "is_valid": True,
        "error_message": None,
        "already_registered": False,
        "existing_supplier": None,
        "birth_year": result.get("birth_year"),
        "age": result.get("age"),
        "nationality": result.get("nationality"),
        "country_code": result.get("country_code"),
        "summary": result.get("summary")
    }

@router.get("/next-id")
def get_next_worker_id(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return {"next_id": generate_internal_worker_id(db)}


@router.post("/register-request")
def request_registration_otp(worker_in: WorkerCreate, db: Session = Depends(get_db), current_user: User = Depends(require_role([RoleEnum.SUPER_ADMIN, RoleEnum.SUPPLIER_HEAD]))):
    if current_user.role == RoleEnum.SUPPLIER_HEAD and worker_in.supplier_id != current_user.supplier_id:
        raise HTTPException(403, "Cannot create worker for another supplier")
        
    if worker_in.internal_worker_id:
        if db.query(Worker).filter(Worker.internal_worker_id == worker_in.internal_worker_id).first():
            raise HTTPException(400, "Internal Worker ID already exists")
            
    check_worker_registration_constraints(
        db=db,
        qid=worker_in.qid,
        first_name=worker_in.first_name,
        last_name=worker_in.last_name,
        whatsapp_number=worker_in.whatsapp_number
    )
        
    recent = db.query(OtpSession).filter(
        OtpSession.whatsapp_number == worker_in.whatsapp_number,
        OtpSession.created_at >= datetime.utcnow() - timedelta(minutes=5)
    ).count()
    if recent >= 3:
        raise HTTPException(429, "Too many OTP requests. Please wait 5 minutes.")
        
    otp_code = str(random.randint(100000, 999999))
    print(f"DEBUG - OTP for {worker_in.whatsapp_number}: {otp_code}")
    
    session = OtpSession(
        whatsapp_number=worker_in.whatsapp_number,
        otp_hash=get_password_hash(otp_code),
        expires_at=datetime.utcnow() + timedelta(minutes=5),
        purpose="REGISTRATION",
        payload=worker_in.model_dump()
    )
    db.add(session)
    db.commit()
    return {"message": "OTP sent"}

@router.post("/register-verify", response_model=WorkerResponse)
def verify_registration_otp(verify_in: OtpVerify, db: Session = Depends(get_db), current_user: User = Depends(require_role([RoleEnum.SUPER_ADMIN, RoleEnum.SUPPLIER_HEAD]))):
    session = db.query(OtpSession).filter(
        OtpSession.whatsapp_number == verify_in.whatsapp_number,
        OtpSession.purpose == verify_in.purpose,
        OtpSession.verified == False
    ).order_by(OtpSession.created_at.desc()).first()
    
    if not session:
        raise HTTPException(400, "No active OTP session found")
        
    if datetime.utcnow() > session.expires_at:
        raise HTTPException(400, "OTP expired")
        
    if session.attempts >= session.max_attempts:
        raise HTTPException(400, "Max verification attempts exceeded")
        
    session.attempts += 1
    db.commit()
    
    if not verify_password(verify_in.otp_code, session.otp_hash):
        raise HTTPException(400, "Invalid OTP")
        
    session.verified = True
    db.commit()
    
    payload = session.payload
    
    check_worker_registration_constraints(
        db=db,
        qid=payload.get("qid", ""),
        first_name=payload.get("first_name", ""),
        last_name=payload.get("last_name", ""),
        whatsapp_number=payload.get("whatsapp_number", "")
    )
        
    worker = Worker(**payload)
    db.add(worker)
    db.commit()
    db.refresh(worker)
    log_audit_event(db, current_user.id, current_user.role.value, "worker_created_via_otp", "workers", worker.id, None, payload)
    
    return worker


@router.post("/", response_model=WorkerResponse)
def create_worker(
    worker_in: WorkerCreate, 
    db: Session = Depends(get_db), 
    current_user: User = Depends(require_role([RoleEnum.SUPER_ADMIN, RoleEnum.SUPPLIER_HEAD]))
):
    if current_user.role == RoleEnum.SUPPLIER_HEAD:
        worker_in.supplier_id = current_user.supplier_id
        # Always system-generate in series for suppliers (supplier cannot change or edit it)
        worker_in.internal_worker_id = generate_internal_worker_id(db)
    elif not worker_in.internal_worker_id:
        worker_in.internal_worker_id = generate_internal_worker_id(db)

    if not worker_in.phone:
        worker_in.phone = worker_in.whatsapp_number

    if db.query(Worker).filter(Worker.internal_worker_id == worker_in.internal_worker_id).first():
        # In case of collision, generate fresh next series ID
        worker_in.internal_worker_id = generate_internal_worker_id(db)

    check_worker_registration_constraints(
        db=db,
        qid=worker_in.qid,
        first_name=worker_in.first_name,
        last_name=worker_in.last_name,
        whatsapp_number=worker_in.whatsapp_number
    )
    if not db.query(Supplier).filter(Supplier.id == worker_in.supplier_id, Supplier.status == "active").first():
        raise HTTPException(status_code=400, detail="Invalid or inactive supplier")
        
    worker_data = worker_in.model_dump()
    password = worker_data.pop("password")
    
    worker = Worker(**worker_data)
    db.add(worker)
    db.flush()
    
    # Create corresponding User
    from app.core.security import get_password_hash
    user = User(
        email=f"worker_{worker.internal_worker_id.lower()}@mrvalet.system.local",
        password_hash=get_password_hash(password),
        role=RoleEnum.OUTSOURCE_WORKER,
        worker_id=worker.id
    )
    db.add(user)
    
    db.commit()
    db.refresh(worker)
    log_audit_event(db, current_user.id, current_user.role.value, "worker_created", "workers", worker.id, None, worker_data)
    return worker

@router.get("/", response_model=List[WorkerResponse])
def get_workers(
    skip: int = Query(0, ge=0), 
    limit: int = Query(50, le=100), 
    supplier_id: int = None,
    status: str = None,
    db: Session = Depends(get_db), 
    current_user: User = Depends(get_current_user)
):
    query = db.query(Worker)
    
    if current_user.role == RoleEnum.SUPPLIER_HEAD:
        query = query.filter(Worker.supplier_id == current_user.supplier_id)
    elif current_user.role == RoleEnum.OUTSOURCE_WORKER:
        query = query.filter(Worker.id == current_user.worker_id)
        
    if supplier_id and current_user.role != RoleEnum.SUPPLIER_HEAD:
        query = query.filter(Worker.supplier_id == supplier_id)
    if status:
        query = query.filter(Worker.status == status)
        
    workers = query.offset(skip).limit(limit).all()

    # Preload suppliers and supplier head users for attribution
    supplier_ids = {w.supplier_id for w in workers if w.supplier_id}
    suppliers_map = {}
    supplier_heads_map = {}
    if supplier_ids:
        sups = db.query(Supplier).filter(Supplier.id.in_(supplier_ids)).all()
        suppliers_map = {s.id: s for s in sups}
        sup_heads = db.query(User).filter(User.supplier_id.in_(supplier_ids), User.role == RoleEnum.SUPPLIER_HEAD).all()
        for sh in sup_heads:
            if sh.supplier_id not in supplier_heads_map:
                supplier_heads_map[sh.supplier_id] = sh.name

    result = []
    for w in workers:
        sup = suppliers_map.get(w.supplier_id)
        head_name = supplier_heads_map.get(w.supplier_id) or (sup.contact_person if sup else None) or "Direct"
        w_dict = {
            "id": w.id,
            "internal_worker_id": w.internal_worker_id,
            "external_employee_id": w.external_employee_id,
            "supplier_id": w.supplier_id,
            "first_name": w.first_name,
            "last_name": w.last_name,
            "phone": w.phone,
            "qid": w.qid,
            "whatsapp_number": w.whatsapp_number,
            "status": w.status,
            "created_at": w.created_at,
            "supplier_name": sup.name if sup else "Direct / Unassigned",
            "supplier_head_name": head_name
        }
        result.append(WorkerResponse(**w_dict))

    return result

@router.patch("/{worker_id}/status", response_model=WorkerResponse)
def change_worker_status(worker_id: int, status: str = Query(...), db: Session = Depends(get_db), current_user: User = Depends(require_role([RoleEnum.SUPER_ADMIN, RoleEnum.SUPPLIER_HEAD]))):
    if status not in ["active", "inactive"]:
        raise HTTPException(status_code=400, detail="Invalid status")
    worker = db.query(Worker).filter(Worker.id == worker_id).first()
    if not worker:
        raise HTTPException(status_code=404, detail="Worker not found")
        
    if current_user.role == RoleEnum.SUPPLIER_HEAD and worker.supplier_id != current_user.supplier_id:
        raise HTTPException(403, "Not your worker")
        
    prev_state = {"status": worker.status}
    worker.status = status
    db.commit()
    db.refresh(worker)
    action = "worker_activated" if status == "active" else "worker_deactivated"
    log_audit_event(db, current_user.id, current_user.role.value, action, "workers", worker.id, prev_state, {"status": status})
    return worker

@router.post("/bulk-import/preview")
async def bulk_import_preview(file: UploadFile = File(...), db: Session = Depends(get_db), current_user: User = Depends(require_role([RoleEnum.SUPER_ADMIN, RoleEnum.SUPPLIER_HEAD]))):
    content = await file.read()
    csv_reader = csv.DictReader(io.StringIO(content.decode("utf-8")))
    
    valid_rows = []
    invalid_rows = []
    seen_ids = set()
    
    for idx, row in enumerate(csv_reader, start=1):
        errors = []
        i_id = row.get("internal_worker_id", "").strip()
        s_id = row.get("supplier_id", "").strip()
        fname = row.get("first_name", "").strip()
        lname = row.get("last_name", "").strip()
        
        if not s_id or not fname or not lname:
            errors.append("Missing required fields (supplier_id, first_name, last_name)")
            
        if i_id:
            if i_id in seen_ids: errors.append(f"Duplicate internal_worker_id in file: {i_id}")
            seen_ids.add(i_id)
            if db.query(Worker).filter(Worker.internal_worker_id == i_id).first():
                errors.append(f"Worker ID already exists in DB: {i_id}")
            
        try:
            s_id_int = int(s_id)
            if current_user.role == RoleEnum.SUPPLIER_HEAD and s_id_int != current_user.supplier_id:
                errors.append("Cannot import for another supplier")
            else:
                supplier = db.query(Supplier).filter(Supplier.id == s_id_int).first()
                if not supplier:
                    errors.append(f"Supplier ID {s_id} does not exist")
                elif supplier.status != "active":
                    errors.append(f"Supplier ID {s_id} is inactive")
        except ValueError:
            errors.append("Invalid supplier_id format")
            
        if errors:
            invalid_rows.append({"row": idx, "data": row, "errors": errors})
        else:
            valid_rows.append({"row": idx, "data": row})
            
    return {"total": idx, "valid_count": len(valid_rows), "invalid_count": len(invalid_rows), "valid_rows": valid_rows, "invalid_rows": invalid_rows}

@router.post("/bulk-import/commit")
async def bulk_import_commit(file: UploadFile = File(...), db: Session = Depends(get_db), current_user: User = Depends(require_role([RoleEnum.SUPER_ADMIN, RoleEnum.SUPPLIER_HEAD]))):
    content = await file.read()
    csv_reader = csv.DictReader(io.StringIO(content.decode("utf-8")))
    imported = 0
    skipped = 0
    seen_ids = set()
    
    try:
        for idx, row in enumerate(csv_reader, start=1):
            i_id = row.get("internal_worker_id", "").strip()
            s_id = row.get("supplier_id", "").strip()
            fname = row.get("first_name", "").strip()
            lname = row.get("last_name", "").strip()
            
            if not s_id or not fname or not lname:
                skipped += 1
                continue
            
            final_i_id = i_id
            if not final_i_id: final_i_id = generate_internal_worker_id(db)
                
            if final_i_id in seen_ids:
                skipped += 1
                continue
            seen_ids.add(final_i_id)
            
            if db.query(Worker).filter(Worker.internal_worker_id == final_i_id).first():
                skipped += 1
                continue
                
            s_id_int = int(s_id)
            if current_user.role == RoleEnum.SUPPLIER_HEAD and s_id_int != current_user.supplier_id:
                skipped += 1
                continue
                
            supplier = db.query(Supplier).filter(Supplier.id == s_id_int, Supplier.status == "active").first()
            if not supplier:
                skipped += 1
                continue
            
            worker = Worker(
                internal_worker_id=final_i_id,
                supplier_id=s_id_int,
                first_name=fname,
                last_name=lname,
                phone=row.get("phone", "").strip(),
                external_employee_id=row.get("external_employee_id", "").strip() or None
            )
            db.add(worker)
            imported += 1
            
        db.commit()
        log_audit_event(db, current_user.id, current_user.role.value, "workers_bulk_imported", "workers", 0, None, {"imported": imported})
        return {"imported": imported, "skipped": skipped}
    except Exception as e:
        db.rollback()
        raise e

from pydantic import BaseModel
from typing import Optional
class WorkerUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    qid: Optional[str] = None
    whatsapp_number: Optional[str] = None
    supplier_id: Optional[int] = None
    status: Optional[str] = None

@router.put("/{worker_id}")
def update_worker(worker_id: int, worker_in: WorkerUpdate, db: Session = Depends(get_db), current_user: User = Depends(require_role([RoleEnum.SUPER_ADMIN]))):
    worker = db.query(Worker).filter(Worker.id == worker_id).first()
    if not worker: raise HTTPException(status_code=404, detail="Worker not found")
    
    old_state = { "first_name": worker.first_name, "last_name": worker.last_name, "qid": worker.qid, "whatsapp_number": worker.whatsapp_number, "supplier_id": worker.supplier_id, "status": worker.status }
    
    if worker_in.first_name is not None: worker.first_name = worker_in.first_name
    if worker_in.last_name is not None: worker.last_name = worker_in.last_name
    if worker_in.qid is not None: worker.qid = worker_in.qid
    if worker_in.whatsapp_number is not None: worker.whatsapp_number = worker_in.whatsapp_number
    if worker_in.supplier_id is not None: worker.supplier_id = worker_in.supplier_id
    if worker_in.status is not None: worker.status = worker_in.status
    
    db.commit()
    db.refresh(worker)
    
    from app.services.audit import log_audit_event
    new_state = { "first_name": worker.first_name, "last_name": worker.last_name, "qid": worker.qid, "whatsapp_number": worker.whatsapp_number, "supplier_id": worker.supplier_id, "status": worker.status }
    log_audit_event(db, current_user.id, current_user.role.value, "worker_updated", "workers", worker.id, old_state, new_state)
    return {"id": worker.id}

@router.delete("/{worker_id}")
def delete_worker(
    worker_id: int, 
    db: Session = Depends(get_db), 
    current_user: User = Depends(require_role([RoleEnum.SUPER_ADMIN]))
):
    """
    Super Admin exclusive endpoint to delete an employee from the system.
    Safely cascades foreign keys so the worker's QID is released and can be re-registered if desired.
    """
    worker = db.query(Worker).filter(Worker.id == worker_id).first()
    if not worker:
        raise HTTPException(status_code=404, detail="Worker not found")
        
    worker_name = f"{worker.first_name} {worker.last_name}".strip()
    worker_qid = worker.qid
    old_state = {
        "id": worker.id,
        "name": worker_name,
        "qid": worker_qid,
        "supplier_id": worker.supplier_id
    }

    # 1. Nullify worker_id on notifications to prevent FK violation
    db.query(Notification).filter(Notification.worker_id == worker.id).update({Notification.worker_id: None})

    # 2. Delete linked attendance and assignments
    assignments = db.query(WorkerAssignment).filter(WorkerAssignment.worker_id == worker.id).all()
    assignment_ids = [a.id for a in assignments]
    if assignment_ids:
        db.query(AttendanceException).filter(AttendanceException.assignment_id.in_(assignment_ids)).delete(synchronize_session=False)
        db.query(Attendance).filter(Attendance.assignment_id.in_(assignment_ids)).delete(synchronize_session=False)
        db.query(WorkerAssignment).filter(WorkerAssignment.worker_id == worker.id).delete(synchronize_session=False)

    # 3. Delete linked user account if exists
    db.query(User).filter(User.worker_id == worker.id).delete(synchronize_session=False)

    # 4. Delete worker
    db.delete(worker)
    db.commit()

    log_audit_event(db, current_user.id, current_user.role.value, "worker_deleted", "workers", worker_id, old_state, None)
    return {
        "message": f"Worker '{worker_name}' (QID: {worker_qid}) successfully deleted from database. This QID is now released for new registration.",
        "id": worker_id
    }
