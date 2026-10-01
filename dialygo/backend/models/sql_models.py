"""SQLAlchemy models — a 1:1 implementation of the approved Dialygo PostgreSQL DBML.

Medical documents and OCR data are NOT stored here; they live in MongoDB.
"""
import uuid
from datetime import datetime, timezone

from sqlalchemy import (
    Boolean,
    Date,
    DateTime,
    ForeignKey,
    Integer,
    Numeric,
    String,
    Text,
    UniqueConstraint,
    false,
)
from sqlalchemy.orm import Mapped, mapped_column

from core.sql import Base
from models.types import GUID, JSONBType


def _uuid() -> uuid.UUID:
    return uuid.uuid4()


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


TS = DateTime(timezone=True)


def as_aware(value: datetime | None) -> datetime | None:
    """SQLite returns naive datetimes; normalise to UTC-aware for comparisons."""
    if value is None:
        return None
    return value if value.tzinfo else value.replace(tzinfo=timezone.utc)


class User(Base):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(GUID, primary_key=True, default=_uuid)
    # Human-facing login ID shown in the web UI, e.g. DUR-PT-00218, DOC-0071, OPR-1041, ADM-0001.
    user_code: Mapped[str] = mapped_column(String(30), nullable=False, unique=True, index=True)
    mobile_number: Mapped[str] = mapped_column(String(15), nullable=False, unique=True, index=True)
    email: Mapped[str | None] = mapped_column(String(255), unique=True, index=True)  # stored lower-case
    user_type: Mapped[str] = mapped_column(String(20), nullable=False)  # PATIENT / DOCTOR / OPERATOR / DIALYSIS_ADMIN / TECH_ADMIN
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="ACTIVE")
    # Master details captured on the profile page.
    blood_group: Mapped[str | None] = mapped_column(String(10))
    emergency_contact: Mapped[str | None] = mapped_column(String(255))  # free text: name and number
    known_allergies: Mapped[str | None] = mapped_column(Text)
    occupation: Mapped[str | None] = mapped_column(String(150))
    # DPDP consents; consents_updated_at is the time of the last change to any of them.
    consent_data_sharing: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False, server_default=false())
    consent_privacy_notice: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False, server_default=false())
    consent_research: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False, server_default=false())
    consents_updated_at: Mapped[datetime | None] = mapped_column(TS)
    created_at: Mapped[datetime] = mapped_column(TS, nullable=False, default=utcnow)
    updated_at: Mapped[datetime | None] = mapped_column(TS)
    last_login_at: Mapped[datetime | None] = mapped_column(TS)


class Patient(Base):
    __tablename__ = "patients"

    id: Mapped[uuid.UUID] = mapped_column(GUID, primary_key=True, default=_uuid)
    user_id: Mapped[uuid.UUID] = mapped_column(GUID, ForeignKey("users.id"), nullable=False, unique=True)
    patient_identifier: Mapped[str] = mapped_column(String(100), nullable=False, unique=True)
    name: Mapped[str] = mapped_column(String(150), nullable=False)
    date_of_birth: Mapped[Date | None] = mapped_column(Date)
    gender: Mapped[str | None] = mapped_column(String(20))
    aadhaar_hash: Mapped[str] = mapped_column(String(255), nullable=False, unique=True)
    created_at: Mapped[datetime] = mapped_column(TS, nullable=False, default=utcnow)
    updated_at: Mapped[datetime | None] = mapped_column(TS)


class Doctor(Base):
    __tablename__ = "doctors"

    id: Mapped[uuid.UUID] = mapped_column(GUID, primary_key=True, default=_uuid)
    user_id: Mapped[uuid.UUID] = mapped_column(GUID, ForeignKey("users.id"), nullable=False, unique=True)
    name: Mapped[str] = mapped_column(String(150), nullable=False)
    specialization: Mapped[str | None] = mapped_column(String(150))
    registration_number: Mapped[str | None] = mapped_column(String(100), unique=True)
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="ACTIVE")
    created_at: Mapped[datetime] = mapped_column(TS, nullable=False, default=utcnow)
    updated_at: Mapped[datetime | None] = mapped_column(TS)


class StaffProfile(Base):
    """Profile for non-clinical-record roles: OPERATOR, DIALYSIS_ADMIN, TECH_ADMIN."""
    __tablename__ = "staff_profiles"

    id: Mapped[uuid.UUID] = mapped_column(GUID, primary_key=True, default=_uuid)
    user_id: Mapped[uuid.UUID] = mapped_column(GUID, ForeignKey("users.id"), nullable=False, unique=True)
    name: Mapped[str] = mapped_column(String(150), nullable=False)
    designation: Mapped[str | None] = mapped_column(String(150))
    unit: Mapped[str | None] = mapped_column(String(150))
    created_at: Mapped[datetime] = mapped_column(TS, nullable=False, default=utcnow)
    updated_at: Mapped[datetime | None] = mapped_column(TS)


class DoctorPatient(Base):
    __tablename__ = "doctor_patients"
    __table_args__ = (UniqueConstraint("doctor_id", "patient_id", name="uq_doctor_patients_doctor_patient"),)

    id: Mapped[uuid.UUID] = mapped_column(GUID, primary_key=True, default=_uuid)
    doctor_id: Mapped[uuid.UUID] = mapped_column(GUID, ForeignKey("doctors.id"), nullable=False)
    patient_id: Mapped[uuid.UUID] = mapped_column(GUID, ForeignKey("patients.id"), nullable=False)
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="ACTIVE")
    assigned_at: Mapped[datetime] = mapped_column(TS, nullable=False, default=utcnow)
    created_at: Mapped[datetime] = mapped_column(TS, nullable=False, default=utcnow)


class MedicalReport(Base):
    __tablename__ = "medical_reports"

    id: Mapped[uuid.UUID] = mapped_column(GUID, primary_key=True, default=_uuid)
    patient_id: Mapped[uuid.UUID] = mapped_column(GUID, ForeignKey("patients.id"), nullable=False, index=True)
    document_id: Mapped[str] = mapped_column(String(100), nullable=False)  # MongoDB document ID
    report_type: Mapped[str] = mapped_column(String(50), nullable=False)
    file_name: Mapped[str | None] = mapped_column(String(255))
    file_type: Mapped[str | None] = mapped_column(String(50))
    status: Mapped[str] = mapped_column(String(30), nullable=False)
    uploaded_at: Mapped[datetime] = mapped_column(TS, nullable=False, default=utcnow)
    processed_at: Mapped[datetime | None] = mapped_column(TS)
    created_at: Mapped[datetime] = mapped_column(TS, nullable=False, default=utcnow)


class DialysisSession(Base):
    __tablename__ = "dialysis_sessions"

    id: Mapped[uuid.UUID] = mapped_column(GUID, primary_key=True, default=_uuid)
    patient_id: Mapped[uuid.UUID] = mapped_column(GUID, ForeignKey("patients.id"), nullable=False, index=True)
    session_date: Mapped[Date] = mapped_column(Date, nullable=False)
    start_time: Mapped[datetime | None] = mapped_column(TS)
    end_time: Mapped[datetime | None] = mapped_column(TS)
    status: Mapped[str | None] = mapped_column(String(30))
    dialysis_center: Mapped[str | None] = mapped_column(String(200))
    created_at: Mapped[datetime] = mapped_column(TS, nullable=False, default=utcnow)
    updated_at: Mapped[datetime | None] = mapped_column(TS)


class Vital(Base):
    __tablename__ = "vitals"

    id: Mapped[uuid.UUID] = mapped_column(GUID, primary_key=True, default=_uuid)
    patient_id: Mapped[uuid.UUID] = mapped_column(GUID, ForeignKey("patients.id"), nullable=False, index=True)
    recorded_at: Mapped[datetime] = mapped_column(TS, nullable=False)
    systolic_bp: Mapped[int | None] = mapped_column(Integer)
    diastolic_bp: Mapped[int | None] = mapped_column(Integer)
    heart_rate: Mapped[int | None] = mapped_column(Integer)
    temperature: Mapped[float | None] = mapped_column(Numeric(5, 2))
    weight: Mapped[float | None] = mapped_column(Numeric(6, 2))
    created_at: Mapped[datetime] = mapped_column(TS, nullable=False, default=utcnow)


class LabResult(Base):
    __tablename__ = "lab_results"

    id: Mapped[uuid.UUID] = mapped_column(GUID, primary_key=True, default=_uuid)
    patient_id: Mapped[uuid.UUID] = mapped_column(GUID, ForeignKey("patients.id"), nullable=False, index=True)
    report_id: Mapped[uuid.UUID | None] = mapped_column(GUID, ForeignKey("medical_reports.id"))
    test_name: Mapped[str] = mapped_column(String(150), nullable=False)
    test_value: Mapped[str | None] = mapped_column(String(100))
    unit: Mapped[str | None] = mapped_column(String(50))
    reference_range: Mapped[str | None] = mapped_column(String(100))
    test_date: Mapped[Date | None] = mapped_column(Date)
    created_at: Mapped[datetime] = mapped_column(TS, nullable=False, default=utcnow)


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id: Mapped[uuid.UUID] = mapped_column(GUID, primary_key=True, default=_uuid)
    user_id: Mapped[uuid.UUID | None] = mapped_column(GUID, ForeignKey("users.id"))
    action: Mapped[str] = mapped_column(String(100), nullable=False)
    entity_type: Mapped[str | None] = mapped_column(String(100))
    entity_id: Mapped[str | None] = mapped_column(String(100))
    ip_address: Mapped[str | None] = mapped_column(String(50))
    # Column name stays `metadata` per the approved DBML; `metadata` is reserved on the ORM class.
    meta: Mapped[dict | None] = mapped_column("metadata", JSONBType)
    created_at: Mapped[datetime] = mapped_column(TS, nullable=False, default=utcnow)


class ErrorLog(Base):
    __tablename__ = "error_logs"

    id: Mapped[uuid.UUID] = mapped_column(GUID, primary_key=True, default=_uuid)
    user_id: Mapped[uuid.UUID | None] = mapped_column(GUID, ForeignKey("users.id"))
    service: Mapped[str | None] = mapped_column(String(100))
    error_type: Mapped[str | None] = mapped_column(String(100))
    error_message: Mapped[str | None] = mapped_column(Text)
    stack_trace: Mapped[str | None] = mapped_column(Text)
    request_id: Mapped[str | None] = mapped_column(String(100))
    created_at: Mapped[datetime] = mapped_column(TS, nullable=False, default=utcnow, index=True)


class OtpVerification(Base):
    __tablename__ = "otp_verifications"

    id: Mapped[uuid.UUID] = mapped_column(GUID, primary_key=True, default=_uuid)
    mobile_number: Mapped[str] = mapped_column(String(15), nullable=False, index=True)
    otp_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    expires_at: Mapped[datetime] = mapped_column(TS, nullable=False)
    verified_at: Mapped[datetime | None] = mapped_column(TS)
    attempt_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    created_at: Mapped[datetime] = mapped_column(TS, nullable=False, default=utcnow)
