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
    DialysisSession, Doctor, DoctorPatient, LabResult, Patient, User, Vital,
)
from services.security import hash_aadhaar  # noqa: E402

NOW = datetime.now(timezone.utc)

PATIENT = {
    "mobile": "9876543210",
    "name": "Ravi Kumar",
    "aadhaar": "123456789012",
    "dob": date(1971, 4, 12),
    "gender": "Male",
}
DOCTOR = {"mobile": "9876500001", "name": "DR. Gireesh Reddy", "specialization": "Nephrology", "reg": "TSMC-44102"}

LABS = [
    ("Haemoglobin", "10.2", "g/dL", "12.0 - 16.0"),
    ("Potassium", "5.4", "mmol/L", "3.5 - 5.1"),
    ("Creatinine", "7.8", "mg/dL", "0.6 - 1.3"),
    ("Urea", "112", "mg/dL", "17 - 43"),
    ("Calcium", "8.9", "mg/dL", "8.5 - 10.5"),
    ("Phosphate", "5.8", "mg/dL", "2.5 - 4.5"),
]


async def upsert_user(db, mobile: str, user_type: str) -> User:
    user = (await db.execute(select(User).where(User.mobile_number == mobile))).scalar_one_or_none()
    if not user:
        user = User(mobile_number=mobile, user_type=user_type, status="ACTIVE")
        db.add(user)
        await db.flush()
    return user


async def main():
    async with SessionLocal() as db:
        puser = await upsert_user(db, PATIENT["mobile"], "PATIENT")
        aadhaar_hash = hash_aadhaar(PATIENT["aadhaar"])
        patient = (await db.execute(select(Patient).where(Patient.user_id == puser.id))).scalar_one_or_none()
        if not patient:
            patient = Patient(
                user_id=puser.id,
                patient_identifier=f"DG-{aadhaar_hash[:8].upper()}{PATIENT['aadhaar'][-4:]}",
                name=PATIENT["name"], date_of_birth=PATIENT["dob"], gender=PATIENT["gender"],
                aadhaar_hash=aadhaar_hash,
            )
            db.add(patient)
            await db.flush()

        duser = await upsert_user(db, DOCTOR["mobile"], "DOCTOR")
        doctor = (await db.execute(select(Doctor).where(Doctor.user_id == duser.id))).scalar_one_or_none()
        if not doctor:
            doctor = Doctor(user_id=duser.id, name=DOCTOR["name"], specialization=DOCTOR["specialization"],
                            registration_number=DOCTOR["reg"], status="ACTIVE")
            db.add(doctor)
            await db.flush()

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
        print(f"Seeded patient {patient.name} ({PATIENT['mobile']}) and doctor {doctor.name} ({DOCTOR['mobile']})")


if __name__ == "__main__":
    asyncio.run(main())
