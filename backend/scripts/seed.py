import os
import sys
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy.orm import Session
from app.db.session import engine, SessionLocal
from app.models.all_models import User, RoleEnum, Supplier, Worker, Site
from app.core.security import get_password_hash
from app.db.base import Base

def init_db():
    Base.metadata.create_all(bind=engine)

def seed_data(db: Session):
    print("Seeding development data...")
    if db.query(User).filter(User.email == "admin@example.com").first():
        print("Data already seeded.")
        return

    admin = User(email="admin@example.com", password_hash=get_password_hash("devpass123"), role=RoleEnum.SUPER_ADMIN)
    mgmt = User(email="mgmt@example.com", password_hash=get_password_hash("devpass123"), role=RoleEnum.MANAGEMENT)
    hr = User(email="hr@example.com", password_hash=get_password_hash("devpass123"), role=RoleEnum.HR_ADMIN)
    ops = User(email="ops@example.com", password_hash=get_password_hash("devpass123"), role=RoleEnum.OPS_MANAGER)
    db.add_all([admin, mgmt, hr, ops])
    db.commit()

    supplier = Supplier(name="Alpha Manpower Ltd", contact_person="John Doe", contact_email="john@alpha.com")
    db.add(supplier)
    db.commit()

    head = User(email="head@alpha.com", password_hash=get_password_hash("devpass123"), role=RoleEnum.SUPPLIER_HEAD, supplier_id=supplier.id)
    db.add(head)
    
    w1 = Worker(internal_worker_id="WRK-001", supplier_id=supplier.id, first_name="Tom", last_name="Smith")
    w2 = Worker(internal_worker_id="WRK-002", supplier_id=supplier.id, first_name="Jane", last_name="Doe")
    db.add_all([w1, w2])

    site = Site(name="Downtown Project", address="123 Main St", latitude=10.0, longitude=20.0, geofence_radius_meters=100.0)
    db.add(site)
    db.commit()
    print("Seed complete! Use devpass123 for all users.")

if __name__ == "__main__":
    init_db()
    db = SessionLocal()
    seed_data(db)
    db.close()
