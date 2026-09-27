import logging
import smtplib
from email.message import EmailMessage

from app.core.config import settings

log = logging.getLogger("uvicorn.error")


def email_configured() -> bool:
    return bool(settings.SMTP_HOST and settings.SMTP_FROM)


def send_email(to: str, subject: str, body: str) -> bool:
    """Send a plain-text email over SMTP. Returns False (and logs why) when it could not be sent."""
    if not email_configured():
        log.warning("Email to %s not sent: SMTP_HOST / SMTP_FROM are not configured", to)
        return False
    msg = EmailMessage()
    msg["From"] = settings.SMTP_FROM
    msg["To"] = to
    msg["Subject"] = subject
    msg.set_content(body)
    try:
        with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=15) as smtp:
            if settings.SMTP_USE_TLS:
                smtp.starttls()
            if settings.SMTP_USERNAME:
                smtp.login(settings.SMTP_USERNAME, settings.SMTP_PASSWORD or "")
            smtp.send_message(msg)
        return True
    except Exception:
        log.exception("Sending email to %s failed", to)
        return False


def send_password_reset_email(to: str, raw_token: str) -> bool:
    """Email the reset link. In development without SMTP, print it so the flow can still be tested."""
    link = f"{settings.FRONTEND_URL.rstrip('/')}/reset-password?token={raw_token}"
    if not email_configured() and not settings.is_production:
        print(f"\n{'='*50}\nPASSWORD RESET LINK FOR {to} (development, no SMTP configured):\n{link}\n{'='*50}\n")
        return True
    return send_email(
        to,
        "Reset your Mr. Valet password",
        "A password reset was requested for your Mr. Valet account.\n\n"
        f"Open this link within 30 minutes to choose a new password:\n{link}\n\n"
        "If you did not ask for this, ignore this email; your password stays the same.",
    )
