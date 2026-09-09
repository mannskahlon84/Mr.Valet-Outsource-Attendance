from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models.all_models import Supplier, User, RoleEnum
from app.schemas.supplier import SupplierCreate, SupplierUpdate, SupplierPublic, SupplierPrivate
from app.api.deps import get_current_user, require_role
from app.services.audit import log_audit_event
from typing import List, Union, Any

router = APIRouter()

def filter_supplier_response(supplier: Supplier, current_user: User) -> Any:
    # SUPER_ADMIN, ACCOUNTING, GM get SupplierPrivate
    if current_user.role in [RoleEnum.SUPER_ADMIN, RoleEnum.ACCOUNTING, RoleEnum.GENERAL_MANAGER]:
        return SupplierPrivate.model_validate(supplier)
    # Everyone else gets SupplierPublic
    return SupplierPublic.model_validate(supplier)


@router.post("/", response_model=Union[SupplierPrivate, SupplierPublic])
def create_supplier(supplier_in: SupplierCreate, db: Session = Depends(get_db), current_user: User = Depends(require_role([RoleEnum.HR_ADMIN, RoleEnum.SUPER_ADMIN]))):
    supplier = Supplier(**supplier_in.model_dump())
    db.add(supplier)
    db.commit()
    db.refresh(supplier)
    log_audit_event(db, current_user.id, current_user.role.value, "supplier_created", "suppliers", supplier.id, None, supplier_in.model_dump())
    return filter_supplier_response(supplier, current_user)

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
    return [filter_supplier_response(s, current_user) for s in suppliers]

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
    return filter_supplier_response(supplier, current_user)

@router.put("/{supplier_id}")
def update_supplier(supplier_id: int, supplier_in: SupplierUpdate, db: Session = Depends(get_db), current_user: User = Depends(require_role([RoleEnum.SUPER_ADMIN]))):
    supplier = db.query(Supplier).filter(Supplier.id == supplier_id).first()
    if not supplier: raise HTTPException(status_code=404, detail="Supplier not found")
    
    old_state = { "name": supplier.name, "contact_person": supplier.contact_person, "status": supplier.status, "billing_rate": supplier.billing_rate }
    
    if supplier_in.name is not None: supplier.name = supplier_in.name
    if supplier_in.contact_person is not None: supplier.contact_person = supplier_in.contact_person
    if supplier_in.status is not None: supplier.status = supplier_in.status
    if supplier_in.billing_rate is not None: supplier.billing_rate = supplier_in.billing_rate
    
    db.commit()
    db.refresh(supplier)
    
    new_state = { "name": supplier.name, "contact_person": supplier.contact_person, "status": supplier.status, "billing_rate": supplier.billing_rate }
    log_audit_event(db, current_user.id, current_user.role.value, "supplier_updated", "suppliers", supplier.id, old_state, new_state)
    return {"id": supplier.id}
