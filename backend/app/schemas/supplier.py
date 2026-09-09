from pydantic import BaseModel, ConfigDict
from typing import Optional
from datetime import datetime

class SupplierBase(BaseModel):
    name: str
    contact_person: Optional[str] = None
    contact_email: Optional[str] = None
    contact_phone: Optional[str] = None

class SupplierCreate(SupplierBase):
    pass

class SupplierUpdate(SupplierBase):
    name: Optional[str] = None
    billing_rate: Optional[float] = None
    status: Optional[str] = None

class SupplierPublic(SupplierBase):
    id: int
    status: str
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)

class SupplierPrivate(SupplierPublic):
    billing_rate: float
