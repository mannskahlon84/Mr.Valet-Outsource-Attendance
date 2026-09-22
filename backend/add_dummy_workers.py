import os
import sys
import string
import random
import uuid

# Add the parent directory to the path so we can import from app
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.db.session import SessionLocal
from app.models.all_models import Supplier, Worker, RoleEnum
from app.core.security import get_password_hash

def get_random_string(length):
    letters = string.ascii_lowercase
    return ''.join(random.choice(letters) for i in range(length))

def run():
    db = SessionLocal()
    suppliers = db.query(Supplier).all()
    print(f"Found {len(suppliers)} suppliers.")
    
    for supplier in suppliers:
        # Check how many workers they already have
        count = db.query(Worker).filter(Worker.supplier_id == supplier.id).count()
        if count >= 20:
            print(f"Supplier {supplier.name} already has {count} workers, skipping.")
            continue
            
        needed = 20 - count
        print(f"Adding {needed} workers to {supplier.name}...")
        for i in range(needed):
            worker = Worker(
                name=f"Dummy Worker {get_random_string(4)}",
                national_id=f"{random.randint(10000000000, 99999999999)}",
                rfid_tag=f"RFID_{uuid.uuid4().hex[:8].upper()}",
                supplier_id=supplier.id,
                email=f"dummy{get_random_string(4)}@supplier{supplier.id}.com",
                hashed_password=get_password_hash("password123"),
                role=RoleEnum.WORKER,
                is_active=True,
                status="AVAILABLE"
            )
            db.add(worker)
    
    db.commit()
    print("Done adding dummy workers.")
    db.close()

if __name__ == "__main__":
    run()
