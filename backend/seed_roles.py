from app.db.session import engine
from sqlalchemy.orm import sessionmaker
from app.models.all_models import User, RoleEnum, Supplier, Worker, Site, ManpowerRequest, SupplierResponse, WorkerAssignment, Attendance
from app.core.security import get_password_hash
from datetime import datetime, timezone
import uuid

def seed_roles():
    Session = sessionmaker(bind=engine)
    session = Session()
    
    # 1. Super Admin
    admin_emails = ["admin@example.com", "manpreet@alsharqiholding.com"]
    for email in admin_emails:
        admin = session.query(User).filter(User.email == email).first()
        if not admin:
            session.add(User(email=email, password_hash=get_password_hash("devpass123"), role=RoleEnum.SUPER_ADMIN, name="Super Admin"))
        else:
            admin.password_hash = get_password_hash("devpass123")
            admin.role = RoleEnum.SUPER_ADMIN
            admin.status = "active"
            
    # 2. General Manager
    gm = session.query(User).filter(User.email == "gm@example.com").first()
    if not gm:
        session.add(User(email="gm@example.com", password_hash=get_password_hash("devpass123"), role=RoleEnum.GENERAL_MANAGER, name="General Manager"))
    else:
        gm.password_hash = get_password_hash("devpass123")
        gm.role = RoleEnum.GENERAL_MANAGER
        gm.status = "active"
        
    # 3. Ops Manager
    ops = session.query(User).filter(User.email == "ops@example.com").first()
    if not ops:
        ops = User(email="ops@example.com", password_hash=get_password_hash("devpass123"), role=RoleEnum.OPS_MANAGER, name="Operations Manager")
        session.add(ops)
        session.commit()
        session.refresh(ops)
    else:
        ops.password_hash = get_password_hash("devpass123")
        ops.role = RoleEnum.OPS_MANAGER
        ops.status = "active"
        session.commit()
        
    # Ensure at least one site is assigned to this ops manager
    site = session.query(Site).first()
    if site:
        site.manager_id = ops.id
        if not site.qr_token:
            site.qr_token = f"MC:LOC:{site.id}:{uuid.uuid4().hex}"
            site.qr_status = "ACTIVE"
        session.commit()
        
    # 4. Supplier Agency & Supplier Head
    supplier = session.query(Supplier).filter(Supplier.name == "Demo Agency").first()
    if not supplier:
        supplier = Supplier(
            name="Demo Agency",
            contact_person="John Doe",
            contact_email="agency@example.com",
            contact_phone="+97455123456",
            billing_rate=45.0,
            status="active"
        )
        session.add(supplier)
        session.commit()
        session.refresh(supplier)
    else:
        supplier.billing_rate = 45.0
        supplier.status = "active"
        session.commit()
        
    sup_head = session.query(User).filter(User.email == "supplier@example.com").first()
    if not sup_head:
        session.add(User(
            email="supplier@example.com",
            password_hash=get_password_hash("devpass123"),
            role=RoleEnum.SUPPLIER_HEAD,
            name="Supplier Head",
            supplier_id=supplier.id,
            status="active"
        ))
    else:
        sup_head.password_hash = get_password_hash("devpass123")
        sup_head.role = RoleEnum.SUPPLIER_HEAD
        sup_head.supplier_id = supplier.id
        sup_head.status = "active"
        
    # 5. Accounting Team User
    acct = session.query(User).filter(User.email == "accounting@example.com").first()
    if not acct:
        session.add(User(
            email="accounting@example.com",
            password_hash=get_password_hash("devpass123"),
            role=RoleEnum.ACCOUNTING,
            name="Accounting Officer",
            status="active"
        ))
    else:
        acct.password_hash = get_password_hash("devpass123")
        acct.role = RoleEnum.ACCOUNTING
        acct.status = "active"

    # 6. Seed Sample Workers for Demo Agency
    worker_specs = [
        {"internal": "WRK-001", "first": "Ali", "last": "Hassan", "qid": "29501234567", "phone": "+97466001122"},
        {"internal": "WRK-002", "first": "Tariq", "last": "Mahmood", "qid": "29309876543", "phone": "+97466003344"},
        {"internal": "WRK-003", "first": "Bilal", "last": "Ahmed", "qid": "29105432198", "phone": "+97466005566"},
    ]
    created_workers = []
    for spec in worker_specs:
        w = session.query(Worker).filter(Worker.internal_worker_id == spec["internal"]).first()
        if not w:
            w = Worker(
                internal_worker_id=spec["internal"],
                supplier_id=supplier.id,
                first_name=spec["first"],
                last_name=spec["last"],
                qid=spec["qid"],
                whatsapp_number=spec["phone"],
                status="active"
            )
            session.add(w)
            session.commit()
            session.refresh(w)
        created_workers.append(w)
        
    # 7. Outsource Worker User Account
    first_worker = created_workers[0]
    worker_user = session.query(User).filter(User.email == "worker@example.com").first()
    if not worker_user:
        session.add(User(
            email="worker@example.com",
            password_hash=get_password_hash("devpass123"),
            role=RoleEnum.OUTSOURCE_WORKER,
            name=f"{first_worker.first_name} {first_worker.last_name}",
            worker_id=first_worker.id,
            status="active"
        ))
    else:
        worker_user.password_hash = get_password_hash("devpass123")
        worker_user.role = RoleEnum.OUTSOURCE_WORKER
        worker_user.worker_id = first_worker.id
        worker_user.status = "active"
        
    session.commit()

    # 8. Create today's shift assignment for worker testing
    today_dt = datetime.now(timezone.utc).date()
    site1 = session.query(Site).first()
    if site1:
        if not site1.qr_token:
            site1.qr_token = f"MC:LOC:{site1.id}:{uuid.uuid4().hex}"
            site1.qr_status = "ACTIVE"
        session.commit()

        # Find or create today's request
        req_today = session.query(ManpowerRequest).filter(
            ManpowerRequest.site_id == site1.id,
            ManpowerRequest.required_date == datetime.combine(today_dt, datetime.min.time())
        ).first()

        if not req_today:
            req_today = ManpowerRequest(
                ops_manager_id=ops.id,
                site_id=site1.id,
                required_date=datetime.combine(today_dt, datetime.min.time()),
                start_time="08:00",
                end_time="17:00",
                total_required_workers=3,
                skill_category="Valet Driver",
                status="CONFIRMED"
            )
            session.add(req_today)
            session.commit()
            session.refresh(req_today)

        sr_today = session.query(SupplierResponse).filter(
            SupplierResponse.manpower_request_id == req_today.id,
            SupplierResponse.supplier_id == supplier.id
        ).first()

        if not sr_today:
            sr_today = SupplierResponse(
                manpower_request_id=req_today.id,
                supplier_id=supplier.id,
                requested_quantity=3,
                confirmed_quantity=3,
                status="ACCEPTED_BY_OM"
            )
            session.add(sr_today)
            session.commit()
            session.refresh(sr_today)

        # Ensure first_worker has active assignment
        wa_today = session.query(WorkerAssignment).filter(
            WorkerAssignment.supplier_response_id == sr_today.id,
            WorkerAssignment.worker_id == first_worker.id
        ).first()

        if not wa_today:
            wa_today = WorkerAssignment(
                supplier_response_id=sr_today.id,
                worker_id=first_worker.id,
                status="ASSIGNED"
            )
            session.add(wa_today)
            session.commit()

    print("\n" + "="*60)
    print("ALL 6 ROLE ACCOUNTS & ASSIGNMENTS CONFIGURED SUCCESSFULLY:")
    print(" 1. Super Admin:       admin@example.com       / devpass123")
    print(" 2. Operations Mgr:    ops@example.com         / devpass123")
    print(" 3. Supplier Head:     supplier@example.com    / devpass123")
    print(" 4. Accounting Team:   accounting@example.com  / devpass123")
    print(" 5. General Manager:   gm@example.com          / devpass123")
    print(" 6. Outsource Worker:  worker@example.com      / devpass123")
    print(f" (Worker #{first_worker.id} assigned to Site: {site1.name if site1 else 'None'}, QR: {site1.qr_token if site1 else 'None'})")
    print("="*60 + "\n")
    session.close()

if __name__ == "__main__":
    seed_roles()
