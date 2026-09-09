import re
from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models.all_models import Worker, Supplier, User, RoleEnum, OtpSession
from app.schemas.worker import WorkerCreate, WorkerUpdate, WorkerResponse, OtpRequest, OtpVerify
from app.api.deps import get_current_user, require_role
from app.services.audit import log_audit_event
from app.core.security import get_password_hash, verify_password
from typing import List
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
    if db.query(Worker).filter(Worker.qid == worker_in.qid).first():
        raise HTTPException(400, "QID already exists")
    if db.query(Worker).filter(Worker.whatsapp_number == worker_in.whatsapp_number).first():
        raise HTTPException(400, "WhatsApp number already exists")
        
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
    
    if db.query(Worker).filter(Worker.qid == payload["qid"]).first():
        raise HTTPException(400, "QID already exists")
    if db.query(Worker).filter(Worker.whatsapp_number == payload["whatsapp_number"]).first():
        raise HTTPException(400, "WhatsApp number already exists")
        
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

    if db.query(Worker).filter(Worker.qid == worker_in.qid).first():
        raise HTTPException(status_code=400, detail="QID already exists")
    if db.query(Worker).filter(Worker.whatsapp_number == worker_in.whatsapp_number).first():
        raise HTTPException(status_code=400, detail="This mobile number is already registered with another user.")
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
        
    return query.offset(skip).limit(limit).all()

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
