"""Give every account that still uses a published demo password a new random one.

The demo seed scripts gave all accounts devpass123, and old builds also accepted Supplier123!.
Run this once against the live database before launch, then hand each person their new password:

    python -m scripts.rotate_default_passwords new_passwords.csv

The CSV (readable only by you) lists login, name, role and the new password. Delete it once the
passwords are handed out. Existing sessions of the rotated accounts are signed out.
"""
import csv
import os
import secrets
import string
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.passwords import password_problem
from app.core.security import get_password_hash, verify_password
from app.db.session import SessionLocal
from app.models.all_models import User

KNOWN_DEFAULT_PASSWORDS = ["devpass123", "Supplier123!", "password123"]


def new_password(length: int = 12) -> str:
    alphabet = string.ascii_letters + string.digits
    while True:
        candidate = "".join(secrets.choice(alphabet) for _ in range(length))
        if password_problem(candidate) is None:
            return candidate


def main():
    if len(sys.argv) != 2:
        sys.exit(__doc__)
    out_path = sys.argv[1]
    if os.path.exists(out_path):
        sys.exit(f"{out_path} already exists; choose a new file name so no passwords are overwritten.")

    rotated = []
    with SessionLocal() as db:
        users = db.query(User).filter(User.status != "inactive").all()
        for user in users:
            if not any(verify_password(p, user.password_hash) for p in KNOWN_DEFAULT_PASSWORDS):
                continue
            password = new_password()
            user.password_hash = get_password_hash(password)
            user.refresh_token_version = (user.refresh_token_version or 1) + 1
            role = user.role.value if hasattr(user.role, "value") else str(user.role)
            rotated.append((user.email or "", user.name or "", role, password))
        db.commit()

    fd = os.open(out_path, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
    with os.fdopen(fd, "w", newline="") as f:
        writer = csv.writer(f)
        writer.writerow(["login", "name", "role", "new_password"])
        writer.writerows(rotated)

    print(f"Checked {len(users)} active accounts; rotated {len(rotated)}. New passwords written to {out_path}.")


if __name__ == "__main__":
    main()
