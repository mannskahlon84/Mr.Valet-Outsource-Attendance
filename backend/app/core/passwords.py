from fastapi import HTTPException

# Published in the repo and docs as demo passwords, or too common to allow
BLOCKED_PASSWORDS = {
    "devpass123", "supplier123!", "password", "password1", "password123", "12345678", "123456789",
    "qwerty123", "admin123", "welcome1", "letmein1", "mrvalet123",
}
MIN_PASSWORD_LENGTH = 8


def password_problem(password: str):
    """Why this password is not acceptable, or None if it is."""
    if not password or len(password) < MIN_PASSWORD_LENGTH:
        return f"Password must be at least {MIN_PASSWORD_LENGTH} characters."
    if not any(c.isalpha() for c in password) or not any(c.isdigit() for c in password):
        return "Password must contain both letters and numbers."
    if password.strip().lower() in BLOCKED_PASSWORDS:
        return "This password is too common or publicly known. Choose a different one."
    return None


def require_strong_password(password: str):
    problem = password_problem(password)
    if problem:
        raise HTTPException(status_code=400, detail=problem)
