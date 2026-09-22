"""Dialygo clinical insights. Observational only — never presented as a diagnosis."""
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from core.db import clinical_insights
from core.sql import get_db
from models.sql_models import DialysisSession, LabResult, Patient, Vital
from routers.deps import current_patient
from services.insights import build_insights

router = APIRouter(prefix="/insights", tags=["insights"])

DISCLAIMER = (
    "Dialygo Insights are observational and decision-support only. They are generated from your "
    "uploaded reports, are unverified, and do not replace clinical assessment."
)


async def insights_for_patient(db: AsyncSession, patient_id: uuid.UUID) -> list[dict]:
    labs = (await db.execute(
        select(LabResult).where(LabResult.patient_id == patient_id)
        .order_by(LabResult.created_at.desc()).limit(60)
    )).scalars().all()
    vitals = (await db.execute(
        select(Vital).where(Vital.patient_id == patient_id).order_by(Vital.recorded_at.desc()).limit(10)
    )).scalars().all()
    session_count = (await db.execute(
        select(func.count()).select_from(DialysisSession).where(DialysisSession.patient_id == patient_id)
    )).scalar_one()

    lab_rows = [{"test_name": l.test_name, "test_value": l.test_value, "unit": l.unit,
                 "report_id": str(l.report_id) if l.report_id else None} for l in labs]
    vital_rows = [{"systolic_bp": v.systolic_bp, "diastolic_bp": v.diastolic_bp,
                   "heart_rate": v.heart_rate} for v in vitals]
    insights = build_insights(lab_rows, vital_rows, session_count)

    # Cache the generated insights in MongoDB per the approved collection design.
    now = datetime.now(timezone.utc)
    await clinical_insights.delete_many({"patient_id": str(patient_id)})
    if insights:
        await clinical_insights.insert_many([{
            "patient_id": str(patient_id),
            "source_documents": sorted({r["report_id"] for r in lab_rows if r["report_id"]}),
            "insight_type": i["insight_type"],
            "insight_text": i["insight_text"],
            "supporting_data": {**i["supporting_data"], "title": i["title"]},
            "created_at": now,
        } for i in insights])
    return insights


@router.get("")
async def my_insights(patient: Patient = Depends(current_patient), db: AsyncSession = Depends(get_db)):
    insights = await insights_for_patient(db, patient.id)
    counts = {
        "attention": sum(1 for i in insights if i["insight_type"] == "ATTENTION"),
        "monitor": sum(1 for i in insights if i["insight_type"] == "MONITOR"),
        "stable": sum(1 for i in insights if i["insight_type"] == "STABLE"),
    }
    return {"insights": insights, "counts": counts, "disclaimer": DISCLAIMER}
