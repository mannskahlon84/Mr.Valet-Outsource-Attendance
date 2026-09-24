from datetime import date, datetime, timedelta, timezone

# Qatar is UTC+3 all year (no daylight saving)
QATAR_TZ = timezone(timedelta(hours=3), "Asia/Qatar")


def qatar_today() -> date:
    """The working day as the venues see it; UTC's date is wrong between 00:00 and 03:00 Qatar time."""
    return datetime.now(QATAR_TZ).date()


def shift_is_current(required_date: datetime, start_time: str, end_time: str, today: date) -> bool:
    """A shift belongs to today, or to yesterday when it runs past midnight (e.g. 22:00 - 06:00)."""
    shift_day = required_date.date() if isinstance(required_date, datetime) else required_date
    if shift_day == today:
        return True
    overnight = bool(start_time and end_time and end_time < start_time)
    return overnight and shift_day == today - timedelta(days=1)
