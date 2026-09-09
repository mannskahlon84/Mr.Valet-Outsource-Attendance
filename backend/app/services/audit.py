from sqlalchemy.orm import Session
from app.models.all_models import AuditLog
from fastapi.encoders import jsonable_encoder

def log_audit_event(
    db: Session,
    actor_id: int,
    actor_role: str,
    action: str,
    entity_type: str,
    entity_id: int,
    previous_state: dict = None,
    new_state: dict = None,
    ip_address: str = None
):
    audit_entry = AuditLog(
        actor_id=actor_id,
        actor_role=actor_role,
        action=action,
        entity_type=entity_type,
        entity_id=entity_id,
        previous_state=jsonable_encoder(previous_state),
        new_state=jsonable_encoder(new_state),
        ip_address=ip_address
    )
    db.add(audit_entry)
    db.commit()
