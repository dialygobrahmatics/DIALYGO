"""Seeds demo mobile accounts so the Phase-1 patient journey is testable end-to-end.

Idempotent. Run: python -m scripts.seed_mobile
"""
import asyncio
import sys
from datetime import date, datetime, timedelta, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from sqlalchemy import select  # noqa: E402

from core.sql import SessionLocal  # noqa: E402
from models.sql_models import (  # noqa: E402
    DialysisSession, Doctor, DoctorPatient, LabResult, Patient, StaffProfile, User, Vital,
)
from services.security import hash_aadhaar  # noqa: E402

NOW = datetime.now(timezone.utc)

PATIENT = {
    "code": "DUR-PT-00218",
    "email": "ravi.kumar@example.com",
    "mobile": "9876543210",
    "name": "Ravi Kumar",
    "aadhaar": "123456789012",
    "dob": date(1971, 4, 12),
    "gender": "Male",
    "master": {"blood_group": "B+", "emergency_contact": "Sunita Kumar (spouse) - 98765 43299",
               "known_allergies": "Penicillin", "occupation": "Retired schoolteacher"},
    "consents": {"consent_data_sharing": True, "consent_privacy_notice": True, "consent_research": False},
}
DOCTOR = {"code": "DOC-0071", "email": "gireesh.reddy@example.com", "mobile": "9876500001", "name": "DR. Gireesh Reddy", "specialization": "Nephrology", "reg": "TSMC-44102"}

# Extra demo accounts matching the IDs offered on the web login screen.
EXTRA_DOCTOR = {"code": "DOC-0088", "email": "p.deshmukh@example.com", "mobile": "9876500002",
                "name": "Dr. P. Deshmukh", "specialization": "Nephrology", "reg": "TSMC-44215"}
EXTRA_PATIENT = {"code": "DUR-PT-00341", "email": "demo.patient2@example.com", "mobile": "9876543211",
                 "name": "Meera Nair", "aadhaar": "234567890123", "dob": date(1964, 9, 3), "gender": "Female"}
STAFF = [
    {"code": "OPR-1041", "type": "OPERATOR", "mobile": "9876510041", "name": "S. Kulkarni",
     "designation": "Senior Dialysis Technician", "unit": "Nephro Unit B"},
    {"code": "OPR-2276", "type": "OPERATOR", "mobile": "9876512276", "name": "R. Menon",
     "designation": "Dialysis Procedure Operator", "unit": "Nephro Unit A"},
    {"code": "OPR-3390", "type": "OPERATOR", "mobile": "9876513390", "name": "A. Fernandes",
     "designation": "Charge Nurse - Dialysis", "unit": "Critical Care Dialysis"},
    {"code": "ADM-0002", "type": "DIALYSIS_ADMIN", "mobile": "9876520002", "name": "Dr. K. Sharma",
     "designation": "Dialysis Unit Administrator", "unit": "Dialysis Services"},
    {"code": "ADM-0001", "type": "TECH_ADMIN", "mobile": "9876520001", "name": "P. Raghavan",
     "designation": "Technical Administrator", "unit": "DialyGo Platform Operations"},
]

LABS = [
    ("Haemoglobin", "10.2", "g/dL", "12.0 - 16.0"),
    ("Potassium", "5.4", "mmol/L", "3.5 - 5.1"),
    ("Creatinine", "7.8", "mg/dL", "0.6 - 1.3"),
    ("Urea", "112", "mg/dL", "17 - 43"),
    ("Calcium", "8.9", "mg/dL", "8.5 - 10.5"),
    ("Phosphate", "5.8", "mg/dL", "2.5 - 4.5"),
]


async def upsert_user(db, mobile: str, user_type: str, code: str, email: str | None) -> User:
    user = (await db.execute(select(User).where(User.mobile_number == mobile))).scalar_one_or_none()
    if not user:
        user = User(user_code=code, mobile_number=mobile, email=email, user_type=user_type, status="ACTIVE")
        db.add(user)
        await db.flush()
    elif user.user_code != code or user.email != email:
        # Keep demo accounts aligned with the IDs shown in the web UI.
        user.user_code, user.email = code, email
        await db.flush()
    return user


async def upsert_patient(db, spec: dict) -> Patient:
    user = await upsert_user(db, spec["mobile"], "PATIENT", spec["code"], spec["email"])
    if spec.get("master") and user.consents_updated_at is None:  # first seed only: never overwrite later edits
        for field, value in {**spec["master"], **spec.get("consents", {})}.items():
            setattr(user, field, value)
        user.consents_updated_at = NOW
    patient = (await db.execute(select(Patient).where(Patient.user_id == user.id))).scalar_one_or_none()
    if not patient:
        aadhaar_hash = hash_aadhaar(spec["aadhaar"])
        patient = Patient(
            user_id=user.id,
            patient_identifier=f"DG-{aadhaar_hash[:8].upper()}{spec['aadhaar'][-4:]}",
            name=spec["name"], date_of_birth=spec["dob"], gender=spec["gender"], aadhaar_hash=aadhaar_hash,
        )
        db.add(patient)
        await db.flush()
    return patient


async def upsert_doctor(db, spec: dict) -> Doctor:
    user = await upsert_user(db, spec["mobile"], "DOCTOR", spec["code"], spec["email"])
    doctor = (await db.execute(select(Doctor).where(Doctor.user_id == user.id))).scalar_one_or_none()
    if not doctor:
        doctor = Doctor(user_id=user.id, name=spec["name"], specialization=spec["specialization"],
                        registration_number=spec["reg"], status="ACTIVE")
        db.add(doctor)
        await db.flush()
    return doctor


async def upsert_staff(db, spec: dict) -> None:
    user = await upsert_user(db, spec["mobile"], spec["type"], spec["code"], spec.get("email"))
    exists = (await db.execute(select(StaffProfile).where(StaffProfile.user_id == user.id))).scalar_one_or_none()
    if not exists:
        db.add(StaffProfile(user_id=user.id, name=spec["name"], designation=spec["designation"], unit=spec["unit"]))
        await db.flush()


async def main():
    async with SessionLocal() as db:
        patient = await upsert_patient(db, PATIENT)
        doctor = await upsert_doctor(db, DOCTOR)
        await upsert_patient(db, EXTRA_PATIENT)
        await upsert_doctor(db, EXTRA_DOCTOR)
        for spec in STAFF:
            await upsert_staff(db, spec)

        link = (await db.execute(select(DoctorPatient).where(
            DoctorPatient.doctor_id == doctor.id, DoctorPatient.patient_id == patient.id))).scalar_one_or_none()
        if not link:
            db.add(DoctorPatient(doctor_id=doctor.id, patient_id=patient.id, status="ACTIVE", assigned_at=NOW))

        has_sessions = (await db.execute(select(DialysisSession).where(
            DialysisSession.patient_id == patient.id).limit(1))).scalar_one_or_none()
        if not has_sessions:
            for offset in (-5, -2, 2, 5):
                db.add(DialysisSession(
                    patient_id=patient.id,
                    session_date=date.today() + timedelta(days=offset),
                    start_time=NOW + timedelta(days=offset),
                    end_time=NOW + timedelta(days=offset, hours=4),
                    status="COMPLETED" if offset < 0 else "SCHEDULED",
                    dialysis_center="Dialygo Care Centre, Hyderabad",
                ))

        has_labs = (await db.execute(select(LabResult).where(
            LabResult.patient_id == patient.id).limit(1))).scalar_one_or_none()
        if not has_labs:
            for name, value, unit, ref in LABS:
                db.add(LabResult(patient_id=patient.id, test_name=name, test_value=value,
                                 unit=unit, reference_range=ref, test_date=date.today() - timedelta(days=3)))
            db.add(Vital(patient_id=patient.id, recorded_at=NOW - timedelta(days=3),
                         systolic_bp=138, diastolic_bp=82, heart_rate=78, weight=62.5, temperature=36.8))

        await db.commit()
        print(f"Seeded demo accounts. Patient {patient.name} ({PATIENT['mobile']}) and doctor {doctor.name} ({DOCTOR['mobile']})")


if __name__ == "__main__":
    asyncio.run(main())
