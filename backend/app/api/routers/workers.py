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

# Deleted workers who have past shifts are kept (for billing history) under this status
ARCHIVED = "archived"

# Same default the supplier's Enroll Driver form pre-fills; replaced when passwords are issued at launch
DEFAULT_WORKER_PASSWORD = "devpass123"


def ensure_worker_login(db: Session, worker: Worker, password: str) -> User:
    """Every worker needs a login to check in: username is their QID."""
    login = db.query(User).filter(User.worker_id == worker.id).first()
    if login:
        return login
    login = User(
        email=worker.qid,
        name=f"{worker.first_name} {worker.last_name}".strip(),
        password_hash=get_password_hash(password),
        role=RoleEnum.OUTSOURCE_WORKER,
        worker_id=worker.id,
        supplier_id=worker.supplier_id,
        status="active",
    )
    db.add(login)
    return login


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
def validate_qid_endpoint(req: QidValidationRequest, db: Session = Depends(get_db), current_user: User = Depends(require_role([RoleEnum.SUPER_ADMIN, RoleEnum.SUPPLIER_HEAD]))):
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


@router.post("/dev/add_dummy_workers")
def dev_add_dummy_workers(db: Session = Depends(get_db), current_user: User = Depends(require_role([RoleEnum.SUPER_ADMIN]))):
    from app.core.config import settings
    if settings.ENVIRONMENT != "development":
        raise HTTPException(404, "Not found")
    import random
    import string
    import uuid
    from app.core.security import get_password_hash
    
    def get_random_string(length):
        letters = string.ascii_lowercase
        return ''.join(random.choice(letters) for i in range(length))
        
    suppliers = db.query(Supplier).all()
    added_count = 0
    
    for supplier in suppliers:
        count = db.query(Worker).filter(Worker.supplier_id == supplier.id).count()
        if count >= 20:
            continue
            
        needed = 20 - count
        for i in range(needed):
            # generate unique id
            qid_num = f"{random.randint(10000000000, 99999999999)}"
            while db.query(Worker).filter(Worker.qid == qid_num).first():
                qid_num = f"{random.randint(10000000000, 99999999999)}"
                
            w_num = f"555{random.randint(100000, 999999)}"
            while db.query(Worker).filter(Worker.whatsapp_number == w_num).first():
                w_num = f"555{random.randint(100000, 999999)}"
                
            worker = Worker(
                internal_worker_id=f"WRK-{supplier.id}-{i}-{get_random_string(4)}",
                supplier_id=supplier.id,
                first_name="Dummy",
                last_name=f"Worker {get_random_string(4)}",
                phone=w_num,
                qid=qid_num,
                whatsapp_number=w_num,
                status="active",
                qr_token=f"QR_{uuid.uuid4().hex[:8].upper()}"
            )
            db.add(worker)
            db.flush()
            
            user = User(
                email=worker.qid,
                password_hash=get_password_hash("password123"),
                role=RoleEnum.OUTSOURCE_WORKER,
                worker_id=worker.id
            )
            db.add(user)
            added_count += 1
            
    db.commit()
    return {"message": f"Successfully added {added_count} dummy workers."}




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
    
    # The worker signs in with their QID
    ensure_worker_login(db, worker, password)
    
    db.commit()
    db.refresh(worker)
    log_audit_event(db, current_user.id, current_user.role.value, "worker_created", "workers", worker.id, None, worker_data)
    return worker

@router.get("/", response_model=List[WorkerResponse])
def get_workers(
    skip: int = Query(0, ge=0), 
    limit: int = Query(1000, le=5000), 
    supplier_id: int = None,
    status: str = None,
    db: Session = Depends(get_db), 
    current_user: User = Depends(get_current_user)
):
    query = db.query(Worker).filter(Worker.status != ARCHIVED)
    
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
            "supplier_head_name": head_name,
            "device_id": w.device_id
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
        qid = (row.get("qid") or "").strip()
        whatsapp = (row.get("whatsapp_number") or row.get("phone") or "").strip()
        
        if not s_id or not fname or not lname or not qid or not whatsapp:
            errors.append("Missing required fields (supplier_id, first_name, last_name, qid, whatsapp_number)")
        else:
            try:
                check_worker_registration_constraints(db=db, qid=qid, first_name=fname, last_name=lname, whatsapp_number=whatsapp)
            except HTTPException as e:
                errors.append(e.detail)
            
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
            
    return {"total": len(valid_rows) + len(invalid_rows), "valid_count": len(valid_rows), "invalid_count": len(invalid_rows), "valid_rows": valid_rows, "invalid_rows": invalid_rows}

@router.post("/bulk-import/commit")
async def bulk_import_commit(file: UploadFile = File(...), db: Session = Depends(get_db), current_user: User = Depends(require_role([RoleEnum.SUPER_ADMIN, RoleEnum.SUPPLIER_HEAD]))):
    content = await file.read()
    csv_reader = csv.DictReader(io.StringIO(content.decode("utf-8")))
    imported = 0
    skipped = 0
    problems = []
    seen_ids = set()
    
    try:
        for idx, row in enumerate(csv_reader, start=1):
            def skip(reason):
                problems.append({"row": idx, "reason": reason})

            i_id = (row.get("internal_worker_id") or "").strip()
            s_id = (row.get("supplier_id") or "").strip()
            fname = (row.get("first_name") or "").strip()
            lname = (row.get("last_name") or "").strip()
            qid = (row.get("qid") or "").strip()
            whatsapp = (row.get("whatsapp_number") or row.get("phone") or "").strip()
            password = (row.get("password") or "").strip() or DEFAULT_WORKER_PASSWORD
            
            if current_user.role == RoleEnum.SUPPLIER_HEAD and not s_id:
                s_id = str(current_user.supplier_id)
            if not s_id or not fname or not lname or not qid or not whatsapp:
                skip("supplier_id, first_name, last_name, qid and whatsapp_number are required")
                continue
            
            final_i_id = i_id or generate_internal_worker_id(db)
            if final_i_id in seen_ids or db.query(Worker).filter(Worker.internal_worker_id == final_i_id).first():
                skip(f"worker ID {final_i_id} already exists")
                continue
            seen_ids.add(final_i_id)
                
            try:
                s_id_int = int(s_id)
            except ValueError:
                skip("supplier_id must be a number")
                continue
            if current_user.role == RoleEnum.SUPPLIER_HEAD and s_id_int != current_user.supplier_id:
                skip("you can only import workers for your own agency")
                continue
            if not db.query(Supplier).filter(Supplier.id == s_id_int, Supplier.status == "active").first():
                skip("supplier not found or inactive")
                continue
            try:
                check_worker_registration_constraints(db=db, qid=qid, first_name=fname, last_name=lname, whatsapp_number=whatsapp)
            except HTTPException as e:
                skip(e.detail)
                continue
            
            worker = Worker(
                internal_worker_id=final_i_id,
                supplier_id=s_id_int,
                first_name=fname,
                last_name=lname,
                qid=validate_qatar_id(qid).get("cleaned_qid", qid),
                whatsapp_number=whatsapp,
                phone=(row.get("phone") or whatsapp).strip(),
                external_employee_id=(row.get("external_employee_id") or "").strip() or None,
                status="active"
            )
            db.add(worker)
            db.flush()
            ensure_worker_login(db, worker, password)
            imported += 1
            
        skipped = len(problems)
        db.commit()
        log_audit_event(db, current_user.id, current_user.role.value, "workers_bulk_imported", "workers", 0, None, {"imported": imported})
        return {"imported": imported, "skipped": skipped, "problems": problems}
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
    password: Optional[str] = None

@router.put("/{worker_id}")
def update_worker(worker_id: int, worker_in: WorkerUpdate, db: Session = Depends(get_db), current_user: User = Depends(require_role([RoleEnum.SUPER_ADMIN]))):
    worker = db.query(Worker).filter(Worker.id == worker_id, Worker.status != ARCHIVED).first()
    if not worker: raise HTTPException(status_code=404, detail="Worker not found")
    login = db.query(User).filter(User.worker_id == worker.id).first()
    
    old_state = { "first_name": worker.first_name, "last_name": worker.last_name, "qid": worker.qid, "whatsapp_number": worker.whatsapp_number, "supplier_id": worker.supplier_id, "status": worker.status }
    
    if worker_in.qid is not None and worker_in.qid.strip() != (worker.qid or ""):
        qid_res = validate_qatar_id(worker_in.qid.strip())
        if not qid_res["is_valid"]:
            raise HTTPException(status_code=400, detail=f"Invalid Qatar ID (QID): {qid_res['error_message']}")
        new_qid = qid_res.get("cleaned_qid", worker_in.qid.strip())
        if db.query(Worker).filter(Worker.qid == new_qid, Worker.id != worker.id).first():
            raise HTTPException(status_code=400, detail=f"QID {new_qid} is already registered to another employee.")
        # Workers sign in with their QID, so the login name follows the QID
        if login and (login.email or "") == (worker.qid or ""):
            if db.query(User).filter(User.email == new_qid, User.id != login.id).first():
                raise HTTPException(status_code=400, detail=f"QID {new_qid} is already used as another login.")
            login.email = new_qid
        worker.qid = new_qid
    if worker_in.whatsapp_number is not None and worker_in.whatsapp_number.strip() != (worker.whatsapp_number or ""):
        number = worker_in.whatsapp_number.strip()
        if db.query(Worker).filter(Worker.whatsapp_number == number, Worker.id != worker.id).first():
            raise HTTPException(status_code=400, detail=f"WhatsApp number {number} is already registered to another employee.")
        worker.whatsapp_number = number
    if worker_in.status is not None:
        if worker_in.status not in ["active", "inactive"]:
            raise HTTPException(status_code=400, detail="Status must be 'active' or 'inactive'.")
        worker.status = worker_in.status
    if worker_in.supplier_id is not None and worker_in.supplier_id != worker.supplier_id:
        if not db.query(Supplier).filter(Supplier.id == worker_in.supplier_id).first():
            raise HTTPException(status_code=400, detail="Supplier not found.")
        worker.supplier_id = worker_in.supplier_id
    if worker_in.first_name is not None: worker.first_name = worker_in.first_name.strip()
    if worker_in.last_name is not None: worker.last_name = worker_in.last_name.strip()
    if worker_in.password is not None and worker_in.password.strip():
        if login:
            login.password_hash = get_password_hash(worker_in.password.strip())
        else:
            ensure_worker_login(db, worker, worker_in.password.strip())
    
    db.commit()
    db.refresh(worker)
    
    new_state = { "first_name": worker.first_name, "last_name": worker.last_name, "qid": worker.qid, "whatsapp_number": worker.whatsapp_number, "supplier_id": worker.supplier_id, "status": worker.status }
    log_audit_event(db, current_user.id, current_user.role.value, "worker_updated", "workers", worker.id, old_state, new_state)
    return {"id": worker.id}

@router.post("/{worker_id}/reset-device")
def reset_worker_device(
    worker_id: int, 
    db: Session = Depends(get_db), 
    current_user: User = Depends(require_role([RoleEnum.SUPER_ADMIN]))
):
    """
    Super Admin exclusive endpoint to reset a worker's device binding.
    This clears the device_id so they can log in from a new device.
    """
    worker = db.query(Worker).filter(Worker.id == worker_id).first()
    if not worker:
        raise HTTPException(status_code=404, detail="Worker not found")
        
    old_state = {"device_id": worker.device_id}
    worker.device_id = None
    db.commit()
    
    from app.services.audit import log_audit_event
    log_audit_event(db, current_user.id, current_user.role.value, "worker_device_reset", "workers", worker.id, old_state, {"device_id": None})
    return {"message": "Device binding has been successfully reset."}

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

    assignment_ids = [a.id for a in db.query(WorkerAssignment).filter(WorkerAssignment.worker_id == worker.id).all()]
    worked = bool(assignment_ids) and db.query(Attendance).filter(
        Attendance.worker_assignment_id.in_(assignment_ids), Attendance.check_in_time.isnot(None)
    ).first() is not None

    # Retire the login instead of deleting it: audit logs, messages and invoices still point at
    # this user. Renaming frees the QID for a new registration; inactive blocks every sign-in.
    import uuid as _uuid
    for login in db.query(User).filter(User.worker_id == worker.id).all():
        login.email = f"retired-{login.id}-{_uuid.uuid4().hex[:8]}@deleted.local"
        login.status = "inactive"
        login.password_hash = get_password_hash(_uuid.uuid4().hex)
        login.refresh_token_version = (login.refresh_token_version or 1) + 1
        login.worker_id = None
    db.flush()

    if worked:
        # Past shifts are billed and invoiced: keep them, archive the person and release their identifiers
        worker.status = ARCHIVED
        worker.qid = None
        worker.whatsapp_number = None
        worker.device_id = None
        db.query(WorkerAssignment).filter(
            WorkerAssignment.worker_id == worker.id,
            WorkerAssignment.id.notin_(
                db.query(Attendance.worker_assignment_id).filter(Attendance.check_in_time.isnot(None))
            )
        ).update({WorkerAssignment.status: "CANCELLED"}, synchronize_session=False)
    else:
        db.query(Notification).filter(Notification.worker_id == worker.id).update({Notification.worker_id: None})
        if assignment_ids:
            db.query(AttendanceException).filter(AttendanceException.worker_assignment_id.in_(assignment_ids)).delete(synchronize_session=False)
            db.query(Attendance).filter(Attendance.worker_assignment_id.in_(assignment_ids)).delete(synchronize_session=False)
            db.query(WorkerAssignment).filter(WorkerAssignment.worker_id == worker.id).delete(synchronize_session=False)
        db.delete(worker)
    db.commit()

    log_audit_event(db, current_user.id, current_user.role.value, "worker_deleted", "workers", worker_id, old_state, None)
    return {
        "message": f"Worker '{worker_name}' (QID: {worker_qid}) successfully deleted from database. This QID is now released for new registration.",
        "id": worker_id
    }
