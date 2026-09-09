from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models.all_models import Notification, User, RoleEnum
from app.schemas.notification import NotificationResponse
from app.api.deps import require_role
from typing import List

router = APIRouter()

@router.get("/", response_model=List[NotificationResponse])
def get_notifications(db: Session = Depends(get_db), current_user: User = Depends(require_role([RoleEnum.SUPPLIER_HEAD]))):
    notifs = db.query(Notification).filter(Notification.supplier_id == current_user.supplier_id).order_by(Notification.created_at.desc()).all()
    return notifs

@router.patch("/{notif_id}/read", response_model=NotificationResponse)
def mark_notification_read(notif_id: int, db: Session = Depends(get_db), current_user: User = Depends(require_role([RoleEnum.SUPPLIER_HEAD]))):
    notif = db.query(Notification).filter(Notification.id == notif_id, Notification.supplier_id == current_user.supplier_id).first()
    if notif:
        notif.is_read = True
        db.commit()
        db.refresh(notif)
    return notif
