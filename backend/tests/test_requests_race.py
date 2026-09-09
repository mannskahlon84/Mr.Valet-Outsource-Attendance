import pytest
import asyncio
from concurrent.futures import ThreadPoolExecutor
from app.models.all_models import ManpowerRequest, SupplierResponse, User, Site, Supplier, Worker, RoleEnum
from sqlalchemy.orm import sessionmaker
from datetime import datetime

@pytest.fixture
def test_data(db):
    engine = db.get_bind()
    s = sessionmaker(bind=engine)()
    om = User(email='omtest@example.com', password_hash='hash', role=RoleEnum.OPS_MANAGER)
    sup = Supplier(name='SupTest')
    s.add_all([om, sup])
    s.commit()
    
    site = Site(name='Site1', manager_id=om.id)
    s.add(site)
    s.commit()
    
    return {'ops_manager': om, 'site': site, 'supplier': sup}

def test_race_condition_om_finalize(db, test_data):
    # Setup a request and two supplier responses
    engine = db.get_bind()
    TestSession = sessionmaker(bind=engine)
    
    # 1. Create ManpowerRequest
    s = TestSession()
    mr = ManpowerRequest(ops_manager_id=test_data['ops_manager'].id, site_id=test_data['site'].id, required_date=datetime.utcnow(), start_time="09:00", end_time="18:00", total_required_workers=10, status="SUBMITTED")
    s.add(mr)
    s.commit()
    s.refresh(mr)
    
    # 2. Create 2 Supplier Responses
    sr1 = SupplierResponse(manpower_request_id=mr.id, supplier_id=test_data['supplier'].id, requested_quantity=10, status="PENDING")
    sr2 = SupplierResponse(manpower_request_id=mr.id, supplier_id=test_data['supplier'].id, requested_quantity=10, status="PENDING")
    s.add(sr1)
    s.add(sr2)
    s.commit()
    sr1_id, sr2_id = sr1.id, sr2.id
    mr_id = mr.id
    s.close()
    
    from app.api.routers.requests import finalize_supplier_response
    from app.schemas.request import FinalizeResponseRequest
    from datetime import datetime
    
    def finalize_worker(sr_id, qty):
        session = TestSession()
        try:
            payload = FinalizeResponseRequest(accepted_quantity=qty, accepted_start_time="09:00", accepted_end_time="18:00", last_seen_responded_at=None)
            finalize_supplier_response(mr_id, sr_id, payload, db=session, current_user=test_data['ops_manager'])
            return True
        except Exception as e:
            session.rollback()
            return False
        finally:
            session.close()

    with ThreadPoolExecutor(max_workers=2) as executor:
        f1 = executor.submit(finalize_worker, sr1_id, 6)
        f2 = executor.submit(finalize_worker, sr2_id, 6)
        
    res1, res2 = f1.result(), f2.result()
    
    s = TestSession()
    mr = s.query(ManpowerRequest).filter(ManpowerRequest.id == mr_id).first()
    srs = s.query(SupplierResponse).filter(SupplierResponse.manpower_request_id == mr_id).all()
    
    accepted = [r for r in srs if r.status == "ACCEPTED_BY_OM"]
    assert len(accepted) == 1
    assert accepted[0].confirmed_quantity == 6
    assert mr.status == "PARTIALLY_CONFIRMED"
