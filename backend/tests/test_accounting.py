import pytest
from fastapi.testclient import TestClient
from app.models.all_models import Supplier, ManpowerRequest, SupplierResponse, RoleEnum, User, Invoice
from datetime import datetime, date

def test_accounting_summary(db):
    # Setup test data
    # Create supplier
    sup = Supplier(name="Test Accounting Supplier", billing_rate=150.0)
    db.add(sup)
    db.commit()
    
    # Create User for auth
    u = User(email="acc@test.com", password_hash="123", role=RoleEnum.SUPER_ADMIN, status="active")
    db.add(u)
    db.commit()
    
    # Create ManpowerRequest
    req = ManpowerRequest(total_required_workers=10, required_date=datetime(2026, 8, 15), status="COMPLETED")
    db.add(req)
    db.commit()
    
    # Create Supplier Response
    res = SupplierResponse(manpower_request_id=req.id, supplier_id=sup.id, requested_quantity=10, confirmed_quantity=10, status="CONFIRMED")
    db.add(res)
    db.commit()
    
    token = "fake_token"
    pass 
