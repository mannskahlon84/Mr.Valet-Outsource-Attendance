import json
import pytest
from datetime import datetime
from concurrent.futures import ThreadPoolExecutor
from sqlalchemy.orm import sessionmaker

from app.models.all_models import Site, Worker, WorkerAssignment, Attendance, AttendanceAudit
from app.services.duplicate_identity import check_duplicate_identity

def generate_embedding(seed=1):
    # To ensure Cosine Similarity differs, we use seed as a multiplier on index
    # seed=1: [1, 2, 3, ...]
    # seed=2: [-1, 2, -3, ...]
    vec = []
    for i in range(512):
        if seed == 1:
            vec.append(float(i + 1))
        else:
            # orthogonal-ish
            vec.append(float((i + 1) * (-1 if i % 2 == 0 else 1)))
    # normalize it so we don't blow up float limits
    norm = sum(x*x for x in vec) ** 0.5
    return [x/norm for x in vec]

@pytest.fixture
def test_data(db):
    site = Site(name="Test Site 1")
    db.add(site)
    db.commit()
    
    w1 = Worker(internal_worker_id="W1", first_name="A", last_name="B", face_embedding=json.dumps(generate_embedding(1)))
    w2 = Worker(internal_worker_id="W2", first_name="C", last_name="D", face_embedding=json.dumps(generate_embedding(2)))
    w3 = Worker(internal_worker_id="W3", first_name="E", last_name="F", face_embedding=json.dumps(generate_embedding(1))) # Same face as W1
    db.add_all([w1, w2, w3])
    db.commit()
    
    wa1 = WorkerAssignment(worker_id=w1.id)
    wa2 = WorkerAssignment(worker_id=w2.id)
    wa3 = WorkerAssignment(worker_id=w3.id)
    db.add_all([wa1, wa2, wa3])
    db.commit()
    
    return {"site": site, "w1": w1, "w2": w2, "w3": w3, "wa1": wa1, "wa2": wa2, "wa3": wa3}

def test_first_valid_identity(db, test_data):
    w1, site = test_data["w1"], test_data["site"]
    live_face = generate_embedding(1)
    is_valid, msg = check_duplicate_identity(db, live_face, w1.id, site.id)
    assert is_valid is True

def test_same_worker_second_shift(db, test_data):
    w1, wa1, site = test_data["w1"], test_data["wa1"], test_data["site"]
    att1 = Attendance(worker_assignment_id=wa1.id, check_in_time=datetime.utcnow(), face_verified=True)
    db.add(att1)
    db.commit()
    live_face = generate_embedding(1)
    is_valid, msg = check_duplicate_identity(db, live_face, w1.id, site.id)
    assert is_valid is True

def test_different_worker_same_face_rejected(db, test_data):
    w1, w3, wa1, site = test_data["w1"], test_data["w3"], test_data["wa1"], test_data["site"]
    att1 = Attendance(worker_assignment_id=wa1.id, check_in_time=datetime.utcnow(), face_verified=True)
    db.add(att1)
    db.commit()
    
    live_face = generate_embedding(1)
    is_valid, msg = check_duplicate_identity(db, live_face, w3.id, site.id)
    assert is_valid is False
    assert msg == "IDENTITY_ALREADY_RECORDED"
    
def test_failed_attempts_do_not_reserve(db, test_data):
    w1, w3, wa1, site = test_data["w1"], test_data["w3"], test_data["wa1"], test_data["site"]
    att1 = Attendance(worker_assignment_id=wa1.id, check_in_time=datetime.utcnow(), face_verified=False)
    db.add(att1)
    db.commit()
    live_face = generate_embedding(1)
    is_valid, msg = check_duplicate_identity(db, live_face, w3.id, site.id)
    assert is_valid is True

def test_different_faces_accepted(db, test_data):
    w1, w2, wa1, site = test_data["w1"], test_data["w2"], test_data["wa1"], test_data["site"]
    att1 = Attendance(worker_assignment_id=wa1.id, check_in_time=datetime.utcnow(), face_verified=True)
    db.add(att1)
    db.commit()
    live_face = generate_embedding(2)
    is_valid, msg = check_duplicate_identity(db, live_face, w2.id, site.id)
    assert is_valid is True

def test_concurrency_same_face_different_workers(db, test_data):
    w1, w3, site = test_data["w1"], test_data["w3"], test_data["site"]
    wa1, wa3 = test_data["wa1"], test_data["wa3"]
    live_face = generate_embedding(1)
    engine = db.get_bind()
    TestSession = sessionmaker(bind=engine)
    
    def process_checkin(worker_id, wa_id):
        session = TestSession()
        try:
            is_valid, msg = check_duplicate_identity(session, live_face, worker_id, site.id)
            if is_valid:
                att = Attendance(worker_assignment_id=wa_id, check_in_time=datetime.utcnow(), face_verified=True)
                session.add(att)
                session.commit()
            return is_valid
        except Exception:
            session.rollback()
            return False
        finally:
            session.close()
            
    with ThreadPoolExecutor(max_workers=2) as executor:
        f1 = executor.submit(process_checkin, w1.id, wa1.id)
        f2 = executor.submit(process_checkin, w3.id, wa3.id)
        f1.result()
        f2.result()
            
    atts = db.query(Attendance).join(WorkerAssignment).filter(
        Attendance.face_verified == True,
        WorkerAssignment.worker_id.in_([w1.id, w3.id])
    ).all()
    
    assert len(atts) <= 1, "Concurrency failed!"
