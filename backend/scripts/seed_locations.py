import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.models.all_models import Base, Site, User, RoleEnum
from app.core.security import get_password_hash

DATABASE_URL = "sqlite:///./test.db"

# To ensure the schema updates apply, we'll recreate the DB for this seed.
if os.path.exists("./test.db"):
    os.remove("./test.db")

engine = create_engine(DATABASE_URL)
Base.metadata.create_all(bind=engine)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

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
    ("Katara Village", "Wissem Chagtmi"),
    ("Kempinski residence and suites", "Wissem Chagtmi"),
    ("Korean Medical Center", "Maen Klaib"),
    ("La Cigale Hotel", "Wissem Chagtmi"),
    ("Laffan Tower", "Wissem Chagtmi"),
    ("Lagoona Mall", "Hani Abdelsallam"),
    ("Little Sailor Restaurant", "Wissem Chagtmi"),
    ("M Gallery hotel", "Ghazi Alshammari"),
    ("Medina Central", "Hani Abdelsallam"),
    ("Mall Of Qatar", "Maen Klaib"),
    ("Manarat Lusail Tower", "Maen Klaib"),
    ("Mandarin Oriental Doha", "Wissem Chagtmi"),
    ("Marsa Malaz Kempinski", "Maen Klaib"),
    ("Maysan LXR", "Wissem Chagtmi"),
    ("Messila Resort", "Wissem Chagtmi"),
    ("Millennium Hotel and resort - em sherif", "Wissem Chagtmi"),
    ("Ministry Of Foreign Affairs (MOFA)", "Wissem Chagtmi"),
    ("Msheireb Downtown", "Ghazi Alshammari"),
    ("Novo Cinema", "Hani Abdelsallam"),
    ("Old Doha Port", "Brahim Hayouni"),
    ("Ooredoo", "Maen Klaib"),
    ("Orient Pearl", "Wissem Chagtmi"),
    ("Park Hyatt Doha", "Ghazi Alshammari"),
    ("Porto Arabia - UDC", "Hani Abdelsallam"),
    ("Pullman Hotel", "Maen Klaib"),
    ("QQ", "Hani Abdelsallam"),
    ("Raffles Hotel", "Maen Klaib"),
    ("Ritz Carlton hotel", "Hani Abdelsallam"),
    ("Rixos Qetaifan", "Hani Abdelsallam"),
    ("Rosewood Hotel", "Maen Klaib"),
    ("Sharq Village", "Wissem Chagtmi"),
    ("Shoumoukh Tower", "Wissem Chagtmi"),
    ("St Regis Doha", "Maen Klaib"),
    ("St regis Marsa Arabia", "Hani Abdelsallam"),
    ("Surgi Art Hospital", "Brahim Hayouni"),
    ("Tawar Mall", "Maen Klaib"),
    ("The chedi katara Hotel", "Hani Abdelsallam"),
    ("The Ned Doha", "Wissem Chagtmi"),
    ("The Pearl Hospital", "Hani Abdelsallam"),
    ("The Plaza by Anantara", "Wissem Chagtmi"),
    ("The torch Hotel", "Wissem Chagtmi"),
    ("The View Hospital", "Hani Abdelsallam"),
    ("Tower 18", "Brahim Hayouni"),
    ("Twin Tower Lusail", "Maen Klaib"),
    ("UDC Tower", "Hani Abdelsallam"),
    ("Villaggio Mall", "Maen Klaib"),
    ("Voco Hotel", "Maen Klaib"),
    ("Waldorf Astoria", "Maen Klaib"),
    ("West Walk", "Maen Klaib"),
    ("Wyndham Hotel West Bay", "Maen Klaib")
]

db = SessionLocal()

print('Seeding General Manager...')
gm = db.query(User).filter(User.name == 'Murad Ismail').first()
if not gm:
    gm = User(name='Murad Ismail', email=None, password_hash=get_password_hash('password123'), role=RoleEnum.GENERAL_MANAGER)
    db.add(gm)
    db.flush()

managers_added = {}
for loc, manager_name in locations_data:
    if manager_name not in managers_added:
        u = db.query(User).filter(User.name == manager_name).first()
        if not u:
            u = User(name=manager_name, email=None, password_hash=get_password_hash('password123'), role=RoleEnum.OPS_MANAGER)
            db.add(u)
            db.flush()
        managers_added[manager_name] = u.id
    
    site = db.query(Site).filter(Site.name == loc).first()
    if not site:
        site = Site(name=loc, latitude=25.2854, longitude=51.5310, geofence_radius_meters=100.0, manager_id=managers_added[manager_name], qr_token=f"MC:LOC:MOCK:{loc.replace(' ', '')}")
        db.add(site)

db.commit()
db.close()
print('Seed complete!')
