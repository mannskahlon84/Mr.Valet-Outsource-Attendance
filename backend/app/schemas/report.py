from pydantic import BaseModel
from typing import List, Optional, Dict
from datetime import datetime, date

class AttendanceRecordDTO(BaseModel):
    attendance_id: int
    worker_id: int
    worker_name: str
    qid: str
    supplier_name: str
    site_name: str
    ops_manager_name: Optional[str]
    required_date: date
    check_in_time: Optional[datetime]
    check_out_time: Optional[datetime]
    duty_hours: float
    status: str

class ReportSummaryDTO(BaseModel):
    total_present_days: int
    total_absent_days: int
    total_duty_hours: float
    average_duty_hours: float
    number_of_locations: int
    hours_per_location: Dict[str, float]

class AttendanceReportResponse(BaseModel):
    summary: ReportSummaryDTO
    records: List[AttendanceRecordDTO]
