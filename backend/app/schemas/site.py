from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime

class SiteBase(BaseModel):
    name: str
    address: Optional[str] = None
    latitude: Optional[float] = Field(None, ge=-90.0, le=90.0)
    longitude: Optional[float] = Field(None, ge=-180.0, le=180.0)
    geofence_radius_meters: Optional[float] = Field(100.0, gt=0)
    manager_id: Optional[int] = None

class SiteCreate(SiteBase):
    pass

class SiteUpdate(BaseModel):
    name: Optional[str] = None
    address: Optional[str] = None
    latitude: Optional[float] = Field(None, ge=-90.0, le=90.0)
    longitude: Optional[float] = Field(None, ge=-180.0, le=180.0)
    geofence_radius_meters: Optional[float] = Field(None, gt=0)
    manager_id: Optional[int] = None

class SiteResponse(SiteBase):
    id: int
    status: str
    qr_token: Optional[str] = None
    qr_status: Optional[str] = None

    class Config:
        from_attributes = True
