import sys
from fastapi.testclient import TestClient
from app.main import app

c = TestClient(app)

creds = [
    ("admin@example.com", "devpass123", "Super Admin"),
    ("ops@example.com", "devpass123", "Operations Manager"),
    ("supplier@example.com", "devpass123", "Supplier Head"),
    ("accounting@example.com", "devpass123", "Accounting"),
    ("gm@example.com", "devpass123", "General Manager"),
    ("worker@example.com", "devpass123", "Outsource Worker"),
]

all_passed = True
print("\n" + "="*70)
print("TESTING AUTHENTICATION & ROLE DETECTION FOR ALL 6 PORTAL ACCOUNTS:")
print("="*70)

for email, pwd, expected_role in creds:
    res = c.post("/api/v1/auth/login", data={"username": email, "password": pwd})
    if res.status_code != 200:
        print(f"[FAIL] {email}: HTTP {res.status_code} - {res.text}")
        all_passed = False
        continue
    token = res.json()["access_token"]
    me_res = c.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"})
    if me_res.status_code != 200:
        print(f"[FAIL] {email}: /auth/me HTTP {me_res.status_code}")
        all_passed = False
        continue
    data = me_res.json()
    role = data.get("role")
    name = data.get("name")
    match = (role == expected_role)
    status = "[PASS]" if match else "[FAIL MISMATCH]"
    if not match: all_passed = False
    print(f"{status} | User: {email:<24} | Name: {name:<18} | Role: {role}")

print("="*70)
if all_passed:
    print("ALL 6 PORTAL ROLES AUTHENTICATED SUCCESSFULLY!\n")
    sys.exit(0)
else:
    print("SOME ROLES FAILED AUTHENTICATION\n")
    sys.exit(1)
