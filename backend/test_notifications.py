import os
import sys
from datetime import datetime
from app.db.session import SessionLocal
from app.models.all_models import User, RoleEnum, Notification, Supplier, Worker

def test_notification_backend():
    db = SessionLocal()
    try:
        print("1. Querying users...")
        supplier_user = db.query(User).filter(User.role == RoleEnum.SUPPLIER_HEAD).first()
        ops_user = db.query(User).filter(User.role == RoleEnum.OPS_MANAGER).first()
        worker_user = db.query(User).filter(User.role == RoleEnum.OUTSOURCE_WORKER).first()

        print(f"   Supplier user: {supplier_user.email if supplier_user else 'None'}")
        print(f"   Ops user: {ops_user.email if ops_user else 'None'}")
        print(f"   Worker user: {worker_user.email if worker_user else 'None'}")

        print("\n2. Creating test in-app push notifications for each role...")
        # Supplier notification
        if supplier_user:
            n_sup = Notification(
                user_id=supplier_user.id,
                supplier_id=supplier_user.supplier_id,
                title="📋 New Shift Request",
                message="Shift dispatched for 5 drivers at St. Regis Doha.",
                entity_type="MANPOWER_REQUEST",
                entity_id=101
            )
            db.add(n_sup)

        # Ops notification
        if ops_user:
            n_ops = Notification(
                user_id=ops_user.id,
                title="👥 Drivers Assigned",
                message="Supplier confirmed 5 drivers for Grand Hyatt Doha.",
                entity_type="OPS_ALERT",
                entity_id=102
            )
            db.add(n_ops)

        # Worker notification
        if worker_user:
            n_wrk = Notification(
                user_id=worker_user.id,
                worker_id=worker_user.worker_id,
                title="🚘 Shift Assignment",
                message="You are scheduled to report at Ritz-Carlton Doha at 16:00.",
                entity_type="SHIFT_ASSIGNMENT",
                entity_id=103
            )
            db.add(n_wrk)

        db.commit()
        print("   Test notifications created successfully!")

        print("\n3. Verifying retrieval by role...")
        total_notifs = db.query(Notification).count()
        print(f"   Total notifications in database: {total_notifs}")
        assert total_notifs > 0, "No notifications found in database"

        latest = db.query(Notification).order_by(Notification.id.desc()).limit(3).all()
        for n in latest:
            safe_title = (n.title or '').encode('ascii', 'replace').decode()
            safe_msg = (n.message or '').encode('ascii', 'replace').decode()
            print(f"   [ID #{n.id}] {safe_title}: {safe_msg} (Read: {n.is_read})")

        print("\nALL NOTIFICATION TESTS PASSED SUCCESSFULLY!")
    finally:
        db.close()

if __name__ == "__main__":
    test_notification_backend()
