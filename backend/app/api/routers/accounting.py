
from fastapi import APIRouter, Depends, HTTPException, Query, Response
from sqlalchemy.orm import Session
from sqlalchemy import func, and_, extract
from app.db.session import get_db
from app.models.all_models import Supplier, User, RoleEnum, SupplierResponse, ManpowerRequest, Invoice, WorkerAssignment, Attendance
from app.api.deps import get_current_user, require_role
from app.services.audit import log_audit_event
from datetime import datetime, date
from app.core.timeutil import qatar_today, utc_iso
from typing import List, Literal, Optional
from app.services.exports import export_response, qatar_time
from pydantic import BaseModel

import os
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import letter

router = APIRouter()

# Suppliers are paid per completed shift: a driver who checked in AND checked out.
# Scheduled or confirmed headcount is never billed, so no-shows cost nothing.
BILLABLE_RESPONSE_STATUSES = ['CONFIRMED', 'ACCEPTED_BY_OM', 'ACCEPTED']


def completed_shifts_query(db: Session, supplier_id: int, *filters):
    return db.query(Attendance).join(
        WorkerAssignment, Attendance.worker_assignment_id == WorkerAssignment.id
    ).join(
        SupplierResponse, WorkerAssignment.supplier_response_id == SupplierResponse.id
    ).join(
        ManpowerRequest, SupplierResponse.manpower_request_id == ManpowerRequest.id
    ).filter(
        SupplierResponse.supplier_id == supplier_id,
        SupplierResponse.status.in_(BILLABLE_RESPONSE_STATUSES),
        ManpowerRequest.status != "CANCELLED",
        Attendance.check_in_time.isnot(None),
        Attendance.check_out_time.isnot(None),
        *filters
    )


def count_completed_shifts(db: Session, supplier_id: int, *filters) -> int:
    return completed_shifts_query(db, supplier_id, *filters).count()

class AccountingSummaryItem(BaseModel):
    supplier_id: int
    supplier_name: str
    workers_supplied: int
    billing_rate: float
    total_amount: float

class InvoiceCreate(BaseModel):
    supplier_id: int
    month: int
    year: int

def generate_invoice_pdf(invoice: Invoice, supplier: Supplier):
    # Ensure dir exists
    pdf_dir = "invoices"
    os.makedirs(pdf_dir, exist_ok=True)
    file_name = f"{invoice.invoice_number}.pdf"
    file_path = os.path.join(pdf_dir, file_name)
    
    c = canvas.Canvas(file_path, pagesize=letter)
    c.setFont("Helvetica-Bold", 16)
    c.drawString(50, 750, f"INVOICE: {invoice.invoice_number}")
    
    c.setFont("Helvetica", 12)
    c.drawString(50, 710, f"Supplier: {supplier.name}")
    c.drawString(50, 690, f"Billing Period: {invoice.billing_month.strftime('%B %Y')}")
    c.drawString(50, 670, f"Generated On: {invoice.generated_at.strftime('%Y-%m-%d %H:%M')}")
    
    c.line(50, 650, 550, 650)
    
    c.drawString(50, 620, f"Completed Shifts (checked in and out): {invoice.workers_supplied_quantity}")
    c.drawString(50, 600, f"Agreed Rate Per Shift: QAR {invoice.rate_per_worker:,.2f}")
    
    c.setFont("Helvetica-Bold", 14)
    c.drawString(50, 560, f"Total Amount Payable: QAR {invoice.total_amount:,.2f}")
    
    c.save()
    return file_path

@router.get("/summary", response_model=List[AccountingSummaryItem])
def get_accounting_summary(
    day: Optional[int] = Query(None),
    month: Optional[int] = Query(None), 
    year: Optional[int] = Query(None), 
    supplier_id: Optional[int] = Query(None),
    db: Session = Depends(get_db), 
    current_user: User = Depends(get_current_user)
):
    if current_user.role not in [RoleEnum.SUPER_ADMIN, RoleEnum.ACCOUNTING, RoleEnum.GENERAL_MANAGER, RoleEnum.SUPPLIER_HEAD]:
        raise HTTPException(status_code=403, detail="Forbidden")

    # If supplier head, restrict to their supplier
    supplier_filter = []
    if current_user.role == RoleEnum.SUPPLIER_HEAD:
        supplier_filter = [Supplier.id == current_user.supplier_id]
    elif supplier_id:
        supplier_filter = [Supplier.id == supplier_id]

    suppliers = db.query(Supplier).filter(*supplier_filter).all()
    
    results = []
    for sup in suppliers:
        # Completed shifts in the target period
        req_filters = []
        if day:
            req_filters.append(extract('day', ManpowerRequest.required_date) == day)
        if month:
            req_filters.append(extract('month', ManpowerRequest.required_date) == month)
        if year:
            req_filters.append(extract('year', ManpowerRequest.required_date) == year)
            
        total_workers = count_completed_shifts(db, sup.id, *req_filters)
        
        results.append(AccountingSummaryItem(
            supplier_id=sup.id,
            supplier_name=sup.name,
            workers_supplied=total_workers,
            billing_rate=sup.billing_rate,
            total_amount=total_workers * sup.billing_rate
        ))
        
    return results

@router.post("/invoices")
def generate_invoice(
    invoice_in: InvoiceCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role([RoleEnum.SUPER_ADMIN, RoleEnum.ACCOUNTING]))
):
    billing_date = date(invoice_in.year, invoice_in.month, 1)
    
    # Check for existing active invoice
    existing = db.query(Invoice).filter(
        Invoice.supplier_id == invoice_in.supplier_id,
        Invoice.billing_month == billing_date,
        Invoice.status == "GENERATED"
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="An active invoice already exists for this supplier and period.")
        
    sup = db.query(Supplier).filter(Supplier.id == invoice_in.supplier_id).first()
    if not sup:
        raise HTTPException(status_code=404, detail="Supplier not found")
        
    total_workers = count_completed_shifts(
        db, sup.id,
        extract('month', ManpowerRequest.required_date) == invoice_in.month,
        extract('year', ManpowerRequest.required_date) == invoice_in.year
    )
    
    if total_workers == 0:
        raise HTTPException(status_code=400, detail="Cannot generate invoice: no completed shifts in this period.")
        
    invoice_num = f"INV-{invoice_in.year}{invoice_in.month:02d}-{sup.id}-{int(datetime.utcnow().timestamp())}"
    
    new_inv = Invoice(
        invoice_number=invoice_num,
        supplier_id=sup.id,
        billing_month=billing_date,
        workers_supplied_quantity=total_workers,
        rate_per_worker=sup.billing_rate,
        total_amount=total_workers * sup.billing_rate,
        status="GENERATED",
        generated_by_id=current_user.id
    )
    
    db.add(new_inv)
    db.commit()
    db.refresh(new_inv)
    
    # Generate PDF
    pdf_path = generate_invoice_pdf(new_inv, sup)
    new_inv.document_path_pdf = pdf_path
    db.commit()
    
    log_audit_event(db, current_user.id, current_user.role.value, "invoice_generated", "invoices", new_inv.id, None, {"total_amount": new_inv.total_amount, "quantity": total_workers, "rate": new_inv.rate_per_worker})
    
    db.refresh(new_inv)
    return {"invoice": new_inv, "supplier_name": sup.name}

@router.get("/invoices")
def list_invoices(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role not in [RoleEnum.SUPER_ADMIN, RoleEnum.ACCOUNTING, RoleEnum.GENERAL_MANAGER, RoleEnum.SUPPLIER_HEAD]:
        raise HTTPException(status_code=403, detail="Forbidden")
        
    query = db.query(Invoice, Supplier.name.label("supplier_name")).join(Supplier, Invoice.supplier_id == Supplier.id)
    if current_user.role == RoleEnum.SUPPLIER_HEAD:
        query = query.filter(Invoice.supplier_id == current_user.supplier_id)
        
    # Flat invoice fields for the list pages, plus the nested form the admin pages read
    return [
        {**{c.name: getattr(inv, c.name) for c in Invoice.__table__.columns}, "invoice": inv, "supplier_name": name}
        for inv, name in query.order_by(Invoice.generated_at.desc()).all()
    ]

@router.post("/invoices/{invoice_id}/void")
def void_invoice(
    invoice_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role([RoleEnum.SUPER_ADMIN, RoleEnum.ACCOUNTING]))
):
    inv = db.query(Invoice).filter(Invoice.id == invoice_id).first()
    if not inv: raise HTTPException(status_code=404, detail="Invoice not found")
    if inv.status == "VOIDED": raise HTTPException(status_code=400, detail="Already voided")
    
    old_state = {"status": inv.status}
    inv.status = "VOIDED"
    db.commit()
    
    log_audit_event(db, current_user.id, current_user.role.value, "invoice_voided", "invoices", inv.id, old_state, {"status": "VOIDED"})
    return {"message": "Voided successfully"}

@router.get("/invoices/{invoice_id}/download")
def download_invoice(
    invoice_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    inv = db.query(Invoice).filter(Invoice.id == invoice_id).first()
    if not inv: raise HTTPException(status_code=404, detail="Invoice not found")
    
    if current_user.role not in [RoleEnum.SUPER_ADMIN, RoleEnum.ACCOUNTING, RoleEnum.GENERAL_MANAGER, RoleEnum.SUPPLIER_HEAD]:
        raise HTTPException(status_code=403, detail="Forbidden")
    if current_user.role == RoleEnum.SUPPLIER_HEAD and inv.supplier_id != current_user.supplier_id:
        raise HTTPException(status_code=403, detail="Forbidden")
        
    if not inv.document_path_pdf or not os.path.exists(inv.document_path_pdf):
        # The server's disk is wiped on redeploy; rebuild the PDF from the stored invoice
        sup = db.query(Supplier).filter(Supplier.id == inv.supplier_id).first()
        inv.document_path_pdf = generate_invoice_pdf(inv, sup)
        db.commit()
        
    with open(inv.document_path_pdf, "rb") as f:
        pdf_bytes = f.read()
        
    return Response(content=pdf_bytes, media_type="application/pdf", headers={
        "Content-Disposition": f"attachment; filename={inv.invoice_number}.pdf"
    })

from fastapi import Response
from datetime import date

class CustomInvoiceRequest(BaseModel):
    supplier_id: int
    start_date: date
    end_date: date
    site_id: Optional[int] = None
    custom_rate: Optional[float] = None
    rate_unit: Optional[str] = "PER_HOUR"
    format: Literal["pdf", "excel"] = "pdf"

@router.post("/invoices/custom/download")
def download_custom_invoice(
    req: CustomInvoiceRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role([RoleEnum.SUPER_ADMIN, RoleEnum.ACCOUNTING]))
):
    from app.models.all_models import Site
    sup = db.query(Supplier).filter(Supplier.id == req.supplier_id).first()
    if not sup: raise HTTPException(status_code=404, detail="Supplier not found")
    
    site_name = "All Locations"
    filters = [
        func.date(ManpowerRequest.required_date) >= req.start_date.isoformat(),
        func.date(ManpowerRequest.required_date) <= req.end_date.isoformat()
    ]
    if req.site_id:
        filters.append(ManpowerRequest.site_id == req.site_id)
        site = db.query(Site).filter(Site.id == req.site_id).first()
        if site: site_name = site.name
        
    shifts = completed_shifts_query(db, sup.id, *filters).all()
    if not shifts: raise HTTPException(status_code=400, detail="No completed shifts found for this criteria.")
    total_workers = len(shifts)
    
    effective_rate = req.custom_rate if req.custom_rate is not None else sup.billing_rate
    
    unit_map = {
        "PER_HOUR": "Per Hour",
        "PER_DAY": "Per Shift",
        "PER_EMPLOYEE": "Per Employee"
    }
    unit_label = unit_map.get(req.rate_unit, "Per Shift")

    if req.rate_unit == "PER_HOUR":
        total_hours = round(sum((a.check_out_time - a.check_in_time).total_seconds() for a in shifts) / 3600.0, 2)
        total_amount = round(total_hours * effective_rate, 2)
        breakdown_text = f"Completed Shifts: {total_workers} | Verified Duty Hours: {total_hours} hrs"
    elif req.rate_unit == "PER_EMPLOYEE":
        employees = completed_shifts_query(db, sup.id, *filters).with_entities(WorkerAssignment.worker_id).distinct().count()
        total_amount = employees * effective_rate
        breakdown_text = f"Employees with completed shifts: {employees}"
    else:
        total_amount = total_workers * effective_rate
        breakdown_text = f"Completed Shifts (checked in and out): {total_workers}"

    invoice_num = f"CUST-INV-{req.supplier_id}-{int(datetime.utcnow().timestamp())}"

    if req.format == "excel":
        from app.models.all_models import Worker, Site as SiteModel
        headers = ["Date", "Driver", "Worker ID", "Venue", "Check-in (Qatar)", "Check-out (Qatar)", "Duty hours"]
        rows = []
        for a in sorted(shifts, key=lambda a: a.check_in_time):
            wa = db.query(WorkerAssignment).filter(WorkerAssignment.id == a.worker_assignment_id).first()
            wrk = db.query(Worker).filter(Worker.id == wa.worker_id).first() if wa else None
            sr = db.query(SupplierResponse).filter(SupplierResponse.id == wa.supplier_response_id).first() if wa else None
            mr = db.query(ManpowerRequest).filter(ManpowerRequest.id == sr.manpower_request_id).first() if sr else None
            st = db.query(SiteModel).filter(SiteModel.id == mr.site_id).first() if mr else None
            rows.append([
                mr.required_date.strftime("%Y-%m-%d") if mr and mr.required_date else "",
                f"{wrk.first_name} {wrk.last_name}" if wrk else "", wrk.internal_worker_id if wrk else "",
                st.name if st else "", qatar_time(a.check_in_time), qatar_time(a.check_out_time),
                round((a.check_out_time - a.check_in_time).total_seconds() / 3600.0, 2),
            ])
        summary = [("Invoice number", invoice_num), ("Supplier", sup.name), ("Location", site_name),
                   ("Basis", breakdown_text), ("Rate", f"QAR {effective_rate:,.2f} ({unit_label})"),
                   ("Total amount payable (QAR)", f"{total_amount:,.2f}")]
        return export_response("excel", invoice_num, "Custom Supplier Invoice", headers, rows,
                               subtitle=[f"Supplier: {sup.name}", f"Period: {req.start_date} to {req.end_date}", f"Location: {site_name}"],
                               summary=summary)
    
    pdf_dir = "invoices"
    os.makedirs(pdf_dir, exist_ok=True)
    file_path = os.path.join(pdf_dir, f"{invoice_num}.pdf")
    
    c = canvas.Canvas(file_path, pagesize=letter)
    c.setFont("Helvetica-Bold", 16)
    c.drawString(50, 750, f"CUSTOM INVOICE: {invoice_num}")
    c.setFont("Helvetica", 12)
    c.drawString(50, 710, f"Supplier: {sup.name}")
    c.drawString(50, 690, f"Period: {req.start_date} to {req.end_date}")
    c.drawString(50, 670, f"Location: {site_name}")
    c.drawString(50, 650, f"Generated On: {datetime.utcnow().strftime('%Y-%m-%d %H:%M')}")
    c.line(50, 630, 550, 630)
    c.drawString(50, 600, breakdown_text)
    c.drawString(50, 580, f"Agreed Billing Rate: QAR {effective_rate:,.2f} ({unit_label})")
    c.setFont("Helvetica-Bold", 14)
    c.drawString(50, 540, f"Total Amount Payable: QAR {total_amount:,.2f}")
    c.save()
    
    with open(file_path, "rb") as f: pdf_bytes = f.read()
    return Response(content=pdf_bytes, media_type="application/pdf", headers={
        "Content-Disposition": f"attachment; filename={invoice_num}.pdf"
    })

def parse_day(target_date: Optional[str]) -> date:
    """A YYYY-MM-DD date, defaulting to today in Qatar."""
    if target_date:
        try:
            return datetime.strptime(target_date, "%Y-%m-%d").date()
        except ValueError:
            raise HTTPException(status_code=400, detail="Date must be in YYYY-MM-DD format.")
    return qatar_today()


def ensure_accounting_viewer(current_user: User):
    if current_user.role not in [RoleEnum.SUPER_ADMIN, RoleEnum.ACCOUNTING, RoleEnum.GENERAL_MANAGER, RoleEnum.SUPPLIER_HEAD]:
        raise HTTPException(status_code=403, detail="Forbidden")


def compute_daily_breakdown(db: Session, current_user: User, filter_date: date, supplier_id: Optional[int] = None) -> dict:
    """Per agency for one day: shifts confirmed, drivers assigned, started, ended, hours and payable.
    Only agencies with a confirmed, non-cancelled shift that day are listed."""
    from app.models.all_models import Worker, Site
    from app.services.exports import qatar_time

    sup_query = db.query(Supplier)
    if current_user.role == RoleEnum.SUPPLIER_HEAD:
        sup_query = sup_query.filter(Supplier.id == current_user.supplier_id)
    elif supplier_id:
        sup_query = sup_query.filter(Supplier.id == supplier_id)

    results = []
    for sup in sup_query.order_by(Supplier.name.asc()).all():
        sr_list = db.query(SupplierResponse, ManpowerRequest, Site)\
            .join(ManpowerRequest, SupplierResponse.manpower_request_id == ManpowerRequest.id)\
            .join(Site, ManpowerRequest.site_id == Site.id)\
            .filter(
                SupplierResponse.supplier_id == sup.id,
                SupplierResponse.status.in_(BILLABLE_RESPONSE_STATUSES),
                ManpowerRequest.status != "CANCELLED",
                func.date(ManpowerRequest.required_date) == filter_date
            ).all()
        if not sr_list:
            continue

        sr_ids = [sr.id for sr, _, _ in sr_list]
        total_scheduled = sum(sr.confirmed_quantity or 0 for sr, _, _ in sr_list)

        assignments = db.query(WorkerAssignment, Attendance, Worker, Site)\
            .join(SupplierResponse, WorkerAssignment.supplier_response_id == SupplierResponse.id)\
            .join(ManpowerRequest, SupplierResponse.manpower_request_id == ManpowerRequest.id)\
            .join(Site, ManpowerRequest.site_id == Site.id)\
            .outerjoin(Attendance, Attendance.worker_assignment_id == WorkerAssignment.id)\
            .join(Worker, WorkerAssignment.worker_id == Worker.id)\
            .filter(SupplierResponse.id.in_(sr_ids), WorkerAssignment.status == "ASSIGNED").all()

        locations = {}
        for sr, req, site in sr_list:
            loc = locations.setdefault(site.name, {"site_name": site.name, "workers_allocated": 0, "assigned": 0, "started_shift": 0})
            loc["workers_allocated"] += sr.confirmed_quantity or 0
        for wa, att, wrk, site in assignments:
            if site.name in locations:
                locations[site.name]["assigned"] += 1
                if att and att.check_in_time:
                    locations[site.name]["started_shift"] += 1

        started_count = sum(1 for _, att, _, _ in assignments if att and att.check_in_time is not None)
        ended_count = sum(1 for _, att, _, _ in assignments if att and att.check_out_time is not None)

        total_duty_hours = 0.0
        worker_items = []
        for wa, att, wrk, site in assignments:
            duty_hours = 0.0
            if att and att.check_in_time and att.check_out_time:
                duty_hours = round((att.check_out_time - att.check_in_time).total_seconds() / 3600.0, 2)
                total_duty_hours += duty_hours
            if att and att.check_out_time:
                status = "SHIFT_ENDED"
            elif att and att.check_in_time:
                status = "ON_DUTY"
            else:
                status = "NOT_STARTED"
            worker_items.append({
                "worker_id": wrk.id,
                "worker_name": f"{wrk.first_name} {wrk.last_name}",
                "internal_worker_id": wrk.internal_worker_id,
                "qid": wrk.qid or "",
                "site_name": site.name,
                "check_in_time": utc_iso(att.check_in_time) if att and att.check_in_time else None,
                "check_out_time": utc_iso(att.check_out_time) if att and att.check_out_time else None,
                "check_in_qatar": qatar_time(att.check_in_time, "%H:%M") if att else "",
                "check_out_qatar": qatar_time(att.check_out_time, "%H:%M") if att else "",
                "duty_hours": duty_hours,
                "status": status
            })

        # Only completed shifts are payable
        estimated_cost = round(ended_count * (sup.billing_rate or 0.0), 2)

        sup_head = db.query(User).filter(User.supplier_id == sup.id, User.role == RoleEnum.SUPPLIER_HEAD).first()
        results.append({
            "supplier_id": sup.id,
            "supplier_name": sup.name,
            "contact_person": sup_head.name if sup_head else (sup.contact_person or "Agency Head"),
            "date": filter_date.strftime("%Y-%m-%d"),
            "billing_rate": sup.billing_rate or 0.0,
            "total_workers_allocated": total_scheduled,
            "assigned_workers_count": len(assignments),
            "started_shift_count": started_count,
            "ended_shift_count": ended_count,
            "on_duty_count": started_count - ended_count,
            "missing_count": max(0, total_scheduled - started_count),
            "locations": list(locations.values()),
            "total_duty_hours": round(total_duty_hours, 2),
            "daily_total_payable": estimated_cost,
            "workers": worker_items
        })

    return {
        "date": filter_date.strftime("%Y-%m-%d"),
        "generated_at": datetime.utcnow().isoformat() + "Z",
        "total_daily_workers": sum(r["started_shift_count"] for r in results),
        "total_scheduled": sum(r["total_workers_allocated"] for r in results),
        "total_assigned": sum(r["assigned_workers_count"] for r in results),
        "total_on_duty": sum(r["on_duty_count"] for r in results),
        "total_completed": sum(r["ended_shift_count"] for r in results),
        "total_missing": sum(r["missing_count"] for r in results),
        "total_duty_hours": round(sum(r["total_duty_hours"] for r in results), 2),
        "total_daily_payables": round(sum(r["daily_total_payable"] for r in results), 2),
        "suppliers": results
    }


@router.get("/daily-breakdown")
def get_daily_breakdown(
    target_date: Optional[str] = Query(None),
    supplier_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Daily tracking for accounting: how many employees from which supplier side, locations worked, and daily payables."""
    ensure_accounting_viewer(current_user)
    return compute_daily_breakdown(db, current_user, parse_day(target_date), supplier_id)


ExportFormat = Literal["excel", "pdf"]


@router.get("/daily-breakdown/export/{fmt}")
def export_daily_breakdown(
    fmt: ExportFormat,
    target_date: Optional[str] = Query(None),
    supplier_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    ensure_accounting_viewer(current_user)
    data = compute_daily_breakdown(db, current_user, parse_day(target_date), supplier_id)
    headers = ["Agency", "Driver", "Worker ID", "QID", "Venue", "Check-in (Qatar)", "Check-out (Qatar)", "Duty hours", "Status"]
    rows = [
        [sup["supplier_name"], w["worker_name"], w["internal_worker_id"], w["qid"], w["site_name"],
         w["check_in_qatar"], w["check_out_qatar"], w["duty_hours"], w["status"].replace("_", " ").title()]
        for sup in data["suppliers"] for w in sup["workers"]
    ]
    per_agency = [(f"{s['supplier_name']}", f"{s['ended_shift_count']} completed x QAR {s['billing_rate']:,.2f} = QAR {s['daily_total_payable']:,.2f}")
                  for s in data["suppliers"]]
    summary = [
        ("Drivers confirmed by agencies", data["total_scheduled"]),
        ("Checked in", data["total_daily_workers"]),
        ("Missing (confirmed but not checked in)", data["total_missing"]),
        ("Completed shift", data["total_completed"]),
        ("Verified duty hours", data["total_duty_hours"]),
        ("Daily payable (QAR)", f"{data['total_daily_payables']:,.2f}"),
    ] + per_agency
    return export_response(fmt, f"daily-supplier-tracking-{data['date']}", "Daily Supplier Tracking", headers, rows,
                           subtitle=[f"Date: {data['date']}"], summary=summary)


@router.get("/summary/export/{fmt}")
def export_accounting_summary(
    fmt: ExportFormat,
    month: int = Query(..., ge=1, le=12),
    year: int = Query(..., ge=2000, le=2100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    items = get_accounting_summary(day=None, month=month, year=year, supplier_id=None, db=db, current_user=current_user)
    headers = ["Agency", "Completed shifts", "Rate per shift (QAR)", "Total payable (QAR)"]
    rows = [[i.supplier_name, i.workers_supplied, f"{i.billing_rate:,.2f}", f"{i.total_amount:,.2f}"] for i in items]
    summary = [
        ("Total completed shifts", sum(i.workers_supplied for i in items)),
        ("Total payable (QAR)", f"{sum(i.total_amount for i in items):,.2f}"),
    ]
    return export_response(fmt, f"monthly-billing-{year}-{month:02d}", "Monthly Supplier Billing", headers, rows,
                           subtitle=[f"Period: {year}-{month:02d}"], summary=summary)


@router.get("/invoices/export/{fmt}")
def export_invoices(fmt: ExportFormat, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    rows_in = list_invoices(db=db, current_user=current_user)
    headers = ["Invoice number", "Agency", "Billing month", "Completed shifts", "Rate (QAR)", "Total (QAR)", "Status", "Generated"]
    rows = [[r["invoice_number"], r["supplier_name"], r["billing_month"].strftime("%Y-%m") if r["billing_month"] else "",
             r["workers_supplied_quantity"], f"{r['rate_per_worker']:,.2f}", f"{r['total_amount']:,.2f}", r["status"],
             qatar_time(r["generated_at"])] for r in rows_in]
    active = [r for r in rows_in if r["status"] == "GENERATED"]
    summary = [("Active invoices", len(active)), ("Active invoice total (QAR)", f"{sum(r['total_amount'] for r in active):,.2f}")]
    return export_response(fmt, "invoices", "Supplier Invoices", headers, rows, summary=summary)
