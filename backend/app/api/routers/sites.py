from pydantic import BaseModel
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models.all_models import Site, User, RoleEnum
from app.schemas.site import SiteCreate, SiteUpdate, SiteResponse
from app.api.deps import get_current_user, require_role
from app.services.audit import log_audit_event
from typing import List

router = APIRouter()

import uuid

@router.post("/{site_id}/qr", response_model=SiteResponse)
def generate_qr(site_id: int, db: Session = Depends(get_db), current_user: User = Depends(require_role([RoleEnum.SUPER_ADMIN]))):
    site = db.query(Site).filter(Site.id == site_id).first()
    if not site:
        raise HTTPException(status_code=404, detail="Site not found")
    new_token = f"MC:LOC:{site.id}:{uuid.uuid4().hex}"
    site.qr_token = new_token
    site.qr_status = "ACTIVE"
    db.commit()
    db.refresh(site)
    log_audit_event(db, current_user.id, current_user.role.value, "site_qr_generated", "sites", site.id, None, {"qr_token": new_token})
    return site

@router.patch("/{site_id}/qr/revoke", response_model=SiteResponse)
def revoke_qr(site_id: int, db: Session = Depends(get_db), current_user: User = Depends(require_role([RoleEnum.SUPER_ADMIN]))):
    site = db.query(Site).filter(Site.id == site_id).first()
    if not site:
        raise HTTPException(status_code=404, detail="Site not found")
    site.qr_status = "REVOKED"
    db.commit()
    db.refresh(site)
    log_audit_event(db, current_user.id, current_user.role.value, "site_qr_revoked", "sites", site.id, None, {"qr_status": "REVOKED"})
    return site


@router.post("/", response_model=SiteResponse)
def create_site(site_in: SiteCreate, db: Session = Depends(get_db), current_user: User = Depends(require_role([RoleEnum.SUPER_ADMIN, RoleEnum.OPS_MANAGER]))):
    if current_user.role == RoleEnum.OPS_MANAGER:
        site_in.manager_id = current_user.id
    site = Site(**site_in.model_dump())
    db.add(site)
    db.commit()
    db.refresh(site)
    log_audit_event(db, current_user.id, current_user.role.value, "site_created", "sites", site.id, None, site_in.model_dump())
    return site

@router.get("/", response_model=List[SiteResponse])
def get_sites(
    skip: int = Query(0, ge=0), 
    limit: int = Query(250, le=500),
    db: Session = Depends(get_db), 
    current_user: User = Depends(get_current_user)
):
    if current_user.role in [RoleEnum.OUTSOURCE_WORKER, RoleEnum.SUPPLIER_HEAD]:
        raise HTTPException(status_code=403, detail="Forbidden")
    query = db.query(Site)
    if current_user.role == RoleEnum.OPS_MANAGER:
        query = query.filter(Site.manager_id == current_user.id)
    return query.order_by(Site.name.asc()).offset(skip).limit(limit).all()

@router.patch("/{site_id}/status", response_model=SiteResponse)
def change_site_status(site_id: int, status: str = Query(...), db: Session = Depends(get_db), current_user: User = Depends(require_role([RoleEnum.SUPER_ADMIN, RoleEnum.OPS_MANAGER]))):
    site = db.query(Site).filter(Site.id == site_id).first()
    if not site: raise HTTPException(status_code=404, detail="Site not found")
    if current_user.role == RoleEnum.OPS_MANAGER and site.manager_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to modify this site")
    if status not in ["active", "inactive"]:
        raise HTTPException(status_code=400, detail="Invalid status")

    prev_state = {"status": site.status}
    site.status = status
    db.commit()
    db.refresh(site)
    action = "site_activated" if status == "active" else "site_deactivated"
    log_audit_event(db, current_user.id, current_user.role.value, action, "sites", site.id, prev_state, {"status": status})
    return site

class SiteUpdate(BaseModel):
    name: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    geofence_radius_meters: Optional[float] = None
    manager_id: Optional[int] = None
    status: Optional[str] = None

@router.put("/{site_id}")
def update_site(site_id: int, site_in: SiteUpdate, db: Session = Depends(get_db), current_user: User = Depends(require_role([RoleEnum.SUPER_ADMIN]))):
    site = db.query(Site).filter(Site.id == site_id).first()
    if not site: raise HTTPException(status_code=404, detail="Site not found")
    
    old_state = { "name": site.name, "latitude": site.latitude, "longitude": site.longitude, "radius": site.geofence_radius_meters, "manager_id": site.manager_id, "status": site.status }
    
    if site_in.name is not None: site.name = site_in.name
    if site_in.latitude is not None: site.latitude = site_in.latitude
    if site_in.longitude is not None: site.longitude = site_in.longitude
    if site_in.geofence_radius_meters is not None: site.geofence_radius_meters = site_in.geofence_radius_meters
    if site_in.manager_id is not None: site.manager_id = site_in.manager_id
    if site_in.status is not None: site.status = site_in.status
    
    db.commit()
    db.refresh(site)
    
    new_state = { "name": site.name, "latitude": site.latitude, "longitude": site.longitude, "radius": site.geofence_radius_meters, "manager_id": site.manager_id, "status": site.status }
    log_audit_event(db, current_user.id, current_user.role.value, "site_updated", "sites", site.id, old_state, new_state)
    return site
