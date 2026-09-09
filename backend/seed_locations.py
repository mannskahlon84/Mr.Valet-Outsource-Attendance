import sys
import os

from app.db.session import engine
from sqlalchemy.orm import sessionmaker
from app.models.all_models import Base, Site, User, RoleEnum
from app.core.security import get_password_hash

def seed():
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    session = SessionLocal()
    
    locations_data = [
        ("121 Tower", "Hani Abdelsallam"),
        ("21 High Street Hotel", "Hani Abdelsallam"),
        ("35 West Bay Tower", "Maen Klaib"),
        ("Adrenaline Gym", "Maen Klaib"),
        ("Al Ahli Hospital", "Maen Klaib"),
        ("Al Maha Island", "Brahim Hayouni"),
        ("Al Najada Hotel", "Maen Klaib"),
        ("Al-Aziziya Hotel", "Wissem Chagtmi"),
        ("Al-Rayyan Hotel", "Maen Klaib"),
        ("Andaz Doha Hotel", "Hani Abdelsallam"),
        ("Banana Island", "Wissem Chagtmi"),
        ("Banyan Tree Hotel", "Wissem Chagtmi"),
        ("Beiruti Restaurant", "Maen Klaib"),
        ("Belhamber Restaurant", "Wissem Chagtmi"),
        ("CAC TUS - Lusail", "Maen Klaib"),
        ("Centro Mall", "Brahim Hayouni"),
        ("Century Marina Mall", "Maen Klaib"),
        ("Cielo Hotel", "Maen Klaib"),
        ("City Center", "Maen Klaib"),
        ("Dar Global", "Maen Klaib"),
        ("Doha Clinic", "Wissem Chagtmi"),
        ("Doha Festival City", "Maen Klaib"),
        ("Doha oasis", "Wissem Chagtmi"),
        ("Dusit Hotel", "Maen Klaib"),
        ("Embassy Suites by Hilton", "Wissem Chagtmi"),
        ("Ezdan Palace", "Wissem Chagtmi"),
        ("Fairmont Hotel", "Maen Klaib"),
        ("Gewan Island", "Hani Abdelsallam"),
        ("Hilton the pearl residence", "Hani Abdelsallam"),
        ("Ibis and Adagio", "Wissem Chagtmi"),
        ("Intercontinental Doha", "Hani Abdelsallam"),
        ("Katara hills", "Hani Abdelsallam"),
        ("Katara Village", "Wissem Chagtmi")
    ]
    
    # First, make sure the managers exist
    manager_map = {}
    managers = ["Hani Abdelsallam", "Maen Klaib", "Brahim Hayouni", "Wissem Chagtmi"]
    for m_name in managers:
        email = f"{m_name.lower().replace(' ', '.')}@mrvalet.com"
        u = session.query(User).filter(User.email == email).first()
        if not u:
            u = User(
                email=email,
                name=m_name,
                password_hash=get_password_hash("devpass123"),
                role=RoleEnum.OPS_MANAGER
            )
            session.add(u)
            session.commit()
            session.refresh(u)
        manager_map[m_name] = u.id

    # Now add the locations
    for loc_name, m_name in locations_data:
        s = session.query(Site).filter(Site.name == loc_name).first()
        if not s:
            s = Site(
                name=loc_name,
                latitude=25.2861,
                longitude=51.5310,
                geofence_radius_meters=100,
                manager_id=manager_map[m_name]
            )
            session.add(s)
    
    session.commit()
    print("Seed complete!")

seed()
