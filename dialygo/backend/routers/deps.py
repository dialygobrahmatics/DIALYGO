"""Authentication / authorization dependencies for the mobile API."""
import uuid

from fastapi import Depends, HTTPException, Query
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from core.sql import get_db
from models.sql_models import Doctor, DoctorPatient, Patient, User
from services.security import decode_access_token

bearer_auth = HTTPBearer(auto_error=False)


async def _user_from_token(db: AsyncSession, token: str | None) -> User:
    if not token:
        raise HTTPException(status_code=401, detail="Sign in to continue.")
    try:
        payload = decode_access_token(token)
    except Exception:
        raise HTTPException(status_code=401, detail="Your session has expired. Please sign in again.")
    user = await db.get(User, uuid.UUID(payload["sub"]))
    if not user or user.status != "ACTIVE":
        raise HTTPException(status_code=401, detail="Your session is no longer valid.")
    return user


async def current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_auth),
    db: AsyncSession = Depends(get_db),
) -> User:
    token = credentials.credentials.strip() if credentials else None
    return await _user_from_token(db, token)


async def current_user_flexible(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_auth),
    auth: str | None = Query(default=None),
    db: AsyncSession = Depends(get_db),
) -> User:
    """Also accepts ?auth=<token> so <img>/<iframe>/native viewers can load protected files."""
    token = credentials.credentials.strip() if credentials else None
    return await _user_from_token(db, token or auth)


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
