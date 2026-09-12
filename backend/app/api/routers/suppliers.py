from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models.all_models import Supplier, User, RoleEnum
from app.schemas.supplier import SupplierCreate, SupplierUpdate, SupplierPublic, SupplierPrivate
from app.api.deps import get_current_user, require_role
from app.services.audit import log_audit_event
from app.core.security import get_password_hash
from typing import List, Union, Any

router = APIRouter()

def filter_supplier_response(supplier: Supplier, current_user: User, db: Session) -> Any:
    head_user = db.query(User).filter(User.supplier_id == supplier.id, User.role == RoleEnum.SUPPLIER_HEAD).first()
    data = {
        "id": supplier.id,
        "name": supplier.name,
        "contact_person": supplier.contact_person,
        "contact_email": supplier.contact_email,
        "contact_phone": supplier.contact_phone,
        "status": supplier.status,
        "created_at": supplier.created_at,
        "billing_rate": supplier.billing_rate or 0.0,
        "login_email": head_user.email if head_user else None
    }
    if current_user.role in [RoleEnum.SUPER_ADMIN, RoleEnum.ACCOUNTING, RoleEnum.GENERAL_MANAGER]:
        return SupplierPrivate(**data)
    data.pop("billing_rate", None)
    return SupplierPublic(**data)


@router.post("/", response_model=Union[SupplierPrivate, SupplierPublic])
def create_supplier(supplier_in: SupplierCreate, db: Session = Depends(get_db), current_user: User = Depends(require_role([RoleEnum.HR_ADMIN, RoleEnum.SUPER_ADMIN]))):
    in_dict = supplier_in.model_dump()
    login_email = in_dict.pop("login_email", None)
    password = in_dict.pop("password", None)

    supplier = Supplier(**in_dict)
    db.add(supplier)
    db.flush()

    if login_email and login_email.strip():
        norm_email = login_email.strip().lower()
        if db.query(User).filter(User.email == norm_email).first():
            db.rollback()
            raise HTTPException(status_code=400, detail=f"Email '{norm_email}' is already registered to another user.")
        head_user = User(
            email=norm_email,
            password_hash=get_password_hash(password if password and password.strip() else "Supplier123!"),
            role=RoleEnum.SUPPLIER_HEAD,
            supplier_id=supplier.id
        )
        db.add(head_user)

    db.commit()
    db.refresh(supplier)
    log_audit_event(db, current_user.id, current_user.role.value, "supplier_created", "suppliers", supplier.id, None, supplier_in.model_dump(exclude={"password"}))
    return filter_supplier_response(supplier, current_user, db)

@router.get("/", response_model=List[Union[SupplierPrivate, SupplierPublic]])
def get_suppliers(
    skip: int = Query(0, ge=0), 
    limit: int = Query(50, le=100), 
    status: str = None,
    db: Session = Depends(get_db), 
    current_user: User = Depends(get_current_user)
):
    query = db.query(Supplier)
    if current_user.role == RoleEnum.SUPPLIER_HEAD:
        query = query.filter(Supplier.id == current_user.supplier_id)
    elif current_user.role == RoleEnum.OUTSOURCE_WORKER:
        raise HTTPException(status_code=403, detail="Forbidden")
    
    if status:
        query = query.filter(Supplier.status == status)
        
    suppliers = query.offset(skip).limit(limit).all()
    return [filter_supplier_response(s, current_user, db) for s in suppliers]

@router.patch("/{supplier_id}/status", response_model=Union[SupplierPrivate, SupplierPublic])
def change_supplier_status(supplier_id: int, status: str = Query(...), db: Session = Depends(get_db), current_user: User = Depends(require_role([RoleEnum.HR_ADMIN, RoleEnum.SUPER_ADMIN]))):
    if status not in ["active", "inactive"]:
        raise HTTPException(status_code=400, detail="Invalid status")
    supplier = db.query(Supplier).filter(Supplier.id == supplier_id).first()
    if not supplier:
        raise HTTPException(status_code=404, detail="Supplier not found")
    prev_state = {"status": supplier.status}
    supplier.status = status
    db.commit()
    db.refresh(supplier)
    action = "supplier_activated" if status == "active" else "supplier_deactivated"
    log_audit_event(db, current_user.id, current_user.role.value, action, "suppliers", supplier.id, prev_state, {"status": status})
    return filter_supplier_response(supplier, current_user, db)

@router.put("/{supplier_id}")
def update_supplier(supplier_id: int, supplier_in: SupplierUpdate, db: Session = Depends(get_db), current_user: User = Depends(require_role([RoleEnum.SUPER_ADMIN]))):
    supplier = db.query(Supplier).filter(Supplier.id == supplier_id).first()
    if not supplier: raise HTTPException(status_code=404, detail="Supplier not found")
    
    old_state = { 
        "name": supplier.name, 
        "contact_person": supplier.contact_person, 
        "contact_email": supplier.contact_email,
        "contact_phone": supplier.contact_phone,
        "status": supplier.status, 
        "billing_rate": supplier.billing_rate 
    }
    
    if supplier_in.name is not None: supplier.name = supplier_in.name
    if supplier_in.contact_person is not None: supplier.contact_person = supplier_in.contact_person
    if supplier_in.contact_email is not None: supplier.contact_email = supplier_in.contact_email
    if supplier_in.contact_phone is not None: supplier.contact_phone = supplier_in.contact_phone
    if supplier_in.status is not None: supplier.status = supplier_in.status
    if supplier_in.billing_rate is not None: supplier.billing_rate = supplier_in.billing_rate

    # Super Admin can update or create the supplier's login email and password
    head_user = db.query(User).filter(User.supplier_id == supplier.id, User.role == RoleEnum.SUPPLIER_HEAD).first()
    if supplier_in.login_email is not None and supplier_in.login_email.strip():
        new_email = supplier_in.login_email.strip().lower()
        collision = db.query(User).filter(User.email == new_email, User.id != (head_user.id if head_user else None)).first()
        if collision:
            raise HTTPException(status_code=400, detail=f"Email '{new_email}' is already used by another user account.")
        if head_user:
            head_user.email = new_email
        else:
            head_user = User(
                email=new_email,
                password_hash=get_password_hash(supplier_in.password if supplier_in.password and supplier_in.password.strip() else "Supplier123!"),
                role=RoleEnum.SUPPLIER_HEAD,
                supplier_id=supplier.id
            )
            db.add(head_user)

    if supplier_in.password is not None and supplier_in.password.strip():
        raw_pw = supplier_in.password.strip()
        if head_user:
            head_user.password_hash = get_password_hash(raw_pw)
        else:
            fallback_email = (supplier_in.login_email or supplier.contact_email or f"{supplier.name.lower().replace(' ', '')}@supplier.mrvalet.local").strip().lower()
            head_user = User(
                email=fallback_email,
                password_hash=get_password_hash(raw_pw),
                role=RoleEnum.SUPPLIER_HEAD,
                supplier_id=supplier.id
            )
            db.add(head_user)
    
    db.commit()
    db.refresh(supplier)
    
    new_state = { 
        "name": supplier.name, 
        "contact_person": supplier.contact_person, 
        "contact_email": supplier.contact_email,
        "contact_phone": supplier.contact_phone,
        "status": supplier.status, 
        "billing_rate": supplier.billing_rate,
        "login_email": head_user.email if head_user else None
    }
    log_audit_event(db, current_user.id, current_user.role.value, "supplier_updated", "suppliers", supplier.id, old_state, new_state)
    return {"id": supplier.id, "message": "Supplier and credentials updated successfully"}
