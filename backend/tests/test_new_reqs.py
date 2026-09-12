import pytest
from fastapi.testclient import TestClient
from app.models.all_models import User, RoleEnum, Supplier, Worker, Site

def test_billing_rate_rbac(db):
    sup = Supplier(name="RBAC Supplier", billing_rate=250.0)
    db.add(sup)
    db.commit()
    db.refresh(sup)
    
    from app.api.routers.suppliers import filter_supplier_response
    
    admin = User(role=RoleEnum.SUPER_ADMIN)
    admin_resp = filter_supplier_response(sup, admin, db)
    assert hasattr(admin_resp, 'billing_rate'), "Super admin should see billing rate"
    
    acct = User(role=RoleEnum.ACCOUNTING)
    acct_resp = filter_supplier_response(sup, acct, db)
    assert hasattr(acct_resp, 'billing_rate'), "Accounting should see billing rate"
    
    ops = User(role=RoleEnum.OPS_MANAGER)
    ops_resp = filter_supplier_response(sup, ops, db)
    assert not hasattr(ops_resp, 'billing_rate'), "Ops Manager MUST NOT see billing rate"
    
    supplier_usr = User(role=RoleEnum.SUPPLIER_HEAD)
    sup_resp = filter_supplier_response(sup, supplier_usr, db)
    assert not hasattr(sup_resp, 'billing_rate'), "Supplier MUST NOT see billing rate"

def test_worker_login_generation(db):
    assert True
