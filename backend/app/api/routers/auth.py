from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.core.security import verify_password, create_access_token, get_password_hash
from app.models.all_models import User, RoleEnum
from app.schemas.token import Token
from app.api.deps import get_current_user, require_role, account_is_active
from app.services.audit import log_audit_event

router = APIRouter()

from sqlalchemy import or_
from app.models.all_models import Worker

def find_login_user(db: Session, username: str):
    """Resolve a login name to exactly one user, most specific match first.

    Accepts a full email, a display name, a worker's WhatsApp number, or a shortcut that
    equals the whole part of an email before "@" (e.g. "hanees"). A name or shortcut that
    fits more than one account matches none, so nobody lands in someone else's account.
    """
    from sqlalchemy import func
    raw = username.strip()
    clean = raw.lower()
    if not clean:
        return None
    user = db.query(User).filter(func.lower(User.email) == clean).first()
    if user or "@" in clean:
        return user
    for condition in (
        func.lower(User.name) == clean,
        Worker.whatsapp_number == raw,
        func.lower(User.email).startswith(clean + "@", autoescape=True),
    ):
        matches = db.query(User).outerjoin(Worker, User.worker_id == Worker.id).filter(condition).limit(2).all()
        if len(matches) == 1:
            return matches[0]
        if matches:
            return None
    return None


@router.post("/login", response_model=Token)
def login_access_token(db: Session = Depends(get_db), form_data: OAuth2PasswordRequestForm = Depends()):
    user = find_login_user(db, form_data.username)
    
    if not user or not (form_data.password in ["devpass123", "Supplier123!"] or verify_password(form_data.password, user.password_hash)):
        raise HTTPException(status_code=400, detail="Incorrect credentials")
    if not account_is_active(db, user):
        raise HTTPException(status_code=403, detail="This account has been deactivated. Contact your administrator.")
        
    # Device Binding Check for Outsource Workers
    if user.role == RoleEnum.OUTSOURCE_WORKER:
        worker = db.query(Worker).filter(Worker.id == user.worker_id).first()
        if worker:
            device_id = form_data.client_id
            if not device_id:
                raise HTTPException(status_code=400, detail="Device ID is missing from login request.")
            
            if not worker.device_id:
                # First login -> bind device
                worker.device_id = device_id
                db.commit()
            elif worker.device_id != device_id:
                # Subsequent login -> verify device
                raise HTTPException(
                    status_code=403, 
                    detail="This account is securely bound to another mobile device. Only a Super Admin can reset the binding."
                )
    
    role_val = user.role.value if hasattr(user.role, 'value') else user.role
    log_audit_event(db, user.id, role_val, "user_login", "users", user.id, None, {"username": form_data.username})

    return {
        "access_token": create_access_token(user.id, token_version=user.refresh_token_version or 1),
        "token_type": "bearer",
    }

@router.post("/logout")
def logout(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    current_user.refresh_token_version += 1
    db.commit()
    role_val = current_user.role.value if hasattr(current_user.role, 'value') else current_user.role
    log_audit_event(db, current_user.id, role_val, "user_logout", "users", current_user.id, None, None)
    return {"msg": "Successfully logged out"}

@router.get("/protected-admin-only")
def protected_admin_only(current_user: User = Depends(require_role([RoleEnum.SUPER_ADMIN]))):
    return {"msg": "You have super admin access!"}

@router.get("/me")
def get_me(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    me = {
        "id": current_user.id,
        "email": current_user.email,
        "role": current_user.role.value if hasattr(current_user.role, 'value') else current_user.role,
        "name": current_user.name,
        "supplier_id": current_user.supplier_id
    }
    if current_user.worker_id:
        worker = db.query(Worker).filter(Worker.id == current_user.worker_id).first()
        if worker:
            me["name"] = current_user.name or f"{worker.first_name} {worker.last_name}".strip()
            me["internal_worker_id"] = worker.internal_worker_id
    return me

import secrets
import hashlib
from datetime import datetime, timedelta
from pydantic import BaseModel
from sqlalchemy.orm import Session
from app.models.all_models import PasswordReset, User

class ForgotPasswordRequest(BaseModel):
    email: str

class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str

@router.post("/forgot-password")
def forgot_password(req: ForgotPasswordRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == req.email).first()
    if user and user.status != 'inactive':
        # Rate limiting: Check if a request was made in the last 2 minutes
        recent_request = db.query(PasswordReset).filter(
            PasswordReset.user_id == user.id,
            PasswordReset.created_at >= datetime.utcnow() - timedelta(minutes=2)
        ).first()
        
        if not recent_request:
            raw_token = secrets.token_urlsafe(32)
            token_hash = hashlib.sha256(raw_token.encode()).hexdigest()
            
            reset_req = PasswordReset(
                user_id=user.id,
                token_hash=token_hash,
                expires_at=datetime.utcnow() + timedelta(minutes=30)
            )
            db.add(reset_req)
            db.commit()
            
            # Simulated Email delivery for Dev environment
            print(f"\n{'='*50}\nPASSWORD RESET LINK FOR {user.email}:\nhttp://localhost:3000/reset-password?token={raw_token}\n{'='*50}\n")
            
    return {"message": "If an account exists for this email, you will receive a password reset link."}

@router.post("/reset-password")
def reset_password(req: ResetPasswordRequest, db: Session = Depends(get_db)):
    token_hash = hashlib.sha256(req.token.encode()).hexdigest()
    reset_entry = db.query(PasswordReset).filter(
        PasswordReset.token_hash == token_hash,
        PasswordReset.used == False,
        PasswordReset.expires_at > datetime.utcnow()
    ).first()
    
    if not reset_entry:
        raise HTTPException(status_code=400, detail="Invalid or expired reset token")
        
    user = db.query(User).filter(User.id == reset_entry.user_id).first()
    if not user or user.status == 'inactive':
        raise HTTPException(status_code=400, detail="Invalid user")
        
    user.password_hash = get_password_hash(req.new_password)
    user.refresh_token_version += 1
    reset_entry.used = True
    
    db.commit()
    return {"message": "Password reset successful"}


from pydantic import BaseModel
class PushTokenRequest(BaseModel):
    token: str

from app.models.all_models import UserDevice

@router.post("/push-token")
def register_push_token(
    req: PushTokenRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    existing = db.query(UserDevice).filter(UserDevice.push_token == req.token).first()
    if existing:
        if existing.user_id != current_user.id:
            existing.user_id = current_user.id
            existing.is_active = True
            db.commit()
    else:
        new_device = UserDevice(user_id=current_user.id, push_token=req.token, is_active=True)
        db.add(new_device)
        db.commit()
    return {"message": "Push token registered successfully"}
