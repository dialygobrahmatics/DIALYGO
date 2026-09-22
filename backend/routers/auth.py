"""Mobile authentication: mobile number + OTP. The backend identifies the account type."""
import logging
import uuid
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from core.config import settings
from core.sql import get_db
from models.sql_models import Doctor, OtpVerification, Patient, User, as_aware
from routers.deps import current_user
from services.logs import log_audit, log_error
from services.otp import get_otp_provider
from services.security import create_access_token, hash_otp, normalize_mobile, valid_mobile

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/auth", tags=["auth"])


class SendOtpRequest(BaseModel):
    mobile_number: str


class VerifyOtpRequest(BaseModel):
    mobile_number: str
    otp: str


def _client_ip(request: Request) -> str | None:
    forwarded = request.headers.get("x-forwarded-for")
    return forwarded.split(",")[0].strip() if forwarded else (request.client.host if request.client else None)


async def account_context(db: AsyncSession, user: User) -> dict:
    """Drives the mobile app's post-login routing. No role selection is ever exposed."""
    if user.user_type == "DOCTOR":
        doctor = (await db.execute(select(Doctor).where(Doctor.user_id == user.id))).scalar_one_or_none()
        return {
            "userType": "DOCTOR",
            "registrationRequired": doctor is None,
            "profile": {"id": str(doctor.id), "name": doctor.name, "specialization": doctor.specialization} if doctor else None,
        }
    patient = (await db.execute(select(Patient).where(Patient.user_id == user.id))).scalar_one_or_none()
    return {
        "userType": "PATIENT",
        "registrationRequired": patient is None,
        "profile": {
            "id": str(patient.id),
            "name": patient.name,
            "patientIdentifier": patient.patient_identifier,
        } if patient else None,
    }


@router.post("/send-otp")
async def send_otp(payload: SendOtpRequest, request: Request, db: AsyncSession = Depends(get_db)):
    mobile = normalize_mobile(payload.mobile_number)
    if not valid_mobile(mobile):
        raise HTTPException(status_code=400, detail="Enter a valid 10-digit Indian mobile number.")
    try:
        provider = get_otp_provider()
        otp = provider.generate()
        record = OtpVerification(
            mobile_number=mobile,
            otp_hash=hash_otp(mobile, otp),
            expires_at=datetime.now(timezone.utc) + timedelta(seconds=settings.otp_ttl_seconds),
            attempt_count=0,
        )
        db.add(record)
        await db.commit()
        provider.send(mobile, otp)
        response = {
            "requestId": str(record.id),
            "mobileNumber": f"XXXXXX{mobile[-4:]}",
            "expiresInSeconds": settings.otp_ttl_seconds,
            "channel": provider.name,
        }
        if provider.exposes_code:
            response["devOtp"] = otp  # development only
        return response
    except HTTPException:
        raise
    except Exception as exc:
        await log_error(service="auth.send_otp", exc=exc)
        raise HTTPException(status_code=500, detail="We could not send the verification code. Please try again.")


@router.post("/verify-otp")
async def verify_otp(payload: VerifyOtpRequest, request: Request, db: AsyncSession = Depends(get_db)):
    mobile = normalize_mobile(payload.mobile_number)
    if not valid_mobile(mobile):
        raise HTTPException(status_code=400, detail="Enter a valid 10-digit Indian mobile number.")

    record = (await db.execute(
        select(OtpVerification)
        .where(OtpVerification.mobile_number == mobile, OtpVerification.verified_at.is_(None))
        .order_by(OtpVerification.created_at.desc())
        .limit(1)
    )).scalar_one_or_none()
    if not record:
        raise HTTPException(status_code=400, detail="Request a new verification code to continue.")
    if as_aware(record.expires_at) < datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="This verification code has expired. Request a new one.")
    if record.attempt_count >= settings.otp_max_attempts:
        raise HTTPException(status_code=429, detail="Too many attempts. Request a new verification code.")

    record.attempt_count += 1
    await db.commit()

    if hash_otp(mobile, (payload.otp or "").strip()) != record.otp_hash:
        raise HTTPException(status_code=400, detail="That verification code is incorrect.")

    record.verified_at = datetime.now(timezone.utc)
    user = (await db.execute(select(User).where(User.mobile_number == mobile))).scalar_one_or_none()
    created = False
    if not user:
        user = User(mobile_number=mobile, user_type="PATIENT", status="ACTIVE")
        db.add(user)
        created = True
    if user.status != "ACTIVE":
        raise HTTPException(status_code=403, detail="This account is not active. Please contact your dialysis centre.")
    user.last_login_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(user)

    context = await account_context(db, user)
    await log_audit(
        db, user_id=user.id, action="LOGIN", entity_type="user", entity_id=str(user.id),
        ip_address=_client_ip(request), metadata={"newAccount": created, "userType": user.user_type},
    )
    return {"accessToken": create_access_token(str(user.id), user.user_type), **context}


@router.get("/session")
async def session_info(user: User = Depends(current_user), db: AsyncSession = Depends(get_db)):
    return {"userId": str(user.id), "mobileNumber": f"XXXXXX{user.mobile_number[-4:]}", **await account_context(db, user)}


@router.post("/logout")
async def logout(request: Request, user: User = Depends(current_user), db: AsyncSession = Depends(get_db)):
    await log_audit(db, user_id=user.id, action="LOGOUT", entity_type="user",
                    entity_id=str(user.id), ip_address=_client_ip(request))
    return {"success": True}
