import json
from datetime import datetime, timedelta, timezone
from app.core.timeutil import QATAR_TZ
from app.models.all_models import Attendance, Worker, WorkerAssignment
from app.services.face_retention import purge_daily_face_data, seconds_until_next_purge

FACE = json.dumps([0.1] * 128)


def qatar(y, m, d, hh, mm=0):
    """A Qatar wall-clock time as the naive UTC value check_in_time is stored in."""
    return datetime(y, m, d, hh, mm, tzinfo=QATAR_TZ).astimezone(timezone.utc).replace(tzinfo=None)


def test_daily_cleanup_wipes_finished_days_and_keeps_registered_faces(db):
    w = Worker(internal_worker_id="WRK-RET", first_name="Keep", last_name="Face", qid="29563400777", face_embedding=FACE)
    db.add(w); db.flush()
    def shift(check_in, check_out=None):
        wa = WorkerAssignment(worker_id=w.id); db.add(wa); db.flush()
        a = Attendance(worker_assignment_id=wa.id, check_in_time=check_in, check_out_time=check_out,
                       face_verified=True, check_in_face_embedding=FACE)
        db.add(a); db.flush()
        return a.id
    yesterday_done = shift(qatar(2026, 10, 17, 8), qatar(2026, 10, 17, 16))
    overnight_running = shift(qatar(2026, 10, 17, 22))              # 22:00 -> 06:00 shift, still on duty at 05:00
    forgot_checkout = shift(qatar(2026, 10, 15, 8))                 # never checked out, days ago
    today_early = shift(qatar(2026, 10, 18, 4, 30), qatar(2026, 10, 18, 4, 50))
    db.commit()

    cleared = purge_daily_face_data(db, now=datetime(2026, 10, 18, 5, 0, tzinfo=QATAR_TZ))
    assert cleared == 2
    db.expire_all()
    face = lambda i: db.get(Attendance, i).check_in_face_embedding
    assert face(yesterday_done) is None
    assert face(forgot_checkout) is None
    assert face(overnight_running) == FACE        # needed to match the 06:00 check-out
    assert face(today_early) == FACE              # today's data waits for tomorrow's clean-up
    assert db.get(Worker, w.id).face_embedding == FACE   # registered face is never wiped
    # Attendance records themselves are kept (hours, billing), only the face data goes
    assert db.query(Attendance).count() == 4

    # Next morning the overnight shift, now finished, is cleared too; running twice is harmless
    db.get(Attendance, overnight_running).check_out_time = qatar(2026, 10, 18, 6)
    db.commit()
    assert purge_daily_face_data(db, now=datetime(2026, 10, 19, 5, 0, tzinfo=QATAR_TZ)) == 2
    assert purge_daily_face_data(db, now=datetime(2026, 10, 19, 5, 0, tzinfo=QATAR_TZ)) == 0


def test_runs_every_morning_at_five_qatar_time():
    assert seconds_until_next_purge(datetime(2026, 10, 18, 4, 0, tzinfo=QATAR_TZ)) == 3600
    assert seconds_until_next_purge(datetime(2026, 10, 18, 5, 0, tzinfo=QATAR_TZ)) == 24 * 3600
    assert seconds_until_next_purge(datetime(2026, 10, 18, 6, 0, tzinfo=QATAR_TZ)) == 23 * 3600
    # 01:30 UTC is 04:30 in Qatar
    assert seconds_until_next_purge(datetime(2026, 10, 18, 1, 30, tzinfo=timezone.utc)) == 1800
