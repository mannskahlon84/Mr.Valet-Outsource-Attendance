from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models.all_models import ManpowerRequest, SupplierResponse, WorkerAssignment, Worker, Site, User, RoleEnum, Notification
from app.schemas.request import ManpowerRequestCreate, SupplierResponseUpdate, WorkerAllocation
from app.api.deps import get_current_user, require_role
from app.services.audit import log_audit_event
from datetime import datetime

router = APIRouter()

@router.post("/")
def create_request(req: ManpowerRequestCreate, db: Session = Depends(get_db), current_user: User = Depends(require_role([RoleEnum.OPS_MANAGER, RoleEnum.SUPER_ADMIN]))):

    site = db.query(Site).filter(Site.id == req.site_id).first()
    if not site: raise HTTPException(404, "Site not found")
    if current_user.role == RoleEnum.OPS_MANAGER and site.manager_id != current_user.id:
        raise HTTPException(403, "Not authorized to request manpower for this site")

    # Validate quantities
    total_routed = sum(r.requested_quantity for r in req.routes)
    if total_routed > req.total_required_workers:
        raise HTTPException(400, "Routed quantity exceeds total required")
        
    mr = ManpowerRequest(
        ops_manager_id=current_user.id,
        site_id=req.site_id,
        required_date=datetime.combine(req.required_date, datetime.min.time()),
        start_time=req.start_time,
        end_time=req.end_time,
        total_required_workers=req.total_required_workers,
        skill_category=req.skill_category,
        notes=req.notes,
        status="SUBMITTED"
    )
    db.add(mr)
    db.flush()
    
    for route in req.routes:
        sr = SupplierResponse(
            manpower_request_id=mr.id,
            supplier_id=route.supplier_id,
            requested_quantity=route.requested_quantity,
            status="PENDING"
        )
        db.add(sr)
        
        db.flush()
        
        # Requirement 1 & 3: Supplier Notification
        manager_display = current_user.name or "Operations Manager"
        site_display = site.name if site else f"Location #{req.site_id}"
        req_date_str = req.required_date.strftime('%d %b %Y') if hasattr(req.required_date, 'strftime') else str(req.required_date)
        notif = Notification(
            supplier_id=route.supplier_id,
            title=f"📋 New Shift Request #{mr.id} - {site_display}",
            message=f"Ops Manager {manager_display} requested {route.requested_quantity} drivers for {site_display} on {req_date_str} ({req.start_time} - {req.end_time}).",
            entity_type="MANPOWER_REQUEST",
            entity_id=mr.id
        )
        db.add(notif)
        
    db.commit()
    db.refresh(mr)
    log_audit_event(db, current_user.id, current_user.role.value, "request_created", "manpower_requests", mr.id, None, {"status": "SUBMITTED"})
    return {"id": mr.id, "status": mr.status}

@router.patch("/{request_id}/status")
def update_request_status(request_id: int, status: str, db: Session = Depends(get_db), current_user: User = Depends(require_role([RoleEnum.OPS_MANAGER, RoleEnum.SUPER_ADMIN]))):
    mr = db.query(ManpowerRequest).filter(ManpowerRequest.id == request_id).first()
    if not mr: raise HTTPException(404, "Request not found")
    
    valid_transitions = {
        "SUBMITTED": ["CANCELLED", "RESPONSES_PENDING"],
        "RESPONSES_PENDING": ["PARTIALLY_FULFILLED", "FULFILLED", "CANCELLED"],
        "PARTIALLY_FULFILLED": ["FULFILLED", "CANCELLED"]
    }
    
    if status not in valid_transitions.get(mr.status, []):
        raise HTTPException(400, f"Invalid transition from {mr.status} to {status}")
        
    old_status = mr.status
    mr.status = status
    db.commit()
    log_audit_event(db, current_user.id, current_user.role.value, "request_updated", "manpower_requests", mr.id, {"status": old_status}, {"status": status})
    return {"id": mr.id, "status": mr.status}

@router.get("/supplier-responses")
def get_supplier_responses(db: Session = Depends(get_db), current_user: User = Depends(require_role([RoleEnum.SUPPLIER_HEAD]))):
    responses = db.query(SupplierResponse).filter(SupplierResponse.supplier_id == current_user.supplier_id).all()
    return responses

@router.patch("/responses/{response_id}")
def update_supplier_response(response_id: int, update: SupplierResponseUpdate, db: Session = Depends(get_db), current_user: User = Depends(require_role([RoleEnum.SUPPLIER_HEAD]))):
    sr = db.query(SupplierResponse).filter(SupplierResponse.id == response_id).first()
    if not sr: raise HTTPException(404, "Response not found")
    if sr.supplier_id != current_user.supplier_id:
        raise HTTPException(403, "Not your response")
        
    mr = db.query(ManpowerRequest).filter(ManpowerRequest.id == sr.manpower_request_id).first()
    if mr.status == "CANCELLED":
        raise HTTPException(400, "Request is cancelled")
        
    if update.confirmed_quantity < 0:
        raise HTTPException(400, "Invalid quantity")
        
    # Calculate remaining required
    other_responses = db.query(SupplierResponse).filter(
        SupplierResponse.manpower_request_id == sr.manpower_request_id,
        SupplierResponse.id != sr.id
    ).all()
    other_confirmed = sum(r.confirmed_quantity for r in other_responses)
    
    if other_confirmed + update.confirmed_quantity > mr.total_required_workers:
        raise HTTPException(400, "Confirmed quantity exceeds remaining requirement")
        
    old_state = {"status": sr.status, "confirmed": sr.confirmed_quantity}
    sr.status = update.status
    sr.confirmed_quantity = update.confirmed_quantity
    if hasattr(update, 'proposed_start_time'): sr.proposed_start_time = update.proposed_start_time
    if hasattr(update, 'proposed_end_time'): sr.proposed_end_time = update.proposed_end_time
    if hasattr(update, 'supplier_message'): sr.supplier_message = update.supplier_message
    if hasattr(update, 'response_type'): sr.response_type = update.response_type
    sr.responded_at = datetime.utcnow()
    
    db.commit()
    log_audit_event(db, current_user.id, current_user.role.value, "supplier_response_updated", "supplier_responses", sr.id, old_state, {"status": sr.status, "confirmed": sr.confirmed_quantity})
    return sr

@router.get("/")
def get_requests(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    q = db.query(ManpowerRequest)
    if current_user.role == RoleEnum.OPS_MANAGER:
        q = q.join(Site).filter(Site.manager_id == current_user.id)
    elif current_user.role == RoleEnum.SUPPLIER_HEAD:
        q = q.join(SupplierResponse).filter(SupplierResponse.supplier_id == current_user.supplier_id)
    items = q.order_by(ManpowerRequest.id.desc()).all()

    site_ids = {r.site_id for r in items if r.site_id}
    sites_map = {}
    if site_ids:
        sites_list = db.query(Site).filter(Site.id.in_(site_ids)).all()
        sites_map = {s.id: s for s in sites_list}

    result = []
    for r in items:
        s = sites_map.get(r.site_id)
        result.append({
            "id": r.id,
            "ops_manager_id": r.ops_manager_id,
            "site_id": r.site_id,
            "site_name": s.name if s else f"Location #{r.site_id}",
            "site_address": s.address if s and s.address else "",
            "required_date": r.required_date.isoformat() if r.required_date else None,
            "start_time": r.start_time,
            "end_time": r.end_time,
            "total_required_workers": r.total_required_workers,
            "skill_category": r.skill_category,
            "notes": r.notes,
            "status": r.status,
            "created_at": r.created_at.isoformat() if hasattr(r, "created_at") and r.created_at else None
        })
    return result


from pydantic import BaseModel
class ChatMessageCreate(BaseModel):
    message: str

from app.models.all_models import RequestMessage, Supplier

@router.get("/supplier")
def get_supplier_requests(db: Session = Depends(get_db), current_user: User = Depends(require_role([RoleEnum.SUPPLIER_HEAD]))):
    items = db.query(ManpowerRequest, SupplierResponse)\
        .join(SupplierResponse, ManpowerRequest.id == SupplierResponse.manpower_request_id)\
        .filter(SupplierResponse.supplier_id == current_user.supplier_id)\
        .order_by(ManpowerRequest.id.desc()).all()

    site_ids = {r.site_id for r, _ in items if r.site_id}
    sites_map = {}
    if site_ids:
        sites_list = db.query(Site).filter(Site.id.in_(site_ids)).all()
        sites_map = {s.id: s for s in sites_list}

    manager_ids = {r.ops_manager_id for r, _ in items if r.ops_manager_id}
    managers_map = {}
    if manager_ids:
        managers_list = db.query(User).filter(User.id.in_(manager_ids)).all()
        managers_map = {m.id: m.name for m in managers_list}

    result = []
    for r, sr in items:
        s = sites_map.get(r.site_id)
        result.append({
            "id": r.id,
            "response_id": sr.id,
            "ops_manager_id": r.ops_manager_id,
            "ops_manager_name": managers_map.get(r.ops_manager_id) or "Operations Manager",
            "site_id": r.site_id,
            "site_name": s.name if s else f"Location #{r.site_id}",
            "site_address": s.address if s and s.address else "",
            "required_date": r.required_date.isoformat() if r.required_date else None,
            "start_time": r.start_time,
            "end_time": r.end_time,
            "total_required_workers": r.total_required_workers,
            "requested_quantity": sr.requested_quantity,
            "confirmed_quantity": sr.confirmed_quantity,
            "supplier_response_status": sr.status,
            "proposed_start_time": sr.proposed_start_time,
            "proposed_end_time": sr.proposed_end_time,
            "supplier_message": sr.supplier_message,
            "skill_category": r.skill_category,
            "notes": r.notes,
            "status": r.status,
            "created_at": r.created_at.isoformat() if hasattr(r, "created_at") and r.created_at else None
        })
    return result

@router.get("/{request_id}")
def get_request_by_id(request_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    mr = db.query(ManpowerRequest).filter(ManpowerRequest.id == request_id).first()
    if not mr:
        raise HTTPException(404, "Request not found")

    if current_user.role == RoleEnum.OPS_MANAGER:
        site = db.query(Site).filter(Site.id == mr.site_id).first()
        if site and site.manager_id != current_user.id:
            raise HTTPException(403, "Not authorized to view this request")
    elif current_user.role == RoleEnum.SUPPLIER_HEAD:
        valid = db.query(SupplierResponse).filter(
            SupplierResponse.manpower_request_id == request_id,
            SupplierResponse.supplier_id == current_user.supplier_id
        ).first()
        if not valid:
            raise HTTPException(403, "Not authorized to view this request")

    site = db.query(Site).filter(Site.id == mr.site_id).first()
    manager = db.query(User).filter(User.id == mr.ops_manager_id).first()
    return {
        "id": mr.id,
        "ops_manager_id": mr.ops_manager_id,
        "ops_manager_name": manager.name if manager else "Operations Manager",
        "site_id": mr.site_id,
        "site_name": site.name if site else f"Location #{mr.site_id}",
        "site_address": site.address if site and site.address else "",
        "required_date": mr.required_date.isoformat() if mr.required_date else None,
        "start_time": mr.start_time,
        "end_time": mr.end_time,
        "total_required_workers": mr.total_required_workers,
        "skill_category": mr.skill_category,
        "notes": mr.notes,
        "status": mr.status,
        "created_at": mr.created_at.isoformat() if hasattr(mr, "created_at") and mr.created_at else None
    }

@router.get("/{request_id}/responses")
def get_request_responses(request_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    responses = db.query(SupplierResponse).filter(SupplierResponse.manpower_request_id == request_id).all()
    res = []
    for r in responses:
        sup = db.query(Supplier).filter(Supplier.id == r.supplier_id).first()
        res.append({
            "id": r.id,
            "manpower_request_id": r.manpower_request_id,
            "supplier_id": r.supplier_id,
            "supplier_name": sup.name if sup else f"Supplier #{r.supplier_id}",
            "supplier_rate": sup.billing_rate if sup else 0.0,
            "requested_quantity": r.requested_quantity,
            "confirmed_quantity": r.confirmed_quantity,
            "status": r.status,
            "proposed_start_time": r.proposed_start_time,
            "proposed_end_time": r.proposed_end_time,
            "supplier_message": r.supplier_message,
            "responded_at": r.responded_at.isoformat() if r.responded_at else None
        })
    return res

@router.get("/{request_id}/messages")
def get_request_messages(request_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    mr = db.query(ManpowerRequest).filter(ManpowerRequest.id == request_id).first()
    if not mr: raise HTTPException(404, "Request not found")
    
    # Enforce supplier auth
    if current_user.role == RoleEnum.SUPPLIER_HEAD:
        valid = db.query(SupplierResponse).filter(
            SupplierResponse.manpower_request_id == request_id, 
            SupplierResponse.supplier_id == current_user.supplier_id
        ).first()
        if not valid: raise HTTPException(403, "Not authorized to view messages for this request")
        
    messages = db.query(RequestMessage).filter(RequestMessage.manpower_request_id == request_id).order_by(RequestMessage.timestamp.asc()).all()
    # Map sender names
    results = []
    for msg in messages:
        sender = db.query(User).filter(User.id == msg.sender_id).first()
        results.append({
            "id": msg.id,
            "message": msg.message,
            "timestamp": msg.timestamp,
            "sender_id": msg.sender_id,
            "sender_name": sender.name if sender else "Unknown",
            "is_mine": msg.sender_id == current_user.id
        })
    return results

@router.post("/{request_id}/messages")
def send_request_message(request_id: int, req: ChatMessageCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    mr = db.query(ManpowerRequest).filter(ManpowerRequest.id == request_id).first()
    if not mr: raise HTTPException(404, "Request not found")
    
    # Enforce supplier auth
    if current_user.role == RoleEnum.SUPPLIER_HEAD:
        valid = db.query(SupplierResponse).filter(
            SupplierResponse.manpower_request_id == request_id, 
            SupplierResponse.supplier_id == current_user.supplier_id
        ).first()
        if not valid: raise HTTPException(403, "Not authorized to send messages for this request")
        
    new_msg = RequestMessage(
        manpower_request_id=request_id,
        sender_id=current_user.id,
        message=req.message
    )
    db.add(new_msg)
    db.commit()
    
    # Trigger push notification logic here if needed (Optional: simple background task to exponent_server_sdk)
    
    return {"message": "Sent", "id": new_msg.id}


@router.patch("/{request_id}/respond")
def respond_to_request(request_id: int, update: SupplierResponseUpdate, db: Session = Depends(get_db), current_user: User = Depends(require_role([RoleEnum.SUPPLIER_HEAD]))):
    sr = db.query(SupplierResponse).filter(SupplierResponse.manpower_request_id == request_id, SupplierResponse.supplier_id == current_user.supplier_id).first()
    if not sr: raise HTTPException(404, "Response not found")
    
    mr = db.query(ManpowerRequest).filter(ManpowerRequest.id == sr.manpower_request_id).first()
    if mr.status == "CANCELLED": raise HTTPException(400, "Request is cancelled")
    
    if update.confirmed_quantity < 0: raise HTTPException(400, "Invalid quantity")
    
    old_state = {"status": sr.status, "confirmed": sr.confirmed_quantity}
    sr.status = update.status
    sr.confirmed_quantity = update.confirmed_quantity
    if hasattr(update, 'proposed_start_time'): sr.proposed_start_time = update.proposed_start_time
    if hasattr(update, 'proposed_end_time'): sr.proposed_end_time = update.proposed_end_time
    if hasattr(update, 'supplier_message'): sr.supplier_message = update.supplier_message
    if hasattr(update, 'response_type'): sr.response_type = update.response_type
    sr.responded_at = datetime.utcnow()
    
    # In-App Push Notification to Operations Manager
    sup = db.query(Supplier).filter(Supplier.id == current_user.supplier_id).first()
    sup_name = sup.name if sup else (current_user.name or "Agency")
    site = db.query(Site).filter(Site.id == mr.site_id).first()
    site_name = site.name if site else f"Location #{mr.site_id}"

    if update.status == "ACCEPTED":
        notif_title = f"✅ Request #{mr.id} APPROVED by {sup_name}"
        notif_msg = f"{sup_name} APPROVED request for {site_name} ({update.confirmed_quantity} drivers confirmed)."
    elif update.status == "REJECTED":
        notif_title = f"❌ Request #{mr.id} REJECTED by {sup_name}"
        reason = update.supplier_message or "Unable to fulfill shift quota"
        notif_msg = f"{sup_name} REJECTED request for {site_name}. Reason: {reason}."
    else:
        notif_title = f"📝 Request #{mr.id} Proposal from {sup_name}"
        notif_msg = f"{sup_name} responded with status '{update.status}' ({update.confirmed_quantity} drivers for {site_name}). Note: {update.supplier_message or 'None'}."

    if mr.ops_manager_id:
        om_notif = Notification(
            user_id=mr.ops_manager_id,
            title=notif_title,
            message=notif_msg,
            entity_type="SUPPLIER_RESPONSE",
            entity_id=mr.id
        )
        db.add(om_notif)

    db.commit()
    log_audit_event(db, current_user.id, current_user.role.value, "supplier_response_updated", "supplier_responses", sr.id, old_state, {"status": sr.status, "confirmed": sr.confirmed_quantity})
    return sr


from app.schemas.request import FinalizeResponseRequest
from app.models.all_models import UserDevice

@router.patch("/{request_id}/responses/{response_id}/finalize")
def finalize_supplier_response(
    request_id: int, 
    response_id: int, 
    payload: FinalizeResponseRequest, 
    db: Session = Depends(get_db), 
    current_user: User = Depends(require_role([RoleEnum.OPS_MANAGER, RoleEnum.SUPER_ADMIN]))
):
    # Lock ManpowerRequest first
    mr = db.query(ManpowerRequest).with_for_update().filter(ManpowerRequest.id == request_id).first()
    if not mr: raise HTTPException(404, "Request not found")
    
    if current_user.role == RoleEnum.OPS_MANAGER and mr.ops_manager_id != current_user.id:
        raise HTTPException(403, "Not authorized to finalize this request")

    # Lock SupplierResponse
    sr = db.query(SupplierResponse).with_for_update().filter(SupplierResponse.id == response_id).first()
    if not sr or sr.manpower_request_id != mr.id:
        raise HTTPException(404, "Supplier response not found for this request")

    if sr.status in ["REJECTED", "ACCEPTED_BY_OM"]:
        raise HTTPException(400, f"Cannot finalize a response that is currently {sr.status}")
        
    if mr.status in ["CONFIRMED", "CANCELLED"]:
        raise HTTPException(400, f"Cannot finalize because request is already {mr.status}")

    # Stale Proposal Check
    if payload.last_seen_responded_at and sr.responded_at and sr.responded_at > payload.last_seen_responded_at:
        raise HTTPException(409, "The supplier has updated their proposal since you last viewed it. Please refresh.")

    if payload.accepted_quantity <= 0:
        raise HTTPException(400, "Accepted quantity must be greater than 0")

    # Quantity validation across all confirmed responses
    other_responses = db.query(SupplierResponse).filter(
        SupplierResponse.manpower_request_id == mr.id,
        SupplierResponse.status == "ACCEPTED_BY_OM",
        SupplierResponse.id != sr.id
    ).all()
    currently_confirmed = sum(r.confirmed_quantity for r in other_responses)
    
    if currently_confirmed + payload.accepted_quantity > mr.total_required_workers:
        raise HTTPException(400, "Final quantity exceeds the total required workers for this request")

    old_state = {"status": sr.status, "confirmed": sr.confirmed_quantity}
    
    sr.status = "ACCEPTED_BY_OM"
    sr.confirmed_quantity = payload.accepted_quantity
    sr.confirmed_start_time = payload.accepted_start_time
    sr.confirmed_end_time = payload.accepted_end_time
    sr.confirmed_at = datetime.utcnow()
    sr.confirmed_by_id = current_user.id
    
    if currently_confirmed + payload.accepted_quantity >= mr.total_required_workers:
        mr.status = "CONFIRMED"
    else:
        mr.status = "PARTIALLY_CONFIRMED"

    db.commit()
    
    log_audit_event(
        db, current_user.id, current_user.role.value, 
        "response_finalized_by_om", "supplier_responses", sr.id, 
        old_state, {"status": sr.status, "confirmed": sr.confirmed_quantity}
    )
    
    # Notify Supplier Head (Database In-App Notification)
    site = db.query(Site).filter(Site.id == mr.site_id).first()
    site_name = site.name if site else f"Location #{mr.site_id}"
    sup_notif = Notification(
        supplier_id=sr.supplier_id,
        title=f"✅ Shift Allocation Finalized: {site_name}",
        message=f"Operations Manager accepted your proposal for {payload.accepted_quantity} drivers at {site_name} on Request #{mr.id}.",
        entity_type="MANPOWER_REQUEST",
        entity_id=mr.id
    )
    db.add(sup_notif)
    db.commit()

    return {"message": "Response finalized", "request_status": mr.status}
