from pydantic import BaseModel, ConfigDict, field_validator
from datetime import datetime, timezone
from typing import Optional, Any

class NotificationResponse(BaseModel):
    id: int
    supplier_id: Optional[int] = None
    user_id: Optional[int] = None
    worker_id: Optional[int] = None
    title: Optional[str] = None
    message: str
    is_read: bool
    entity_type: Optional[str] = None
    entity_id: Optional[Any] = None
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)

    @field_validator("created_at")
    @classmethod
    def stored_as_utc(cls, value: datetime) -> datetime:
        # Rows are saved with naive UTC; say so, or browsers read them as local (Qatar) time
        return value.replace(tzinfo=timezone.utc) if value.tzinfo is None else value

