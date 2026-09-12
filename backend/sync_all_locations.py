import sys
import os
import uuid
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.db.session import engine
from sqlalchemy.orm import sessionmaker
from app.models.all_models import Site, User, RoleEnum
from app.core.security import get_password_hash

Session = sessionmaker(bind=engine)
db = Session()

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

managers_info = {
    "Wissem Chagtmi": "wissem.chagtmi@mrvalet.com",
    "Hani Abdelsallam": "hani.abdelsallam@mrvalet.com",
    "Maen Klaib": "maen.klaib@mrvalet.com",
    "Brahim Hayouni": "brahim.hayouni@mrvalet.com",
    "Ghazi Alshammari": "ghazi.alshammari@mrvalet.com",
}

managers_map = {}
for name, email in managers_info.items():
    u = db.query(User).filter((User.email == email) | (User.name == name)).first()
    if not u:
        u = User(
            name=name,
            email=email,
            password_hash=get_password_hash("devpass123"),
            role=RoleEnum.OPS_MANAGER,
            status="active"
        )
        db.add(u)
        db.commit()
        db.refresh(u)
    else:
        u.name = name
        u.email = email
        u.password_hash = get_password_hash("devpass123")
        u.role = RoleEnum.OPS_MANAGER
        u.status = "active"
        db.commit()
    managers_map[name] = u.id

# Also ensure ops@example.com is an ops manager with a couple of test sites
ops_demo = db.query(User).filter(User.email == "ops@example.com").first()
if ops_demo:
    ops_demo.status = "active"
    ops_demo.password_hash = get_password_hash("devpass123")
    db.commit()

from geocode_all_qatar_sites import KNOWN_COORDINATES

# Now sync all 82 sites
for loc, mgr_name in locations_data:
    mgr_id = managers_map.get(mgr_name)
    lat, lng, address = KNOWN_COORDINATES.get(loc, (25.2854, 51.5310, "Doha, Qatar"))
    site = db.query(Site).filter(Site.name == loc).first()
    if not site:
        site = Site(
            name=loc,
            address=address,
            latitude=lat,
            longitude=lng,
            geofence_radius_meters=200.0,
            manager_id=mgr_id,
            status="active",
            qr_status="ACTIVE",
            qr_token=f"MC:LOC:{uuid.uuid4().hex[:12]}:{loc.replace(' ', '')}"
        )
        db.add(site)
    else:
        site.manager_id = mgr_id
        site.status = "active"
        site.address = address
        site.latitude = lat
        site.longitude = lng
        site.geofence_radius_meters = 200.0
        if not site.qr_token:
            site.qr_token = f"MC:LOC:{site.id}:{uuid.uuid4().hex[:12]}"
            site.qr_status = "ACTIVE"
    db.commit()

# Give ops@example.com at least 2 locations as well for testing
if ops_demo:
    site_demo1 = db.query(Site).filter(Site.name == "121 Tower").first()
    if site_demo1:
        site_demo1.manager_id = ops_demo.id
    site_demo2 = db.query(Site).filter(Site.name == "City Center").first()
    if site_demo2:
        site_demo2.manager_id = ops_demo.id
    db.commit()

print("\n" + "="*60)
print(f"SYNCED {len(locations_data)} SITES TO MANAGERS SUCCESSFULLY:")
for name in managers_info.keys():
    mgr_id = managers_map[name]
    count = db.query(Site).filter(Site.manager_id == mgr_id).count()
    print(f" - {name} ({managers_info[name]}): {count} locations assigned")
if ops_demo:
    ops_count = db.query(Site).filter(Site.manager_id == ops_demo.id).count()
    print(f" - Ops Demo (ops@example.com): {ops_count} locations assigned")
print("="*60 + "\n")
db.close()
