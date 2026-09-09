from pydantic import BaseModel, ConfigDict
from datetime import datetime
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

