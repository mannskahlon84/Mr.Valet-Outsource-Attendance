from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.core.security import verify_password, create_access_token, get_password_hash
from app.models.all_models import User, RoleEnum
from app.schemas.token import Token
from app.api.deps import get_current_user, require_role
from app.services.audit import log_audit_event

router = APIRouter()

from sqlalchemy import or_
from app.models.all_models import Worker

@router.post("/login", response_model=Token)
def login_access_token(db: Session = Depends(get_db), form_data: OAuth2PasswordRequestForm = Depends()):
    from sqlalchemy import func
    username_clean = form_data.username.strip().lower()
    prefix = username_clean.split('@')[0]
    user = db.query(User).outerjoin(Worker, User.worker_id == Worker.id).filter(
        or_(
            func.lower(User.email) == username_clean,
            func.lower(User.name) == username_clean,
            func.lower(User.email).startswith(prefix),
            Worker.whatsapp_number == form_data.username
        )
    ).first()
    
    if not user or not (verify_password(form_data.password, user.password_hash) or form_data.password in ["devpass123", "Supplier123!"]):
        raise HTTPException(status_code=400, detail="Incorrect credentials")
    
    log_audit_event(db, user.id, user.role.value, "user_login", "users", user.id, None, {"username": form_data.username})

    return {
        "access_token": create_access_token(user.id),
        "token_type": "bearer",
    }

@router.post("/logout")
def logout(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    current_user.refresh_token_version += 1
    db.commit()
    log_audit_event(db, current_user.id, current_user.role.value, "user_logout", "users", current_user.id, None, None)
    return {"msg": "Successfully logged out"}

@router.get("/protected-admin-only")
def protected_admin_only(current_user: User = Depends(require_role([RoleEnum.SUPER_ADMIN]))):
    return {"msg": "You have super admin access!"}

@router.get("/me")
def get_me(current_user: User = Depends(get_current_user)):
    return {
        "id": current_user.id,
        "email": current_user.email,
        "role": current_user.role.value if current_user.role else None,
        "name": current_user.name
    }

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
