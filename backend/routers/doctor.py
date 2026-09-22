"""Doctor endpoints. Phase 2 UI is not built yet; authorization is already enforced here."""
from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from core.sql import get_db
from models.sql_models import Doctor, DoctorPatient, MedicalReport, Patient, User
from routers.deps import authorized_patient, current_doctor, current_user
from routers.insights import insights_for_patient
from routers.patient import clinical_overview, patient_out
from services.logs import log_audit

router = APIRouter(prefix="/doctor", tags=["doctor"])


@router.get("/profile")
async def doctor_profile(doctor: Doctor = Depends(current_doctor), user: User = Depends(current_user)):
    return {
        "doctor": {"id": str(doctor.id), "name": doctor.name, "specialization": doctor.specialization,
                   "registrationNumber": doctor.registration_number, "status": doctor.status},
        "account": {"mobileNumber": f"XXXXXX{user.mobile_number[-4:]}", "userType": user.user_type},
    }


@router.get("/patients")
async def my_patients(doctor: Doctor = Depends(current_doctor), db: AsyncSession = Depends(get_db)):
    rows = (await db.execute(
        select(Patient).join(DoctorPatient, DoctorPatient.patient_id == Patient.id)
        .where(DoctorPatient.doctor_id == doctor.id, DoctorPatient.status == "ACTIVE")
        .order_by(Patient.name.asc())
    )).scalars().all()
    out = []
    for patient in rows:
        latest = (await db.execute(
            select(MedicalReport).where(MedicalReport.patient_id == patient.id)
            .order_by(MedicalReport.uploaded_at.desc()).limit(1)
        )).scalar_one_or_none()
        out.append({
            **patient_out(patient),
            "latestReportAt": latest.uploaded_at.isoformat() if latest else None,
        })
    return {"patients": out}


@router.get("/patients/{patient_id}")
async def patient_detail(
    patient_id: str,
    doctor: Doctor = Depends(current_doctor),
    user: User = Depends(current_user),
    db: AsyncSession = Depends(get_db),
):
    patient = await authorized_patient(db, doctor, patient_id)
    reports = (await db.execute(
        select(MedicalReport).where(MedicalReport.patient_id == patient.id)
        .order_by(MedicalReport.uploaded_at.desc()).limit(50)
    )).scalars().all()
    await log_audit(db, user_id=user.id, action="DOCTOR_ACCESSED_PATIENT",
                    entity_type="patient", entity_id=str(patient.id))
    return {
        "patient": patient_out(patient),
        "clinicalOverview": await clinical_overview(db, patient.id),
        "reports": [{"id": str(r.id), "reportType": r.report_type, "fileName": r.file_name,
                     "status": r.status, "uploadedAt": r.uploaded_at.isoformat()} for r in reports],
        "insights": await insights_for_patient(db, patient.id),
    }
