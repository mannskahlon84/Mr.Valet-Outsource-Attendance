from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import or_
from app.db.session import get_db
from app.models.all_models import Notification, User, RoleEnum
from app.schemas.notification import NotificationResponse
from app.api.deps import get_current_user
from typing import List
from datetime import datetime

router = APIRouter()

@router.get("/", response_model=List[NotificationResponse])
def get_notifications(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    q = db.query(Notification)
    if current_user.role == RoleEnum.SUPPLIER_HEAD:
        q = q.filter(or_(Notification.supplier_id == current_user.supplier_id, Notification.user_id == current_user.id))
    elif current_user.role == RoleEnum.OUTSOURCE_WORKER:
        q = q.filter(or_(Notification.worker_id == current_user.worker_id, Notification.user_id == current_user.id))
    elif current_user.role == RoleEnum.OPS_MANAGER:
        q = q.filter(or_(Notification.user_id == current_user.id, Notification.entity_type.in_(["OPS_ALERT", "SUPPLIER_RESPONSE", "MANPOWER_REQUEST"])))
    elif current_user.role in [RoleEnum.SUPER_ADMIN, RoleEnum.GENERAL_MANAGER]:
        # Management can see all recent system notifications
        pass
    else:
        q = q.filter(Notification.user_id == current_user.id)

    notifs = q.order_by(Notification.created_at.desc()).limit(50).all()
    return notifs

@router.patch("/{notif_id}/read", response_model=NotificationResponse)
def mark_notification_read(notif_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    notif = db.query(Notification).filter(Notification.id == notif_id).first()
    if not notif:
        raise HTTPException(404, "Notification not found")
    notif.is_read = True
    db.commit()
    db.refresh(notif)
    return notif

@router.post("/mark-all-read")
def mark_all_notifications_read(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    q = db.query(Notification).filter(Notification.is_read == False)
    if current_user.role == RoleEnum.SUPPLIER_HEAD:
        q = q.filter(or_(Notification.supplier_id == current_user.supplier_id, Notification.user_id == current_user.id))
    elif current_user.role == RoleEnum.OUTSOURCE_WORKER:
        q = q.filter(or_(Notification.worker_id == current_user.worker_id, Notification.user_id == current_user.id))
    elif current_user.role == RoleEnum.OPS_MANAGER:
        q = q.filter(or_(Notification.user_id == current_user.id, Notification.entity_type.in_(["OPS_ALERT", "SUPPLIER_RESPONSE", "MANPOWER_REQUEST"])))
    
    updated_count = q.update({Notification.is_read: True}, synchronize_session=False)
    db.commit()
    return {"status": "success", "marked_read": updated_count}

@router.post("/test-push")
def send_test_push_notification(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Triggers an instant zero-cost in-app push notification for the currently logged in user."""
    notif = Notification(
        user_id=current_user.id,
        supplier_id=current_user.supplier_id if current_user.role == RoleEnum.SUPPLIER_HEAD else None,
        worker_id=current_user.worker_id if current_user.role == RoleEnum.OUTSOURCE_WORKER else None,
        title="🔔 In-App Push Alert Test",
        message=f"Hello {current_user.name or 'User'}, your in-app push notification system is working perfectly on this device!",
        entity_type="SYSTEM_TEST",
        entity_id=current_user.id,
        created_at=datetime.utcnow()
    )
    db.add(notif)
    db.commit()
    db.refresh(notif)
    return {
        "status": "success",
        "notification_id": notif.id,
        "title": notif.title,
        "message": notif.message,
        "created_at": notif.created_at.isoformat()
    }

