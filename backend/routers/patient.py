"""Patient registration, profile and dashboard. Patients can only ever read their own data."""
import logging
import uuid
from datetime import date, datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from core.sql import get_db
from models.sql_models import DialysisSession, LabResult, MedicalReport, Patient, User, Vital
from routers.deps import current_patient, current_user
from services.logs import log_audit, log_error
from services.security import hash_aadhaar, mask_aadhaar, valid_aadhaar

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/patient", tags=["patient"])


class RegisterRequest(BaseModel):
    name: str
    aadhaar_number: str
    date_of_birth: date | None = None
    gender: str | None = None


class UpdateProfileRequest(BaseModel):
    name: str | None = None
    date_of_birth: date | None = None
    gender: str | None = None


def _age(dob: date | None) -> int | None:
    if not dob:
        return None
    today = date.today()
    return today.year - dob.year - ((today.month, today.day) < (dob.month, dob.day))


def patient_out(patient: Patient) -> dict:
    return {
        "id": str(patient.id),
        "patientIdentifier": patient.patient_identifier,
        "name": patient.name,
        "dateOfBirth": patient.date_of_birth.isoformat() if patient.date_of_birth else None,
        "age": _age(patient.date_of_birth),
        "gender": patient.gender,
        # Full Aadhaar is never returned; only a masked identifier is exposed.
        "aadhaarMasked": "XXXX XXXX " + patient.patient_identifier[-4:],
        "createdAt": patient.created_at.isoformat() if patient.created_at else None,
    }


@router.post("/register")
async def register_patient(
    payload: RegisterRequest,
    request: Request,
    user: User = Depends(current_user),
    db: AsyncSession = Depends(get_db),
):
    if user.user_type != "PATIENT":
        raise HTTPException(status_code=403, detail="This account is not a patient account.")
    existing = (await db.execute(select(Patient).where(Patient.user_id == user.id))).scalar_one_or_none()
    if existing:
        return {"patient": patient_out(existing), "created": False}

    name = (payload.name or "").strip()
    if len(name) < 2:
        raise HTTPException(status_code=400, detail="Enter your full name.")
    if not valid_aadhaar(payload.aadhaar_number):
        raise HTTPException(status_code=400, detail="Enter a valid 12-digit Aadhaar number.")

    aadhaar_hash = hash_aadhaar(payload.aadhaar_number)
    clash = (await db.execute(select(Patient).where(Patient.aadhaar_hash == aadhaar_hash))).scalar_one_or_none()
    if clash:
        raise HTTPException(status_code=409, detail="A patient profile already exists for this Aadhaar number.")

    masked_tail = mask_aadhaar(payload.aadhaar_number)[-4:]
    try:
        patient = Patient(
            user_id=user.id,
            patient_identifier=f"DG-{aadhaar_hash[:8].upper()}{masked_tail}",
            name=name,
            date_of_birth=payload.date_of_birth,
            gender=payload.gender,
            aadhaar_hash=aadhaar_hash,
        )
        db.add(patient)
        await db.commit()
        await db.refresh(patient)
    except Exception as exc:
        await db.rollback()
        await log_error(service="patient.register", exc=exc, user_id=user.id)
        raise HTTPException(status_code=500, detail="We could not create your profile. Please try again.")

    await log_audit(db, user_id=user.id, action="PATIENT_REGISTERED", entity_type="patient", entity_id=str(patient.id))
    return {"patient": patient_out(patient), "created": True}


@router.get("/profile")
async def get_profile(patient: Patient = Depends(current_patient), user: User = Depends(current_user)):
    return {
        "patient": patient_out(patient),
        "account": {"mobileNumber": f"XXXXXX{user.mobile_number[-4:]}", "userType": user.user_type,
                    "lastLoginAt": user.last_login_at.isoformat() if user.last_login_at else None},
    }


@router.patch("/profile")
async def update_profile(
    payload: UpdateProfileRequest,
    patient: Patient = Depends(current_patient),
    user: User = Depends(current_user),
    db: AsyncSession = Depends(get_db),
):
    if payload.name is not None:
        name = payload.name.strip()
        if len(name) < 2:
            raise HTTPException(status_code=400, detail="Enter your full name.")
        patient.name = name
    if payload.date_of_birth is not None:
        patient.date_of_birth = payload.date_of_birth
    if payload.gender is not None:
        patient.gender = payload.gender
    patient.updated_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(patient)
    await log_audit(db, user_id=user.id, action="PROFILE_UPDATED", entity_type="patient", entity_id=str(patient.id))
    return {"patient": patient_out(patient)}


async def clinical_overview(db: AsyncSession, patient_id: uuid.UUID) -> dict:
    labs = (await db.execute(
        select(LabResult).where(LabResult.patient_id == patient_id)
        .order_by(LabResult.created_at.desc()).limit(40)
    )).scalars().all()
    latest: dict = {}
    for row in labs:
        latest.setdefault(row.test_name, {
            "testName": row.test_name, "value": row.test_value, "unit": row.unit,
            "referenceRange": row.reference_range,
            "testDate": row.test_date.isoformat() if row.test_date else None,
        })
    priority = ["Haemoglobin", "Potassium", "Creatinine", "Urea", "Calcium", "Phosphate", "Albumin", "Sodium"]
    ordered = [latest[name] for name in priority if name in latest]
    ordered += [value for name, value in latest.items() if name not in priority]
    vital = (await db.execute(
        select(Vital).where(Vital.patient_id == patient_id).order_by(Vital.recorded_at.desc()).limit(1)
    )).scalar_one_or_none()
    return {
        "labs": ordered,
        "vitals": {
            "systolicBp": vital.systolic_bp, "diastolicBp": vital.diastolic_bp,
            "heartRate": vital.heart_rate,
            "weight": float(vital.weight) if vital and vital.weight is not None else None,
            "recordedAt": vital.recorded_at.isoformat(),
        } if vital else None,
        "unverified": True,
    }


@router.get("/dashboard")
async def dashboard(patient: Patient = Depends(current_patient), db: AsyncSession = Depends(get_db)):
    next_session = (await db.execute(
        select(DialysisSession)
        .where(DialysisSession.patient_id == patient.id, DialysisSession.session_date >= date.today())
        .order_by(DialysisSession.session_date.asc()).limit(1)
    )).scalar_one_or_none()
    last_session = (await db.execute(
        select(DialysisSession)
        .where(DialysisSession.patient_id == patient.id, DialysisSession.session_date < date.today())
        .order_by(DialysisSession.session_date.desc()).limit(1)
    )).scalar_one_or_none()
    reports = (await db.execute(
        select(MedicalReport).where(MedicalReport.patient_id == patient.id)
        .order_by(MedicalReport.uploaded_at.desc()).limit(3)
    )).scalars().all()
    report_count = (await db.execute(
        select(func.count()).select_from(MedicalReport).where(MedicalReport.patient_id == patient.id)
    )).scalar_one()

    def session_out(s):
        return {
            "id": str(s.id), "sessionDate": s.session_date.isoformat(),
            "startTime": s.start_time.isoformat() if s.start_time else None,
            "status": s.status, "dialysisCenter": s.dialysis_center,
        }

    return {
        "patient": patient_out(patient),
        "nextSession": session_out(next_session) if next_session else None,
        "lastSession": session_out(last_session) if last_session else None,
        "clinicalOverview": await clinical_overview(db, patient.id),
        "recentReports": [{
            "id": str(r.id), "reportType": r.report_type, "fileName": r.file_name,
            "status": r.status, "uploadedAt": r.uploaded_at.isoformat(),
        } for r in reports],
        "reportCount": report_count,
    }
