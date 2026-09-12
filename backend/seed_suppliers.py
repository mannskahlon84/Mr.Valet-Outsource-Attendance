import uuid
from app.db.session import SessionLocal
from app.models.all_models import Supplier, User, RoleEnum
from app.core.security import get_password_hash

SUPPLIER_LIST = [
    {"name": "Deepu", "contact": "Deepu", "email": "deepu@supplier.mrvalet.local", "phone": "+97455010001"},
    {"name": "Kanan", "contact": "Kanan", "email": "kanan@supplier.mrvalet.local", "phone": "+97455010002"},
    {"name": "Hanees", "contact": "Hanees", "email": "hanees@supplier.mrvalet.local", "phone": "+97455010003"},
    {"name": "Nizar", "contact": "Nizar", "email": "nizar@supplier.mrvalet.local", "phone": "+97455010004"},
    {"name": "Dennis", "contact": "Dennis", "email": "dennis@supplier.mrvalet.local", "phone": "+97455010005"},
    {"name": "Naboth", "contact": "Naboth", "email": "naboth@supplier.mrvalet.local", "phone": "+97455010006"},
    {"name": "Henry", "contact": "Henry", "email": "henry@supplier.mrvalet.local", "phone": "+97455010007"},
]

def seed_suppliers():
    db = SessionLocal()
    created_count = 0
    updated_count = 0

    try:
        for item in SUPPLIER_LIST:
            sup = db.query(Supplier).filter(Supplier.name == item["name"]).first()
            if not sup:
                sup = Supplier(
                    name=item["name"],
                    contact_person=item["contact"],
                    contact_email=item["email"],
                    contact_phone=item["phone"],
                    status="active",
                    billing_rate=45.0,
                    qr_token=f"MC:SUP:{uuid.uuid4().hex[:12]}"
                )
                db.add(sup)
                db.commit()
                db.refresh(sup)
                created_count += 1
                print(f"[CREATED] Supplier: {sup.name} (ID: {sup.id})")
            else:
                updated_count += 1
                print(f"[EXISTS] Supplier: {sup.name} (ID: {sup.id})")

            # Check linked User for Supplier Head login
            sup_user = db.query(User).filter(
                (User.supplier_id == sup.id) & (User.role == RoleEnum.SUPPLIER_HEAD)
            ).first()

            if not sup_user:
                # Also check by email to avoid unique constraint collision
                by_email = db.query(User).filter(User.email == item["email"]).first()
                if by_email:
                    by_email.supplier_id = sup.id
                    by_email.role = RoleEnum.SUPPLIER_HEAD
                    by_email.name = item["contact"]
                    db.commit()
                    print(f"  -> Re-linked existing user: {by_email.email}")
                else:
                    new_user = User(
                        email=item["email"],
                        password_hash=get_password_hash("Supplier123!"),
                        role=RoleEnum.SUPPLIER_HEAD,
                        name=item["contact"],
                        supplier_id=sup.id,
                        status="active"
                    )
                    db.add(new_user)
                    db.commit()
                    print(f"  -> Created Supplier Head User: {item['email']} (Password: Supplier123!)")
            else:
                print(f"  -> Linked User: {sup_user.email}")

        print(f"\nSeeding complete! {created_count} created, {updated_count} existing.")
    except Exception as e:
        db.rollback()
        print(f"Error seeding suppliers: {e}")
        raise e
    finally:
        db.close()

if __name__ == "__main__":
    seed_suppliers()
