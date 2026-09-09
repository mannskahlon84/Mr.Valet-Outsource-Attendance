from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class WorkerBase(BaseModel):
    internal_worker_id: Optional[str] = None
    external_employee_id: Optional[str] = None
    supplier_id: Optional[int] = None
    first_name: str
    last_name: str
    phone: Optional[str] = None
    qid: str
    whatsapp_number: str

class WorkerCreate(WorkerBase):
    password: str

class WorkerUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    phone: Optional[str] = None
    qid: str
    whatsapp_number: str
    external_employee_id: Optional[str] = None

class WorkerResponse(WorkerBase):
    id: int
    status: str
    created_at: datetime

    class Config:
        from_attributes = True


class OtpRequest(BaseModel):
    whatsapp_number: str
    purpose: str
    payload: Optional[dict] = None

class OtpVerify(BaseModel):
    whatsapp_number: str
    otp_code: str
    purpose: str
