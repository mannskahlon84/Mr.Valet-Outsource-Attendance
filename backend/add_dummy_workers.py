import os
import sys
import string
import random
import uuid

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.db.session import SessionLocal
from app.models.all_models import Supplier, Worker, User, RoleEnum
from app.core.security import get_password_hash

def get_random_string(length):
    letters = string.ascii_lowercase
    return ''.join(random.choice(letters) for i in range(length))

def run():
    db = SessionLocal()
    suppliers = db.query(Supplier).all()
    print(f"Found {len(suppliers)} suppliers.")
    
    for supplier in suppliers:
        count = db.query(Worker).filter(Worker.supplier_id == supplier.id).count()
        if count >= 20:
            print(f"Supplier {supplier.name} already has {count} workers, skipping.")
            continue
            
        needed = 20 - count
        print(f"Adding {needed} workers to {supplier.name}...")
        for i in range(needed):
            qid_num = f"{random.randint(10000000000, 99999999999)}"
            worker = Worker(
                internal_worker_id=f"WRK-{supplier.id}-{i}-{get_random_string(4)}",
                supplier_id=supplier.id,
                first_name="Dummy",
                last_name=f"Worker {get_random_string(4)}",
                phone=f"555{random.randint(10000, 99999)}",
                qid=qid_num,
                whatsapp_number=f"555{random.randint(10000, 99999)}",
                status="active",
                qr_token=f"QR_{uuid.uuid4().hex[:8].upper()}"
            )
            db.add(worker)
            db.flush() # flush to get worker.id
            
            user = User(
                email=worker.qid,
                password_hash=get_password_hash("password123"),
                role=RoleEnum.OUTSOURCE_WORKER,
                worker_id=worker.id
            )
            db.add(user)
    
    db.commit()
    print("Done adding dummy workers.")
    db.close()

if __name__ == "__main__":
    run()
