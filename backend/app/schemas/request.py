from typing import Optional, List
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional
from datetime import datetime, date

class SupplierRoute(BaseModel):
    supplier_id: int
    requested_quantity: int

class ManpowerRequestCreate(BaseModel):
    model_config = ConfigDict(extra='forbid')
    site_id: int
    required_date: date
    start_time: str
    end_time: str
    total_required_workers: int
    skill_category: Optional[str] = None
    notes: Optional[str] = None
    routes: List[SupplierRoute]

class SupplierResponseUpdate(BaseModel):
    model_config = ConfigDict(extra='ignore')
    status: str # ACCEPTED, PARTIAL, REJECTED, COUNTER_PROPOSED
    confirmed_quantity: int
    notes: Optional[str] = None
    proposed_start_time: Optional[str] = None
    proposed_end_time: Optional[str] = None
    response_type: Optional[str] = None
    supplier_message: Optional[str] = None

class WorkerAllocation(BaseModel):
    model_config = ConfigDict(extra='forbid')
    worker_ids: List[int]


from datetime import datetime
class FinalizeResponseRequest(BaseModel):
    accepted_quantity: int
    accepted_start_time: str
    accepted_end_time: str
    last_seen_responded_at: Optional[datetime] = None
