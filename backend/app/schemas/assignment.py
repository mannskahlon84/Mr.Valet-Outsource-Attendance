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
    site_lat: float
    site_lng: float
    site_radius: float

    class Config:
        from_attributes = True
