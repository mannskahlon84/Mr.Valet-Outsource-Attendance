import os
import sys

# Add backend to path so we can import app modules
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.db.session import SessionLocal
from app.models.all_models import Supplier, Worker, User, RoleEnum
from app.core.security import get_password_hash
import uuid

def seed_demo_workers():
    db = SessionLocal()
    
    suppliers = db.query(Supplier).all()
    if not suppliers:
        print("No suppliers found. Please run supplier seeder first.")
        return
        
    print(f"Found {len(suppliers)} suppliers. Generating 20 demo workers for each...")
    
    for sup in suppliers:
        # Check if workers already exist for this supplier
        existing = db.query(User).filter(User.email.like(f"driver%@{sup.name.lower().replace(' ', '')}.com")).count()
        if existing >= 20:
            print(f"Supplier {sup.name} already has {existing} demo workers. Skipping.")
            continue
            
        print(f"Seeding workers for {sup.name}...")
        for i in range(1, 21):
            worker_num = existing + i
            first_name = "Demo"
            last_name = f"Driver {worker_num}"
            internal_id = f"{sup.id}-DRV-{worker_num:03d}-{uuid.uuid4().hex[:4].upper()}"
            
            # Create worker profile
            w = Worker(
                supplier_id=sup.id,
                internal_worker_id=internal_id,
                first_name=first_name,
                last_name=last_name,
                phone=f"+9745555{worker_num:04d}",
                qid=f"29000000{sup.id}{worker_num:03d}"
            )
            db.add(w)
            db.flush() # flush to get worker ID
            
            # Create user login
            email_domain = sup.name.lower().replace(" ", "") + ".com"
            email = f"driver{worker_num}@{email_domain}"
            
            u = User(
                name=f"{first_name} {last_name} ({sup.name})",
                email=email,
                password_hash=get_password_hash("driver123"),
                role=RoleEnum.OUTSOURCE_WORKER,
                worker_id=w.id,
                supplier_id=sup.id,
                status="active"
            )
            db.add(u)
            
        db.commit()
        print(f"Successfully seeded 20 workers for {sup.name}.")
        
    print("Demo workers seeding complete.")
    db.close()

if __name__ == "__main__":
    seed_demo_workers()
