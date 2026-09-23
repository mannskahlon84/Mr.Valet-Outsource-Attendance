from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime, timedelta

from app.db.session import get_db
from app.models.all_models import Site, Worker, Attendance, ManpowerRequest, User, RoleEnum
from app.api.deps import get_current_user

router = APIRouter()

@router.get("/stats")
def get_dashboard_stats(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    # Total Locations
    total_locations = db.query(Site).count()
    
    # Total Registered Employees
    total_workers = db.query(Worker).count()
    
    # Average Daily Login (last 30 days)
    thirty_days_ago = datetime.utcnow() - timedelta(days=30)
    attendance_records = db.query(Attendance).filter(Attendance.check_in_time >= thirty_days_ago).all()
    # Unique check-ins per day
    unique_days = len(set([a.check_in_time.date() for a in attendance_records if a.check_in_time]))
    total_checkins = len(attendance_records)
    avg_daily_login = total_checkins / unique_days if unique_days > 0 else 0
    
    # Top Managers Requesting
    # Group ManpowerRequests by ops_manager_id
    manager_reqs = db.query(User.name, func.count(ManpowerRequest.id).label('total')) \
                     .join(ManpowerRequest, User.id == ManpowerRequest.ops_manager_id) \
                     .group_by(User.name) \
                     .order_by(func.count(ManpowerRequest.id).desc()) \
                     .limit(5).all()
    top_managers = [{"name": m[0], "count": m[1]} for m in manager_reqs]
    
    # Top Locations (Most Attendance)
    from app.models.all_models import WorkerAssignment, SupplierResponse
    location_atts = db.query(Site.name, func.count(Attendance.id).label('total')) \
                      .join(WorkerAssignment, Attendance.worker_assignment_id == WorkerAssignment.id) \
                      .join(SupplierResponse, WorkerAssignment.supplier_response_id == SupplierResponse.id) \
                      .join(ManpowerRequest, SupplierResponse.manpower_request_id == ManpowerRequest.id) \
                      .join(Site, ManpowerRequest.site_id == Site.id) \
                      .group_by(Site.name) \
                      .order_by(func.count(Attendance.id).desc()) \
                      .limit(5).all()
    top_locations = [{"name": l[0], "count": l[1]} for l in location_atts]
    
    # Upcoming Requests
    upcoming = db.query(ManpowerRequest, Site.name).join(Site, ManpowerRequest.site_id == Site.id) \
                 .filter(ManpowerRequest.required_date >= datetime.utcnow().date()) \
                 .order_by(ManpowerRequest.required_date.asc()) \
                 .limit(5).all()
    
    upcoming_reqs = []
    for req, site_name in upcoming:
        upcoming_reqs.append({
            "id": req.id,
            "site": site_name,
            "date": req.required_date.strftime("%Y-%m-%d"),
            "quantity": req.total_required_workers
        })
        
    return {
        "total_locations": total_locations,
        "total_workers": total_workers,
        "avg_daily_login": round(avg_daily_login, 1),
        "top_managers": top_managers,
        "top_locations": top_locations,
        "upcoming_requests": upcoming_reqs
    }
