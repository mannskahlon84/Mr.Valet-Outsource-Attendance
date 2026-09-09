import os
import sys

from app.db.session import engine
from app.db.base import Base
from sqlalchemy.orm import sessionmaker
from app.models.all_models import User, RoleEnum
from app.core.security import get_password_hash

def seed_db():
    print("Creating tables...")
    Base.metadata.create_all(bind=engine)
    print("Tables created.")
    
    Session = sessionmaker(bind=engine)
    session = Session()
    
    admin_email = "manpreet@alsharqiholding.com"
    
    existing = session.query(User).filter(User.email == admin_email).first()
    if not existing:
        admin = User(
            email=admin_email,
            password_hash=get_password_hash("devpass123"),
            role=RoleEnum.SUPER_ADMIN,
            name="Manpreet"
        )
        session.add(admin)
        session.commit()
        print(f"Created admin user: {admin_email} / devpass123")
    else:
        existing.password_hash = get_password_hash("devpass123")
        existing.role = RoleEnum.SUPER_ADMIN
        session.commit()
        print(f"Updated existing user: {admin_email} to SUPER_ADMIN / devpass123")
        
if __name__ == "__main__":
    seed_db()
