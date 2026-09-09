from pydantic import BaseModel, Field, ConfigDict
from typing import Optional
from datetime import datetime

class CheckInRequest(BaseModel):
    model_config = ConfigDict(extra='forbid')
    
    assignment_id: int
    latitude: float
    longitude: float
    accuracy: float
    qr_data: str
    device_info: Optional[str] = None
    live_face_image: str = Field(..., description="Base64 encoded live selfie")

class CheckOutRequest(BaseModel):
    model_config = ConfigDict(extra='forbid')
    
    assignment_id: int
    latitude: float
    longitude: float
    accuracy: float
    qr_data: str
    live_face_image: str = Field(..., description="Base64 encoded live selfie")

class AttendanceResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    
    id: int
    worker_assignment_id: int
    check_in_time: Optional[datetime]
    check_out_time: Optional[datetime]
    status: str
