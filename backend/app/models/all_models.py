from sqlalchemy import Column, Integer, String, Boolean, ForeignKey, DateTime, Float, JSON, Enum, Text, Date
from sqlalchemy.orm import relationship
from datetime import datetime
import enum
from app.db.base import Base

class RoleEnum(str, enum.Enum):
    SUPER_ADMIN = "Super Admin"
    GENERAL_MANAGER = "General Manager"
    MANAGEMENT = "Management"
    OPS_MANAGER = "Operations Manager"
    HR_ADMIN = "HR/Admin"
    SUPPLIER_HEAD = "Supplier Head"
    OUTSOURCE_WORKER = "Outsource Worker"
    ACCOUNTING = "Accounting"

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=True)
    email = Column(String, unique=True, index=True, nullable=True)
    password_hash = Column(String, nullable=False)
    role = Column(Enum(RoleEnum), nullable=False)
    worker_id = Column(Integer, ForeignKey("workers.id"), nullable=True)
    supplier_id = Column(Integer, ForeignKey("suppliers.id"), nullable=True)
    status = Column(String, default="active")
    qr_token = Column(String, unique=True, index=True, nullable=True)
    qr_status = Column(String, default="ACTIVE")
    refresh_token_version = Column(Integer, default=1)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class Supplier(Base):
    __tablename__ = "suppliers"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    contact_person = Column(String)
    contact_email = Column(String)
    contact_phone = Column(String)
    qid = Column(String, unique=True, index=True, nullable=True)
    whatsapp_number = Column(String, unique=True, index=True, nullable=True)
    status = Column(String, default="active")
    billing_rate = Column(Float, default=0.0)
    qr_token = Column(String, unique=True, index=True, nullable=True)
    qr_status = Column(String, default="ACTIVE")
    created_at = Column(DateTime, default=datetime.utcnow)

class Worker(Base):
    __tablename__ = "workers"
    id = Column(Integer, primary_key=True, index=True)
    internal_worker_id = Column(String, unique=True, index=True, nullable=False)
    external_employee_id = Column(String, nullable=True)
    supplier_id = Column(Integer, ForeignKey("suppliers.id"))
    first_name = Column(String, nullable=False)
    last_name = Column(String, nullable=False)
    phone = Column(String)
    qid = Column(String, unique=True, index=True, nullable=True)
    whatsapp_number = Column(String, unique=True, index=True, nullable=True)
    status = Column(String, default="active")
    face_embedding = Column(Text, nullable=True)
    device_id = Column(String, nullable=True)
    qr_token = Column(String, unique=True, index=True, nullable=True)
    qr_status = Column(String, default="ACTIVE")
    created_at = Column(DateTime, default=datetime.utcnow)

class Site(Base):
    __tablename__ = "sites"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    address = Column(String)
    latitude = Column(Float)
    longitude = Column(Float)
    geofence_radius_meters = Column(Float, default=100.0)
    manager_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    status = Column(String, default="active")
    qr_token = Column(String, unique=True, index=True, nullable=True)
    qr_status = Column(String, default="ACTIVE")

class ManpowerRequest(Base):
    __tablename__ = "manpower_requests"
    id = Column(Integer, primary_key=True, index=True)
    ops_manager_id = Column(Integer, ForeignKey("users.id"))
    site_id = Column(Integer, ForeignKey("sites.id"))
    required_date = Column(DateTime, nullable=False)
    start_time = Column(String)
    end_time = Column(String)
    total_required_workers = Column(Integer, nullable=False)
    skill_category = Column(String)
    notes = Column(Text)
    status = Column(String, default="DRAFT")
    created_at = Column(DateTime, default=datetime.utcnow)

class SupplierResponse(Base):
    __tablename__ = "supplier_responses"
    id = Column(Integer, primary_key=True, index=True)
    manpower_request_id = Column(Integer, ForeignKey("manpower_requests.id"))
    supplier_id = Column(Integer, ForeignKey("suppliers.id"))
    requested_quantity = Column(Integer, nullable=False)
    confirmed_quantity = Column(Integer, default=0)
    proposed_start_time = Column(String, nullable=True)
    proposed_end_time = Column(String, nullable=True)
    supplier_message = Column(Text, nullable=True)
    response_type = Column(String, nullable=True)
    status = Column(String, default="PENDING")
    responded_at = Column(DateTime, nullable=True)
    confirmed_start_time = Column(String, nullable=True)
    confirmed_end_time = Column(String, nullable=True)
    confirmed_at = Column(DateTime, nullable=True)
    confirmed_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)

class WorkerAssignment(Base):
    __tablename__ = "worker_assignments"
    id = Column(Integer, primary_key=True, index=True)
    supplier_response_id = Column(Integer, ForeignKey("supplier_responses.id"))
    worker_id = Column(Integer, ForeignKey("workers.id"))
    status = Column(String, default="ASSIGNED")
    created_at = Column(DateTime, default=datetime.utcnow)

class Attendance(Base):
    __tablename__ = "attendance"
    id = Column(Integer, primary_key=True, index=True)
    worker_assignment_id = Column(Integer, ForeignKey("worker_assignments.id"), unique=True)
    check_in_time = Column(DateTime, nullable=True)
    check_in_lat = Column(Float, nullable=True)
    check_in_lng = Column(Float, nullable=True)
    check_in_accuracy = Column(Float, nullable=True)
    check_out_time = Column(DateTime, nullable=True)
    check_out_lat = Column(Float, nullable=True)
    check_out_lng = Column(Float, nullable=True)
    check_out_accuracy = Column(Float, nullable=True)
    device_info = Column(String, nullable=True)

    status = Column(String, default="EXPECTED")
    face_verified = Column(Boolean, nullable=True)
    liveness_score = Column(Float, nullable=True)
    check_in_verification_method = Column(String, default="QR_GPS")
    check_out_verification_method = Column(String, default="QR_GPS")
    check_in_qr_id = Column(Integer, ForeignKey("sites.id"), nullable=True)
    check_out_qr_id = Column(Integer, ForeignKey("sites.id"), nullable=True)
    check_in_face_embedding = Column(Text, nullable=True)

class AttendanceException(Base):
    __tablename__ = "attendance_exceptions"
    id = Column(Integer, primary_key=True, index=True)
    attendance_id = Column(Integer, ForeignKey("attendance.id"), nullable=True)
    worker_assignment_id = Column(Integer, ForeignKey("worker_assignments.id"))
    exception_type = Column(String)
    reason = Column(Text)
    requested_by = Column(Integer, ForeignKey("users.id"))
    approved_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    status = Column(String, default="PENDING_APPROVAL")
    created_at = Column(DateTime, default=datetime.utcnow)
    resolved_at = Column(DateTime, nullable=True)

class AuditLog(Base):
    __tablename__ = "audit_logs"
    id = Column(Integer, primary_key=True, index=True)
    timestamp = Column(DateTime, default=datetime.utcnow)
    actor_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    actor_role = Column(String)
    action = Column(String, nullable=False)
    entity_type = Column(String, nullable=False)
    entity_id = Column(Integer, nullable=False)
    previous_state = Column(JSON, nullable=True)
    new_state = Column(JSON, nullable=True)
    ip_address = Column(String, nullable=True)


class OtpSession(Base):
    __tablename__ = "otp_sessions"
    id = Column(Integer, primary_key=True, index=True)
    whatsapp_number = Column(String, index=True, nullable=False)
    otp_hash = Column(String, nullable=False)
    expires_at = Column(DateTime, nullable=False)
    attempts = Column(Integer, default=0)
    max_attempts = Column(Integer, default=3)
    purpose = Column(String, nullable=False)
    payload = Column(JSON, nullable=True)
    verified = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

class PasswordReset(Base):
    __tablename__ = "password_resets"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    token_hash = Column(String, nullable=False)
    expires_at = Column(DateTime, nullable=False)
    used = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

class Invoice(Base):
    __tablename__ = "invoices"
    id = Column(Integer, primary_key=True, index=True)
    invoice_number = Column(String, unique=True, index=True, nullable=False)
    supplier_id = Column(Integer, ForeignKey("suppliers.id"), nullable=False)
    billing_month = Column(Date, nullable=False) # e.g. YYYY-MM-01
    workers_supplied_quantity = Column(Integer, nullable=False)
    rate_per_worker = Column(Float, nullable=False)
    total_amount = Column(Float, nullable=False)
    status = Column(String, default="GENERATED") # GENERATED or VOIDED
    generated_by_id = Column(Integer, ForeignKey("users.id"))
    generated_at = Column(DateTime, default=datetime.utcnow)
    document_path_pdf = Column(String, nullable=True)


class Notification(Base):
    __tablename__ = "notifications"
    id = Column(Integer, primary_key=True, index=True)
    supplier_id = Column(Integer, ForeignKey("suppliers.id"), nullable=False)
    message = Column(Text, nullable=False)
    is_read = Column(Boolean, default=False)
    entity_type = Column(String, nullable=True)
    entity_id = Column(Integer, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class AttendanceAudit(Base):
    __tablename__ = "attendance_audit"
    id = Column(Integer, primary_key=True, index=True)
    worker_id = Column(Integer, nullable=False)
    site_id = Column(Integer, nullable=False)
    attempt_time = Column(DateTime, default=datetime.utcnow)
    gps_lat = Column(Float, nullable=True)
    gps_lng = Column(Float, nullable=True)
    failure_reason = Column(String, nullable=True)


class UserDevice(Base):
    __tablename__ = "user_devices"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    push_token = Column(String, unique=True, index=True, nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class RequestMessage(Base):
    __tablename__ = "request_messages"
    id = Column(Integer, primary_key=True, index=True)
    manpower_request_id = Column(Integer, ForeignKey("manpower_requests.id"), nullable=False)
    sender_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    message = Column(Text, nullable=False)
    timestamp = Column(DateTime, default=datetime.utcnow)
