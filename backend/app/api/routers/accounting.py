
from fastapi import APIRouter, Depends, HTTPException, Query, Response
from sqlalchemy.orm import Session
from sqlalchemy import func, and_, extract
from app.db.session import get_db
from app.models.all_models import Supplier, User, RoleEnum, SupplierResponse, ManpowerRequest, Invoice
from app.api.deps import get_current_user, require_role
from app.services.audit import log_audit_event
from datetime import datetime, date
from typing import List, Optional
from pydantic import BaseModel

import os
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import letter

router = APIRouter()

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
    
    c.drawString(50, 620, f"Confirmed Workers Supplied: {invoice.workers_supplied_quantity}")
    c.drawString(50, 600, f"Agreed Rate Per Worker: QAR {invoice.rate_per_worker:,.2f}")
    
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
        # Sum confirmed quantity for responses in the target month/year
        req_filters = [
            SupplierResponse.supplier_id == sup.id,
            SupplierResponse.status.in_(['CONFIRMED', 'ACCEPTED_BY_OM', 'ACCEPTED'])
        ]
        if day:
            req_filters.append(extract('day', ManpowerRequest.required_date) == day)
        if month:
            req_filters.append(extract('month', ManpowerRequest.required_date) == month)
        if year:
            req_filters.append(extract('year', ManpowerRequest.required_date) == year)
            
        total_workers = db.query(func.sum(SupplierResponse.confirmed_quantity)).join(ManpowerRequest).filter(*req_filters).scalar() or 0
        
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
        
    total_workers = db.query(func.sum(SupplierResponse.confirmed_quantity)).join(ManpowerRequest).filter(
        SupplierResponse.supplier_id == sup.id,
        SupplierResponse.status.in_(['CONFIRMED', 'ACCEPTED_BY_OM', 'ACCEPTED']),
        extract('month', ManpowerRequest.required_date) == invoice_in.month,
        extract('year', ManpowerRequest.required_date) == invoice_in.year
    ).scalar() or 0
    
    if total_workers == 0:
        raise HTTPException(status_code=400, detail="Cannot generate invoice: 0 workers supplied.")
        
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
    
    return new_inv

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
        
    return [{"invoice": inv, "supplier_name": name} for inv, name in query.all()]

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
    
    if current_user.role == RoleEnum.SUPPLIER_HEAD and inv.supplier_id != current_user.supplier_id:
        raise HTTPException(status_code=403, detail="Forbidden")
        
    if not inv.document_path_pdf or not os.path.exists(inv.document_path_pdf):
        raise HTTPException(status_code=404, detail="PDF document not found")
        
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
        SupplierResponse.supplier_id == sup.id,
        SupplierResponse.status.in_(['CONFIRMED', 'ACCEPTED_BY_OM', 'ACCEPTED']),
        ManpowerRequest.required_date >= req.start_date,
        ManpowerRequest.required_date <= req.end_date
    ]
    if req.site_id:
        filters.append(ManpowerRequest.site_id == req.site_id)
        site = db.query(Site).filter(Site.id == req.site_id).first()
        if site: site_name = site.name
        
    total_workers = db.query(func.sum(SupplierResponse.confirmed_quantity)).join(ManpowerRequest).filter(*filters).scalar() or 0
    if total_workers == 0: raise HTTPException(status_code=400, detail="No workers found for this criteria.")
    
    effective_rate = req.custom_rate if req.custom_rate is not None else sup.billing_rate
    
    unit_map = {
        "PER_HOUR": "Per Hour",
        "PER_DAY": "Per Day",
        "PER_EMPLOYEE": "Per Employee"
    }
    unit_label = unit_map.get(req.rate_unit, "Per Hour")

    if req.rate_unit == "PER_HOUR":
        total_hours = total_workers * 8
        total_amount = total_hours * effective_rate
        breakdown_text = f"Confirmed Shifts: {total_workers} | Total Billable Hours (8h/shift): {total_hours} hrs"
    else:
        total_amount = total_workers * effective_rate
        breakdown_text = f"Confirmed Workers Supplied: {total_workers} ({unit_label})"

    invoice_num = f"CUST-INV-{req.supplier_id}-{int(datetime.utcnow().timestamp())}"
    
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

@router.get("/daily-breakdown")
def get_daily_breakdown(
    target_date: Optional[str] = Query(None),
    supplier_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Daily tracking for accounting: how many employees from which supplier side, locations worked, and daily payables."""
    if current_user.role not in [RoleEnum.SUPER_ADMIN, RoleEnum.ACCOUNTING, RoleEnum.GENERAL_MANAGER, RoleEnum.SUPPLIER_HEAD]:
        raise HTTPException(status_code=403, detail="Forbidden")

    if target_date:
        try:
            filter_date = datetime.strptime(target_date, "%Y-%m-%d").date()
        except Exception:
            filter_date = datetime.utcnow().date()
    else:
        filter_date = datetime.utcnow().date()

    # Supplier filter
    sup_query = db.query(Supplier)
    if current_user.role == RoleEnum.SUPPLIER_HEAD:
        sup_query = sup_query.filter(Supplier.id == current_user.supplier_id)
    elif supplier_id:
        sup_query = sup_query.filter(Supplier.id == supplier_id)

    suppliers = sup_query.all()
    from app.models.all_models import WorkerAssignment, Attendance, Worker, Site

    results = []
    for sup in suppliers:
        sr_list = db.query(SupplierResponse, ManpowerRequest, Site)\
            .join(ManpowerRequest, SupplierResponse.manpower_request_id == ManpowerRequest.id)\
            .join(Site, ManpowerRequest.site_id == Site.id)\
            .filter(
                SupplierResponse.supplier_id == sup.id,
                SupplierResponse.status.in_(['CONFIRMED', 'ACCEPTED_BY_OM', 'ACCEPTED']),
                func.date(ManpowerRequest.required_date) == filter_date
            ).all()

        sr_ids = [sr.id for sr, _, _ in sr_list]
        locations = list({site.name for _, _, site in sr_list})
        total_scheduled = sum(sr.confirmed_quantity for sr, _, _ in sr_list)

        assignments = db.query(WorkerAssignment, Attendance, Worker, Site)\
            .join(SupplierResponse, WorkerAssignment.supplier_response_id == SupplierResponse.id)\
            .join(ManpowerRequest, SupplierResponse.manpower_request_id == ManpowerRequest.id)\
            .join(Site, ManpowerRequest.site_id == Site.id)\
            .outerjoin(Attendance, Attendance.worker_assignment_id == WorkerAssignment.id)\
            .join(Worker, WorkerAssignment.worker_id == Worker.id)\
            .filter(SupplierResponse.id.in_(sr_ids)).all() if sr_ids else []

        started_count = sum(1 for _, att, _, _ in assignments if att and att.check_in_time is not None)
        ended_count = sum(1 for _, att, _, _ in assignments if att and att.check_out_time is not None)

        total_duty_hours = 0.0
        worker_items = []
        for wa, att, wrk, site in assignments:
            duty_hours = 0.0
            if att and att.check_in_time and att.check_out_time:
                delta = att.check_out_time - att.check_in_time
                duty_hours = round(delta.total_seconds() / 3600.0, 2)
                total_duty_hours += duty_hours

            worker_items.append({
                "worker_id": wrk.id,
                "worker_name": f"{wrk.first_name} {wrk.last_name}",
                "internal_worker_id": wrk.internal_worker_id,
                "qid": wrk.qid or "",
                "site_name": site.name,
                "check_in_time": att.check_in_time.isoformat() if att and att.check_in_time else None,
                "check_out_time": att.check_out_time.isoformat() if att and att.check_out_time else None,
                "duty_hours": duty_hours,
                "status": att.status if att else "SCHEDULED"
            })

        effective_hours = total_duty_hours if total_duty_hours > 0 else (total_scheduled * 8.0)
        estimated_cost = round(effective_hours * (sup.billing_rate or 0.0), 2)

        sup_head = db.query(User).filter(User.supplier_id == sup.id, User.role == RoleEnum.SUPPLIER_HEAD).first()
        head_name = sup_head.name if sup_head else (sup.contact_person or "Agency Head")

        results.append({
            "supplier_id": sup.id,
            "supplier_name": sup.name,
            "supplier_head_name": head_name,
            "date": filter_date.strftime("%Y-%m-%d"),
            "billing_rate": sup.billing_rate or 0.0,
            "scheduled_workers": total_scheduled,
            "assigned_workers_count": len(assignments),
            "started_shift_count": started_count,
            "ended_shift_count": ended_count,
            "locations": locations,
            "total_duty_hours": round(total_duty_hours, 2),
            "estimated_daily_cost": estimated_cost,
            "workers": worker_items
        })

    return {
        "date": filter_date.strftime("%Y-%m-%d"),
        "total_suppliers": len(results),
        "total_workers_attended": sum(r["started_shift_count"] for r in results),
        "total_daily_cost": sum(r["estimated_daily_cost"] for r in results),
        "records": results
    }
