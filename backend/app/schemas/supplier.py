from pydantic import BaseModel, ConfigDict
from typing import Optional
from datetime import datetime

class SupplierBase(BaseModel):
    name: str
    contact_person: Optional[str] = None
    contact_email: Optional[str] = None
    contact_phone: Optional[str] = None

class SupplierCreate(SupplierBase):
    billing_rate: Optional[float] = 0.0
    login_email: Optional[str] = None
    password: Optional[str] = None

class SupplierUpdate(BaseModel):
    name: Optional[str] = None
    contact_person: Optional[str] = None
    contact_email: Optional[str] = None
    contact_phone: Optional[str] = None
    billing_rate: Optional[float] = None
    status: Optional[str] = None
    login_email: Optional[str] = None
    password: Optional[str] = None

class SupplierPublic(SupplierBase):
    id: int
    status: str
    created_at: datetime
    login_email: Optional[str] = None
    model_config = ConfigDict(from_attributes=True)

class SupplierPrivate(SupplierPublic):
    billing_rate: float

