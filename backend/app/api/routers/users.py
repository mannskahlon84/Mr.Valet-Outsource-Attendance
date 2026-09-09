from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models.all_models import User, RoleEnum
from app.api.deps import get_current_user

router = APIRouter()

@router.get("/gms")
def get_gms(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    gms = db.query(User).filter(User.role == RoleEnum.SUPER_ADMIN).all()
    return [{"id": gm.id, "email": gm.email} for gm in gms]

@router.get("/ops_managers")
def get_ops_managers(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    ops = db.query(User).filter(User.role == RoleEnum.OPS_MANAGER).all()
    return [{"id": o.id, "email": o.email} for o in ops]

from app.api.deps import require_role
from pydantic import BaseModel
from typing import Optional
from app.core.security import get_password_hash
from fastapi import HTTPException

class UserCreate(BaseModel):
    email: str
    password: str
    role: str
    name: str
    supplier_id: Optional[int] = None

@router.get("/")
def get_all_users(db: Session = Depends(get_db), current_user: User = Depends(require_role([RoleEnum.SUPER_ADMIN]))):
    users = db.query(User).all()
    return [{"id": u.id, "name": u.name, "email": u.email, "role": u.role.value if u.role else None, "status": u.status} for u in users]

@router.post("/")
def create_user(user_in: UserCreate, db: Session = Depends(get_db), current_user: User = Depends(require_role([RoleEnum.SUPER_ADMIN]))):
    if db.query(User).filter(User.email == user_in.email).first():
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Try mapping role string to enum
    role_enum = None
    for r in RoleEnum:
        if r.value == user_in.role:
            role_enum = r
            break
            
    if not role_enum:
        raise HTTPException(status_code=400, detail="Invalid role")
        
    user = User(
        email=user_in.email,
        password_hash=get_password_hash(user_in.password),
        role=role_enum,
        name=user_in.name,
        supplier_id=user_in.supplier_id
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return {"id": user.id, "email": user.email, "role": user.role.value}

class UserUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    role: Optional[str] = None
    supplier_id: Optional[int] = None
    status: Optional[str] = None

@router.put("/{user_id}")
def update_user(user_id: int, user_in: UserUpdate, db: Session = Depends(get_db), current_user: User = Depends(require_role([RoleEnum.SUPER_ADMIN]))):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    old_state = { "name": user.name, "email": user.email, "role": user.role.value if user.role else None, "status": user.status }
    
    if user_in.name is not None: user.name = user_in.name
    if user_in.email is not None: user.email = user_in.email
    if user_in.supplier_id is not None: user.supplier_id = user_in.supplier_id
    if user_in.status is not None:
        if user_in.status == 'inactive' and current_user.id == user.id:
            raise HTTPException(status_code=400, detail="Cannot deactivate your own account")
        if user_in.status == 'inactive' and user.role == RoleEnum.SUPER_ADMIN:
            active_admins = db.query(User).filter(User.role == RoleEnum.SUPER_ADMIN, User.status == 'active').count()
            if active_admins <= 1:
                raise HTTPException(status_code=400, detail="Cannot deactivate the last active Super Admin")
        user.status = user_in.status
    if user_in.role is not None:
        role_enum = None
        for r in RoleEnum:
            if r.value == user_in.role: role_enum = r; break
        if role_enum: user.role = role_enum

    db.commit()
    db.refresh(user)
    
    from app.services.audit import log_audit_event
    new_state = { "name": user.name, "email": user.email, "role": user.role.value, "status": user.status }
    log_audit_event(db, current_user.id, current_user.role.value, "user_updated", "users", user.id, old_state, new_state)
    
    return {"id": user.id, "email": user.email}

@router.post("/{user_id}/admin-reset-password")
def admin_reset_password(user_id: int, db: Session = Depends(get_db), current_user: User = Depends(require_role([RoleEnum.SUPER_ADMIN]))):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    import secrets, hashlib
    from datetime import datetime, timedelta
    from app.models.all_models import PasswordReset
    
    raw_token = secrets.token_urlsafe(32)
    token_hash = hashlib.sha256(raw_token.encode()).hexdigest()
    reset_req = PasswordReset(
        user_id=user.id,
        token_hash=token_hash,
        expires_at=datetime.utcnow() + timedelta(minutes=30)
    )
    db.add(reset_req)
    db.commit()
    print(f"\n{'='*50}\nADMIN GENERATED PASSWORD RESET LINK FOR {user.email}:\nhttp://localhost:3000/reset-password?token={raw_token}\n{'='*50}\n")
    return {"message": "Reset link generated in console for dev purposes"}
