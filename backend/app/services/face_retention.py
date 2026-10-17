"""Daily clean-up of check-in face data.

Each check-in stores the face data of that day's selfie (attendance.check_in_face_embedding),
used to match the check-out to the same person. It isn't needed once the day is over, so it is
wiped every morning at 05:00 Qatar time. Each driver's registered face (workers.face_embedding)
is kept: the same-day duplicate rule and proxy protection compare against that one.
"""
import asyncio
import logging
import os
from datetime import datetime, time, timedelta, timezone

from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.core.timeutil import QATAR_TZ
from app.models.all_models import Attendance

PURGE_AT = time(5, 0)  # Qatar time
log = logging.getLogger("uvicorn.error")


def purge_daily_face_data(db: Session, now: datetime | None = None) -> int:
    """Wipe check-in face data from earlier Qatar days. A shift still running (checked in, not yet
    checked out, within the last 24 hours) keeps it until a later run. Returns rows cleared."""
    now = now or datetime.now(timezone.utc)
    today_start = datetime.combine(now.astimezone(QATAR_TZ).date(), time.min, tzinfo=QATAR_TZ)
    # check_in_time is stored as naive UTC
    day_cutoff = today_start.astimezone(timezone.utc).replace(tzinfo=None)
    open_shift_cutoff = (now.astimezone(timezone.utc) - timedelta(hours=24)).replace(tzinfo=None)
    cleared = db.query(Attendance).filter(
        Attendance.check_in_face_embedding.isnot(None),
        Attendance.check_in_time < day_cutoff,
        or_(Attendance.check_out_time.isnot(None), Attendance.check_in_time < open_shift_cutoff),
    ).update({Attendance.check_in_face_embedding: None}, synchronize_session=False)
    db.commit()
    return cleared


def seconds_until_next_purge(now: datetime | None = None) -> float:
    now = (now or datetime.now(timezone.utc)).astimezone(QATAR_TZ)
    next_run = datetime.combine(now.date(), PURGE_AT, tzinfo=QATAR_TZ)
    if next_run <= now:
        next_run += timedelta(days=1)
    return (next_run - now).total_seconds()


def purge_enabled() -> bool:
    return os.environ.get("FACE_DATA_PURGE", "true").strip().lower() not in ("0", "false", "no", "off")


def run_purge_once():
    from app.db.session import SessionLocal
    db = SessionLocal()
    try:
        cleared = purge_daily_face_data(db)
        if cleared:
            log.info("Daily face-data clean-up: cleared %s check-in record(s)", cleared)
    except Exception:
        db.rollback()
        log.exception("Daily face-data clean-up failed")
    finally:
        db.close()


async def purge_loop():
    """Run at start-up (catches a day missed while the server was down), then every day at 05:00.
    Each app worker runs it; the clean-up is idempotent, so running it more than once is harmless."""
    while True:
        await asyncio.to_thread(run_purge_once)
        await asyncio.sleep(seconds_until_next_purge())
