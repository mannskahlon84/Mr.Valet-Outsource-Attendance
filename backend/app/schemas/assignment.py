from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class AssignmentDevCreate(BaseModel):
    worker_id: int
    site_id: int
    required_date: datetime
    start_time: str
    end_time: str

class AssignmentResponse(BaseModel):
    id: int
    worker_id: int
    site_id: int
    required_date: datetime
    start_time: str
    end_time: str
    status: str
    site_name: str
    site_lat: Optional[float] = None
    site_lng: Optional[float] = None
    site_radius: Optional[float] = 100.0
    qr_token: Optional[str] = None
    attendance_status: Optional[str] = "NOT_STARTED"
    check_in_time: Optional[datetime] = None
    check_out_time: Optional[datetime] = None

    class Config:
        from_attributes = True
