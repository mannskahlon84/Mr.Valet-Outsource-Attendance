import os
import sys

# Add backend to path so we can import app modules
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.db.session import SessionLocal
from app.models.all_models import Worker, User, Attendance, WorkerAssignment, SupplierResponse, ManpowerRequest

def clear_demo_data():
    db = SessionLocal()
    
    print("Finding demo workers to delete...")
    # Find demo workers by the name we used to seed them
    demo_workers = db.query(Worker).filter(Worker.first_name == "Demo").all()
    demo_worker_ids = [w.id for w in demo_workers]
    
    if not demo_worker_ids:
        print("No demo workers found.")
        return
        
    print(f"Found {len(demo_worker_ids)} demo workers. Starting cleanup...")
    
    try:
        # Delete related attendance records first
        demo_assignments = db.query(WorkerAssignment).filter(WorkerAssignment.worker_id.in_(demo_worker_ids)).all()
        demo_assignment_ids = [wa.id for wa in demo_assignments]
        
        if demo_assignment_ids:
            # Delete attendance
            deleted_attendance = db.query(Attendance).filter(Attendance.worker_assignment_id.in_(demo_assignment_ids)).delete(synchronize_session=False)
            print(f"Deleted {deleted_attendance} attendance records.")
            
            # Delete assignments
            deleted_assignments = db.query(WorkerAssignment).filter(WorkerAssignment.id.in_(demo_assignment_ids)).delete(synchronize_session=False)
            print(f"Deleted {deleted_assignments} worker assignments.")
            
        # Delete demo user accounts
        deleted_users = db.query(User).filter(User.worker_id.in_(demo_worker_ids)).delete(synchronize_session=False)
        print(f"Deleted {deleted_users} demo user accounts.")
        
        # Finally, delete demo workers
        deleted_workers = db.query(Worker).filter(Worker.id.in_(demo_worker_ids)).delete(synchronize_session=False)
        print(f"Deleted {deleted_workers} demo worker profiles.")
        
        db.commit()
        print("✅ Demo data successfully cleared!")
        
    except Exception as e:
        db.rollback()
        print(f"Error occurred during cleanup: {str(e)}")
        
    finally:
        db.close()

if __name__ == "__main__":
    confirm = input("WARNING: This will delete all demo drivers and their attendance records. Type 'yes' to proceed: ")
    if confirm.lower() == 'yes':
        clear_demo_data()
    else:
        print("Cleanup aborted.")
