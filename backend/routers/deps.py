"""Authentication / authorization dependencies for the mobile API."""
import uuid

from fastapi import Depends, Header, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from core.sql import get_db
from models.sql_models import Doctor, DoctorPatient, Patient, User
from services.security import decode_access_token


async def current_user(
    authorization: str | None = Header(default=None),
    db: AsyncSession = Depends(get_db),
) -> User:
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(status_code=401, detail="Sign in to continue.")
    try:
        payload = decode_access_token(authorization.split(" ", 1)[1].strip())
    except Exception:
        raise HTTPException(status_code=401, detail="Your session has expired. Please sign in again.")
    user = await db.get(User, uuid.UUID(payload["sub"]))
    if not user or user.status != "ACTIVE":
        raise HTTPException(status_code=401, detail="Your session is no longer valid.")
    return user


async def current_patient(
    user: User = Depends(current_user),
    db: AsyncSession = Depends(get_db),
) -> Patient:
    if user.user_type != "PATIENT":
        raise HTTPException(status_code=403, detail="This area is available to patients only.")
    patient = (await db.execute(select(Patient).where(Patient.user_id == user.id))).scalar_one_or_none()
    if not patient:
        raise HTTPException(status_code=404, detail="Complete your health profile to continue.")
    return patient


async def current_doctor(
    user: User = Depends(current_user),
    db: AsyncSession = Depends(get_db),
) -> Doctor:
    if user.user_type != "DOCTOR":
        raise HTTPException(status_code=403, detail="This area is available to clinicians only.")
    doctor = (await db.execute(select(Doctor).where(Doctor.user_id == user.id))).scalar_one_or_none()
    if not doctor:
        raise HTTPException(status_code=404, detail="Clinician profile not found.")
    return doctor


async def authorized_patient(db: AsyncSession, doctor: Doctor, patient_id: str) -> Patient:
    """Backend-enforced doctor→patient authorization. UI restrictions are never relied upon."""
    try:
        pid = uuid.UUID(patient_id)
    except (ValueError, AttributeError):
        raise HTTPException(status_code=404, detail="Patient not found.")
    link = (await db.execute(
        select(DoctorPatient).where(
            DoctorPatient.doctor_id == doctor.id,
            DoctorPatient.patient_id == pid,
            DoctorPatient.status == "ACTIVE",
        )
    )).scalar_one_or_none()
    if not link:
        raise HTTPException(status_code=403, detail="You are not authorized to access this patient record.")
    patient = await db.get(Patient, pid)
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found.")
    return patient
