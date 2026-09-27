from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_, func
from app.db.session import get_db
from app.models.all_models import Attendance, WorkerAssignment, SupplierResponse, ManpowerRequest, Site, Worker, Supplier, User, RoleEnum
from app.schemas.report import AttendanceReportResponse, AttendanceRecordDTO, ReportSummaryDTO
from app.api.deps import get_current_user, require_role
from datetime import datetime, timezone
from typing import Literal

router = APIRouter()

def get_base_query(db: Session, current_user: User):
    query = db.query(
        Attendance, WorkerAssignment, SupplierResponse, ManpowerRequest, Site, Worker, Supplier, User
    ).select_from(WorkerAssignment)\
    .outerjoin(Attendance, Attendance.worker_assignment_id == WorkerAssignment.id)\
    .join(SupplierResponse, WorkerAssignment.supplier_response_id == SupplierResponse.id)\
    .join(ManpowerRequest, SupplierResponse.manpower_request_id == ManpowerRequest.id)\
    .join(Site, ManpowerRequest.site_id == Site.id)\
    .join(Worker, WorkerAssignment.worker_id == Worker.id)\
    .join(Supplier, Worker.supplier_id == Supplier.id)\
    .outerjoin(User, Site.manager_id == User.id)
    
    # RBAC Filters
    if current_user.role == RoleEnum.OPS_MANAGER:
        query = query.filter(Site.manager_id == current_user.id)
    elif current_user.role == RoleEnum.SUPPLIER_HEAD:
        query = query.filter(Worker.supplier_id == current_user.supplier_id)
    elif current_user.role == RoleEnum.OUTSOURCE_WORKER:
        query = query.filter(Worker.id == current_user.worker_id)
        
    return query

def apply_filters(query, worker_id, qid, supplier_id, site_id, ops_manager_id, date_from, date_to, status, current_user):
    from app.models.all_models import Worker, Supplier, Site, ManpowerRequest, Attendance
    if worker_id:
        query = query.filter(Worker.id == worker_id)
    if qid:
        query = query.filter(Worker.qid == qid)
    if supplier_id and current_user.role != RoleEnum.SUPPLIER_HEAD:
        query = query.filter(Worker.supplier_id == supplier_id)
    if site_id:
        query = query.filter(Site.id == site_id)
    if ops_manager_id and current_user.role != RoleEnum.OPS_MANAGER:
        query = query.filter(Site.manager_id == ops_manager_id)
    if date_from:
        query = query.filter(ManpowerRequest.required_date >= date_from)
    if date_to:
        query = query.filter(ManpowerRequest.required_date <= date_to)
    if status:
        now = datetime.now(timezone.utc).replace(tzinfo=None)
        if status.upper() == "ABSENT":
            query = query.filter(Attendance.id == None).filter(ManpowerRequest.required_date <= now)
        elif status.upper() == "SCHEDULED":
            query = query.filter(Attendance.id == None).filter(ManpowerRequest.required_date > now)
        else:
            query = query.filter(Attendance.status == status)
            
    return query

def process_results(results):
    records = []
    total_duty_hours = 0.0
    present_dates = set()
    locations_worked = set()
    hours_per_location = {}
    absent_days = 0
    
    now = datetime.now(timezone.utc).replace(tzinfo=None)
    
    for att, wa, sr, mr, site, worker, supplier, manager in results:
        duty_hours = 0.0
        if att and att.check_in_time and att.check_out_time:
            delta = att.check_out_time - att.check_in_time
            duty_hours = delta.total_seconds() / 3600.0
            
        record_status = att.status if att else "ABSENT"
        if not att and mr.required_date > now:
            record_status = "SCHEDULED"
            
        rec = AttendanceRecordDTO(
            attendance_id=att.id if att else 0,
            worker_id=worker.id,
            worker_name=f"{worker.first_name} {worker.last_name}",
            qid=worker.qid or "",
            supplier_name=supplier.name,
            site_name=site.name,
            ops_manager_name=manager.name if manager else None,
            required_date=mr.required_date.date(),
            check_in_time=att.check_in_time if att else None,
            check_out_time=att.check_out_time if att else None,
            duty_hours=round(duty_hours, 2),
            status=record_status
        )
        records.append(rec)
        
        if duty_hours > 0:
            total_duty_hours += duty_hours
            present_dates.add(mr.required_date.date())
            locations_worked.add(site.name)
            hours_per_location[site.name] = hours_per_location.get(site.name, 0.0) + duty_hours
            
        if record_status == "ABSENT":
            absent_days += 1
            
    # Round hours
    total_duty_hours = round(total_duty_hours, 2)
    for k in hours_per_location:
        hours_per_location[k] = round(hours_per_location[k], 2)
        
    avg_hours = round(total_duty_hours / len(present_dates), 2) if present_dates else 0.0
    
    summary = ReportSummaryDTO(
        total_present_days=len(present_dates),
        total_absent_days=absent_days,
        total_duty_hours=total_duty_hours,
        average_duty_hours=avg_hours,
        number_of_locations=len(locations_worked),
        hours_per_location=hours_per_location
    )
    
    return summary, records

@router.get("/attendance", response_model=AttendanceReportResponse)
def get_attendance_report(
    worker_id: int = Query(None),
    qid: str = Query(None),
    supplier_id: int = Query(None),
    site_id: int = Query(None),
    ops_manager_id: int = Query(None),
    date_from: datetime = Query(None),
    date_to: datetime = Query(None),
    status: str = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = get_base_query(db, current_user)
    query = apply_filters(query, worker_id, qid, supplier_id, site_id, ops_manager_id, date_from, date_to, status, current_user)
    
    results = query.all()
    summary, records = process_results(results)
    
    return AttendanceReportResponse(summary=summary, records=records)

def attendance_export(fmt: str, records, summary):
    from app.services.exports import export_response, qatar_time
    headers = ["Worker ID", "Name", "QID", "Agency", "Venue", "Ops manager", "Date", "Check-in (Qatar)", "Check-out (Qatar)", "Duty hours", "Status"]
    rows = [[r.worker_id, r.worker_name, r.qid, r.supplier_name, r.site_name, r.ops_manager_name,
             r.required_date.strftime("%Y-%m-%d") if hasattr(r.required_date, "strftime") else str(r.required_date),
             qatar_time(r.check_in_time), qatar_time(r.check_out_time), r.duty_hours, r.status] for r in records]
    totals = [
        ("Total present days", summary.total_present_days),
        ("Total absent days", summary.total_absent_days),
        ("Total duty hours", summary.total_duty_hours),
        ("Average duty hours", summary.average_duty_hours),
        ("Number of locations", summary.number_of_locations),
    ]
    return export_response(fmt, f"attendance-report-{datetime.now(timezone.utc).strftime('%Y-%m-%d')}", "Attendance & Duty Hours Report",
                           headers, rows, summary=totals)


@router.get("/attendance/export/{fmt}")
def export_attendance(
    fmt: Literal["excel", "pdf"],
    worker_id: int = Query(None),
    qid: str = Query(None),
    supplier_id: int = Query(None),
    site_id: int = Query(None),
    ops_manager_id: int = Query(None),
    date_from: datetime = Query(None),
    date_to: datetime = Query(None),
    status: str = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = get_base_query(db, current_user)
    query = apply_filters(query, worker_id, qid, supplier_id, site_id, ops_manager_id, date_from, date_to, status, current_user)
    summary, records = process_results(query.all())
    return attendance_export(fmt, records, summary)
