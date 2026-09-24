from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import or_, true
from app.db.session import get_db
from app.models.all_models import Notification, User, RoleEnum
from app.schemas.notification import NotificationResponse
from app.api.deps import get_current_user
from typing import List
from datetime import datetime

router = APIRouter()

def addressed_to(user: User):
    """Notifications sent to this user: directly, to their agency, or to their worker profile."""
    if user.role == RoleEnum.SUPPLIER_HEAD and user.supplier_id:
        return or_(Notification.supplier_id == user.supplier_id, Notification.user_id == user.id)
    if user.role == RoleEnum.OUTSOURCE_WORKER and user.worker_id:
        return or_(Notification.worker_id == user.worker_id, Notification.user_id == user.id)
    return Notification.user_id == user.id


def visible_to(user: User):
    """What the bell lists. Management can also read everyone's alerts, but read/unread
    state belongs to the recipient, so they can only mark their own (see addressed_to)."""
    if user.role in [RoleEnum.SUPER_ADMIN, RoleEnum.GENERAL_MANAGER]:
        return true()
    return addressed_to(user)


@router.get("/", response_model=List[NotificationResponse])
def get_notifications(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return db.query(Notification).filter(visible_to(current_user)).order_by(Notification.created_at.desc()).limit(50).all()

@router.get("/unread-count")
def get_unread_count(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    count = db.query(Notification).filter(addressed_to(current_user), Notification.is_read == False).count()
    return {"unread": count}

@router.patch("/{notif_id}/read", response_model=NotificationResponse)
def mark_notification_read(notif_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    notif = db.query(Notification).filter(Notification.id == notif_id, addressed_to(current_user)).first()
    if not notif:
        raise HTTPException(404, "Notification not found")
    notif.is_read = True
    db.commit()
    db.refresh(notif)
    return notif

@router.post("/mark-all-read")
def mark_all_notifications_read(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    updated_count = db.query(Notification).filter(
        addressed_to(current_user), Notification.is_read == False
    ).update({Notification.is_read: True}, synchronize_session=False)
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

