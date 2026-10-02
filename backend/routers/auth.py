"""Mobile authentication: mobile number + OTP. The backend identifies the account type."""
import logging
from datetime import date, datetime, timedelta, timezone
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, model_validator
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from core.config import settings
from core.sql import get_db
from models.sql_models import Doctor, OtpVerification, Patient, StaffProfile, User
from routers.deps import current_user
from routers.patient import MasterDetails, apply_consents, apply_master_details
from services.logs import log_audit, log_error
from services.otp import consume_otp, get_otp_provider
from services.security import (
    create_access_token, hash_aadhaar, hash_otp, normalize_mobile, valid_aadhaar, valid_mobile,
)
from services.users import STAFF_TYPES, find_by_code, is_valid_email, mask_email, mask_mobile, next_user_code, normalize_email

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/auth", tags=["auth"])


UserType = Literal["PATIENT", "DOCTOR", "OPERATOR", "DIALYSIS_ADMIN", "TECH_ADMIN"]


class LoginIdentifier(BaseModel):
    """Who is signing in: a `user_code` (web) or a bare `mobile_number` (mobile app). Exactly one."""
    user_code: str | None = None
    mobile_number: str | None = None
    user_type: UserType | None = None  # web login: the workspace chosen on the login screen; must match the account

    @model_validator(mode="after")
    def _exactly_one(self):
        if bool(self.user_code and self.user_code.strip()) == bool(self.mobile_number and self.mobile_number.strip()):
            raise ValueError("Provide either user_code or mobile_number.")
        return self


class SendOtpRequest(LoginIdentifier):
    pass


class VerifyOtpRequest(LoginIdentifier):
    otp: str


class SignupRequest(MasterDetails):
    user_type: UserType
    name: str
    mobile_number: str
    otp: str  # obtained from POST /auth/send-otp; proves the caller owns the mobile number
    email: str | None = None
    # master details + consents (blood_group, emergency_contact, ...) are inherited from MasterDetails
    # PATIENT
    aadhaar_number: str | None = None
    date_of_birth: date | None = None
    gender: str | None = None
    # DOCTOR
    registration_number: str | None = None
    specialization: str | None = None
    # OPERATOR / admins
    designation: str | None = None
    unit: str | None = None


def _client_ip(request: Request) -> str | None:
    forwarded = request.headers.get("x-forwarded-for")
    return forwarded.split(",")[0].strip() if forwarded else (request.client.host if request.client else None)


async def resolve_login_mobile(db: AsyncSession, payload: LoginIdentifier) -> tuple[str, User | None]:
    """Resolve the login identifier to the mobile number the OTP is bound to.

    A user_code must belong to an existing ACTIVE account (of `user_type`, when given). A bare mobile number is validated only;
    the account is looked up (or created) after the OTP is verified.
    """
    if payload.user_code:
        user = await find_by_code(db, payload.user_code)
        if not user or (payload.user_type and user.user_type != payload.user_type):
            raise HTTPException(status_code=404, detail="We could not find an account for that user ID and account type.")
        if user.status != "ACTIVE":
            raise HTTPException(status_code=403, detail="This account is not active. Please contact your dialysis centre.")
        return user.mobile_number, user
    mobile = normalize_mobile(payload.mobile_number)
    if not valid_mobile(mobile):
        raise HTTPException(status_code=400, detail="Enter a valid 10-digit Indian mobile number.")
    return mobile, None


async def account_context(db: AsyncSession, user: User) -> dict:
    """Drives post-login routing in both clients. No role selection is ever exposed."""
    base = {"userCode": user.user_code}
    if user.user_type == "DOCTOR":
        doctor = (await db.execute(select(Doctor).where(Doctor.user_id == user.id))).scalar_one_or_none()
        return {
            **base,
            "userType": "DOCTOR",
            "registrationRequired": doctor is None,
            "profile": {"id": str(doctor.id), "name": doctor.name, "specialization": doctor.specialization} if doctor else None,
        }
    if user.user_type in STAFF_TYPES:
        staff = (await db.execute(select(StaffProfile).where(StaffProfile.user_id == user.id))).scalar_one_or_none()
        return {
            **base,
            "userType": user.user_type,
            "registrationRequired": False,
            "profile": {"id": str(staff.id), "name": staff.name, "designation": staff.designation,
                        "unit": staff.unit} if staff else None,
        }
    patient = (await db.execute(select(Patient).where(Patient.user_id == user.id))).scalar_one_or_none()
    return {
        **base,
        "userType": "PATIENT",
        "registrationRequired": patient is None,
        "profile": {
            "id": str(patient.id),
            "name": patient.name,
            "patientIdentifier": patient.patient_identifier,
        } if patient else None,
    }


@router.post("/send-otp")
async def send_otp(payload: SendOtpRequest, db: AsyncSession = Depends(get_db)):
    mobile, user = await resolve_login_mobile(db, payload)
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
            "mobileNumber": mask_mobile(mobile),
            "email": mask_email(user.email) if user else None,
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
    mobile, user = await resolve_login_mobile(db, payload)
    await consume_otp(db, mobile, payload.otp)
    user = user or (await db.execute(select(User).where(User.mobile_number == mobile))).scalar_one_or_none()
    created = False
    if not user:
        user = User(user_code=await next_user_code(db, "PATIENT"), mobile_number=mobile,
                    user_type="PATIENT", status="ACTIVE")
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


@router.post("/signup", status_code=201)
async def signup(payload: SignupRequest, request: Request, db: AsyncSession = Depends(get_db)):
    """Register any account type. Requires an OTP for the mobile number (see /auth/send-otp).

    Patients are activated immediately and receive an access token. Doctors, operators and admins are
    created as PENDING_APPROVAL and cannot sign in until an administrator activates the account.
    """
    mobile = normalize_mobile(payload.mobile_number)
    if not valid_mobile(mobile):
        raise HTTPException(status_code=400, detail="Enter a valid 10-digit Indian mobile number.")
    name = (payload.name or "").strip()
    if len(name) < 2:
        raise HTTPException(status_code=400, detail="Enter your full name.")
    email = normalize_email(payload.email)
    if email and not is_valid_email(email):
        raise HTTPException(status_code=400, detail="Enter a valid email address.")

    utype = payload.user_type
    registration_number = (payload.registration_number or "").strip() or None
    aadhaar_hash = None
    if utype == "PATIENT":
        if not valid_aadhaar(payload.aadhaar_number or ""):
            raise HTTPException(status_code=400, detail="Enter a valid 12-digit Aadhaar number.")
        aadhaar_hash = hash_aadhaar(payload.aadhaar_number)
    elif utype == "DOCTOR" and not registration_number:
        raise HTTPException(status_code=400, detail="Enter your medical registration number.")

    # Build the user and validate the master details before the OTP is consumed, so a typo does not burn the code.
    active = utype == "PATIENT"
    user = User(mobile_number=mobile, email=email, user_type=utype, status="ACTIVE" if active else "PENDING_APPROVAL")
    apply_master_details(user, payload)
    apply_consents(user, payload, datetime.now(timezone.utc))

    await consume_otp(db, mobile, payload.otp)

    async def taken(column, value) -> bool:
        return value is not None and (await db.execute(select(column).where(column == value).limit(1))).first() is not None

    if await taken(User.mobile_number, mobile):
        raise HTTPException(status_code=409, detail="An account already exists for this mobile number. Sign in instead.")
    if await taken(User.email, email):
        raise HTTPException(status_code=409, detail="An account already exists for this email address.")
    if await taken(Patient.aadhaar_hash, aadhaar_hash):
        raise HTTPException(status_code=409, detail="A patient profile already exists for this Aadhaar number.")
    if await taken(Doctor.registration_number, registration_number):
        raise HTTPException(status_code=409, detail="A doctor with this registration number already exists.")

    try:
        user.user_code = await next_user_code(db, utype)
        db.add(user)
        await db.flush()
        if utype == "PATIENT":
            db.add(Patient(user_id=user.id, patient_identifier=f"DG-{aadhaar_hash[:8].upper()}{payload.aadhaar_number[-4:]}",
                           name=name, date_of_birth=payload.date_of_birth, gender=payload.gender,
                           aadhaar_hash=aadhaar_hash))
        elif utype == "DOCTOR":
            db.add(Doctor(user_id=user.id, name=name, specialization=(payload.specialization or "").strip() or None,
                          registration_number=registration_number, status="ACTIVE"))
        else:
            db.add(StaffProfile(user_id=user.id, name=name, designation=(payload.designation or "").strip() or None,
                                unit=(payload.unit or "").strip() or None))
        if active:
            user.last_login_at = datetime.now(timezone.utc)
        await db.commit()
        await db.refresh(user)
    except IntegrityError:
        await db.rollback()
        raise HTTPException(status_code=409, detail="An account with these details already exists.")
    except Exception as exc:
        await db.rollback()
        await log_error(service="auth.signup", exc=exc)
        raise HTTPException(status_code=500, detail="We could not create your account. Please try again.")

    await log_audit(db, user_id=user.id, action="SIGNUP", entity_type="user", entity_id=str(user.id),
                    ip_address=_client_ip(request), metadata={"userType": utype, "status": user.status})
    result = {"userId": str(user.id), "userCode": user.user_code, "userType": utype, "status": user.status}
    if not active:
        return {**result, "message": "Your account is pending approval. You will be able to sign in once it is activated."}
    return {**result, "accessToken": create_access_token(str(user.id), utype), **await account_context(db, user)}


@router.get("/session")
async def session_info(user: User = Depends(current_user), db: AsyncSession = Depends(get_db)):
    return {"userId": str(user.id), "mobileNumber": mask_mobile(user.mobile_number), **await account_context(db, user)}


@router.post("/logout")
async def logout(request: Request, user: User = Depends(current_user), db: AsyncSession = Depends(get_db)):
    await log_audit(db, user_id=user.id, action="LOGOUT", entity_type="user",
                    entity_id=str(user.id), ip_address=_client_ip(request))
    return {"success": True}
