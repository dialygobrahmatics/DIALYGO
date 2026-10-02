"""Patient registration, profile and dashboard. Patients can only ever read their own data."""
import logging
import uuid
from datetime import date, datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, Field
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from core.sql import get_db
from models.sql_models import DialysisSession, LabResult, MedicalReport, Patient, User, Vital
from routers.deps import current_patient, current_user
from services.logs import log_audit, log_error
from services.security import hash_aadhaar, mask_aadhaar, normalize_mobile, valid_aadhaar, valid_mobile
from services.users import is_valid_email, mask_mobile, normalize_email

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/patient", tags=["patient"])


class RegisterRequest(BaseModel):
    name: str
    aadhaar_number: str
    date_of_birth: date | None = None
    gender: str | None = None


BLOOD_GROUPS = {"A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"}
CONSENT_FIELDS = ("consent_data_sharing", "consent_privacy_notice", "consent_research")
# field -> max length of the free-text master details on `users`
TEXT_DETAILS = {"emergency_contact": 255, "known_allergies": 2000, "occupation": 150}


class MasterDetails(BaseModel):
    """Profile master details and consents stored on `users`. Shared by profile update and signup.

    Omitted fields are left unchanged; an empty string clears a text detail.
    """
    blood_group: str | None = Field(
        None, description="ABO/Rh group, case-insensitive: A+, A-, B+, B-, AB+, AB-, O+ or O-. Empty string clears it.",
        examples=["B+"])
    emergency_contact: str | None = Field(
        None, description="Free text, name and number (max 255 characters). Empty string clears it.",
        examples=["Sunita Kumar (spouse) - 98765 43299"])
    known_allergies: str | None = Field(
        None, description="Free text (max 2000 characters). Empty string clears it.", examples=["Penicillin"])
    occupation: str | None = Field(
        None, description="Free text (max 150 characters). Empty string clears it.", examples=["Retired schoolteacher"])
    consent_data_sharing: bool | None = Field(
        None, description="DPDP consent to share personal, medical and clinical data for dialysis care.")
    consent_privacy_notice: bool | None = Field(
        None, description="Acceptance of the privacy notice and decision-support disclaimer.")
    consent_research: bool | None = Field(
        None, description="Optional consent to use de-identified data for service improvement.")


class UpdateProfileRequest(MasterDetails):
    """Partial update of the signed-in patient's profile: send only the fields to change."""
    name: str | None = Field(None, description="Full name, at least 2 characters.", examples=["Ravi Kumar"])
    date_of_birth: date | None = Field(None, description="ISO date (YYYY-MM-DD).", examples=["1971-04-12"])
    gender: str | None = Field(None, description="Free text, e.g. Male, Female, Other.", examples=["Male"])
    email: str | None = Field(
        None, description="Contact email, stored lower-case and unique across accounts (409 if taken). Empty string "
                          "removes it. Not verified yet: no email delivery service exists.",
        examples=["ravi.kumar@example.com"])
    mobile_number: str | None = Field(
        None, description="New registered mobile number (10-digit Indian number). It is also the sign-in number, and "
                          "no OTP is required for this change (backend/development use). 409 if it belongs to "
                          "another account; ignored if it equals the current number.",
        examples=["9876543299"])

    model_config = {"json_schema_extra": {"example": {
        "name": "Ravi Kumar", "date_of_birth": "1971-04-12", "gender": "Male", "email": "ravi.kumar@example.com",
        "mobile_number": "9876543299", "blood_group": "B+",
        "emergency_contact": "Sunita Kumar (spouse) - 98765 43299", "known_allergies": "Penicillin",
        "occupation": "Retired schoolteacher", "consent_data_sharing": True, "consent_privacy_notice": True,
        "consent_research": False}}}


class PatientOut(BaseModel):
    id: str
    patientIdentifier: str
    name: str
    dateOfBirth: str | None
    age: int | None
    gender: str | None
    aadhaarMasked: str = Field(description="Only the last 4 digits; the full Aadhaar number is never returned.")
    createdAt: str | None


class AccountOut(BaseModel):
    userCode: str = Field(description="Login ID shown in the UI, e.g. DUR-PT-00218.")
    mobileNumber: str = Field(description="The signed-in patient's own 10-digit mobile number (unmasked).")
    email: str | None = Field(description="The signed-in patient's own email address, if one is on file.")
    userType: str
    lastLoginAt: str | None


class DetailsOut(BaseModel):
    bloodGroup: str | None
    emergencyContact: str | None
    knownAllergies: str | None
    occupation: str | None


class ConsentsOut(BaseModel):
    dataSharing: bool
    privacyNotice: bool
    research: bool
    updatedAt: str | None = Field(description="When any consent last changed.")


class ProfileResponse(BaseModel):
    patient: PatientOut
    account: AccountOut
    details: DetailsOut
    consents: ConsentsOut


PROFILE_ERRORS = {
    401: {"description": "Missing, expired or invalid token."},
    403: {"description": "The account is not a patient account."},
    404: {"description": "The patient has not completed registration (POST /patient/register)."},
}


def apply_master_details(user: User, details: MasterDetails) -> None:
    """Validate and copy the master details onto the user (caller commits). Raises 400 on invalid values."""
    if details.blood_group is not None:
        blood_group = details.blood_group.strip().upper()
        if blood_group and blood_group not in BLOOD_GROUPS:
            raise HTTPException(status_code=400, detail="Blood group must be one of " + ", ".join(sorted(BLOOD_GROUPS)) + ".")
        user.blood_group = blood_group or None
    for field, max_length in TEXT_DETAILS.items():
        value = getattr(details, field)
        if value is None:
            continue
        value = value.strip()
        if len(value) > max_length:
            raise HTTPException(status_code=400, detail=f"{field.replace('_', ' ').capitalize()} is too long (max {max_length} characters).")
        setattr(user, field, value or None)


def apply_consents(user: User, details: MasterDetails, now: datetime) -> dict[str, bool]:
    """Copy changed consent flags onto the user and stamp the time. Returns {flag: new value} for what changed."""
    changes = {f: getattr(details, f) for f in CONSENT_FIELDS
               if getattr(details, f) is not None and getattr(details, f) != getattr(user, f)}
    for field, value in changes.items():
        setattr(user, field, value)
    if changes:
        user.consents_updated_at = now
    return changes


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


def profile_out(patient: Patient, user: User) -> dict:
    """Everything the profile page shows. The owner sees their own contact details; Aadhaar is never returned."""
    return {
        "patient": patient_out(patient),
        "account": {
            "userCode": user.user_code,
            "mobileNumber": user.mobile_number,
            "email": user.email,
            "userType": user.user_type,
            "lastLoginAt": user.last_login_at.isoformat() if user.last_login_at else None,
        },
        "details": {
            "bloodGroup": user.blood_group,
            "emergencyContact": user.emergency_contact,
            "knownAllergies": user.known_allergies,
            "occupation": user.occupation,
        },
        "consents": {
            "dataSharing": user.consent_data_sharing,
            "privacyNotice": user.consent_privacy_notice,
            "research": user.consent_research,
            "updatedAt": user.consents_updated_at.isoformat() if user.consents_updated_at else None,
        },
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


@router.get("/profile", response_model=ProfileResponse, summary="Get my profile", responses=PROFILE_ERRORS)
async def get_profile(patient: Patient = Depends(current_patient), user: User = Depends(current_user)):
    return profile_out(patient, user)


async def _taken(db: AsyncSession, column, value, owner: User) -> bool:
    """True when another user already has `value` in the unique `column`."""
    return (await db.execute(select(User.id).where(column == value, User.id != owner.id).limit(1))).first() is not None


async def _apply_contact_changes(db: AsyncSession, user: User, payload: UpdateProfileRequest) -> set[str]:
    """Apply a changed email and/or mobile number (caller commits). Returns which of them changed."""
    changed: set[str] = set()
    if payload.email is not None:
        email = normalize_email(payload.email)
        if email and not is_valid_email(email):
            raise HTTPException(status_code=400, detail="Enter a valid email address.")
        if email != user.email:
            if email and await _taken(db, User.email, email, user):
                raise HTTPException(status_code=409, detail="An account already exists for this email address.")
            user.email = email
            changed.add("email")

    if payload.mobile_number is not None:
        mobile = normalize_mobile(payload.mobile_number)
        if not valid_mobile(mobile):
            raise HTTPException(status_code=400, detail="Enter a valid 10-digit Indian mobile number.")
        if mobile != user.mobile_number:
            if await _taken(db, User.mobile_number, mobile, user):
                raise HTTPException(status_code=409, detail="An account already exists for this mobile number.")
            user.mobile_number = mobile
            changed.add("mobile_number")
    return changed


@router.patch(
    "/profile",
    response_model=ProfileResponse,
    summary="Update my profile",
    description="Partial update: only the fields sent are changed, and an empty string clears a text detail. "
                "Consent, mobile and email changes are audit-logged; changing the mobile number needs no OTP. User code, Aadhaar, account type and status cannot be "
                "changed here. Returns the full updated profile.",
    responses={
        **PROFILE_ERRORS,
        400: {"description": "Invalid name, email, mobile number or blood group, or a text field that is too long."},
        409: {"description": "The email or mobile number already belongs to another account."},
    },
)
async def update_profile(
    payload: UpdateProfileRequest,
    patient: Patient = Depends(current_patient),
    user: User = Depends(current_user),
    db: AsyncSession = Depends(get_db),
):
    now = datetime.now(timezone.utc)
    if payload.name is not None:
        name = payload.name.strip()
        if len(name) < 2:
            raise HTTPException(status_code=400, detail="Enter your full name.")
        patient.name = name
    if payload.date_of_birth is not None:
        patient.date_of_birth = payload.date_of_birth
    if payload.gender is not None:
        patient.gender = payload.gender

    apply_master_details(user, payload)
    consent_changes = apply_consents(user, payload, now)
    old_mobile = user.mobile_number
    contact_changes = await _apply_contact_changes(db, user, payload)

    patient.updated_at = user.updated_at = now
    try:
        await db.commit()
    except IntegrityError:  # lost a race for a unique mobile number / email
        await db.rollback()
        raise HTTPException(status_code=409, detail="That mobile number or email is already in use.")
    await db.refresh(patient)
    await db.refresh(user)
    await log_audit(db, user_id=user.id, action="PROFILE_UPDATED", entity_type="patient", entity_id=str(patient.id))
    if "mobile_number" in contact_changes:
        await log_audit(db, user_id=user.id, action="MOBILE_CHANGED", entity_type="user", entity_id=str(user.id),
                        metadata={"from": mask_mobile(old_mobile), "to": mask_mobile(user.mobile_number)})
    if "email" in contact_changes:
        await log_audit(db, user_id=user.id, action="EMAIL_CHANGED", entity_type="user", entity_id=str(user.id))
    if consent_changes:
        await log_audit(db, user_id=user.id, action="CONSENT_UPDATED", entity_type="user", entity_id=str(user.id),
                        metadata={f.removeprefix("consent_"): v for f, v in consent_changes.items()})
    return profile_out(patient, user)


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
