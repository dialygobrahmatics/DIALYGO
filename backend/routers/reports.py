"""Mobile report endpoints."""
import hashlib
import logging
import uuid
from datetime import datetime, timezone

from bson import ObjectId
from fastapi import APIRouter, BackgroundTasks, Depends, File, Form, HTTPException, UploadFile
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from core.db import medical_documents, ocr_results
from core.sql import get_db
from models.sql_models import MedicalReport, Patient, User
from routers.deps import current_patient, current_user
from services.classifier import get_checker
from services.logs import log_audit, log_error
from services.ocr import sample_text
from services.report_pipeline import ALLOWED_MIME, REPORT_TYPES, report_out, run_report_ocr, utcnow
from services.storage import get_storage

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/reports", tags=["reports"])

MAX_BYTES = 20 * 1024 * 1024
REJECTION_MESSAGE = (
    "This document does not appear to be a medical report. Please upload a valid medical report."
)


@router.post("/upload")
async def upload_report(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    report_type: str = Form("OTHER"),
    patient: Patient = Depends(current_patient),
    user: User = Depends(current_user),
    db: AsyncSession = Depends(get_db),
):
    if file.content_type not in ALLOWED_MIME:
        raise HTTPException(status_code=415, detail="Unsupported file. Upload a PDF, JPG, PNG or WebP.")
    report_type = (report_type or "OTHER").upper()
    if report_type not in REPORT_TYPES:
        raise HTTPException(status_code=400, detail="Select a valid report type.")

    data = await file.read()
    if not data:
        raise HTTPException(status_code=400, detail="The selected file is empty.")
    if len(data) > MAX_BYTES:
        raise HTTPException(status_code=413, detail="File is larger than the 20 MB limit.")
    if file.content_type == "application/pdf" and not data.startswith(b"%PDF"):
        raise HTTPException(status_code=415, detail="File content does not match a PDF.")

    # Medical-report validation runs before the file is stored or fully processed.
    try:
        verdict = get_checker().check(sample_text(data, file.content_type))
    except Exception as exc:
        await log_error(service="reports.validation", exc=exc, user_id=user.id)
        verdict = {"accepted": True, "reason": "medical_document"}

    if not verdict["accepted"]:
        rejected = MedicalReport(
            patient_id=patient.id, document_id="-", report_type=report_type,
            file_name=file.filename, file_type=file.content_type, status="REJECTED",
            uploaded_at=utcnow(),
        )
        db.add(rejected)
        await db.commit()
        await log_audit(db, user_id=user.id, action="REPORT_REJECTED", entity_type="medical_report",
                        entity_id=str(rejected.id), metadata={"reason": verdict["reason"]})
        raise HTTPException(status_code=422, detail={
            "accepted": False, "reason": verdict["reason"], "message": REJECTION_MESSAGE,
        })

    doc_oid = ObjectId()
    document_id = str(doc_oid)
    key = f"patients/{patient.id}/{document_id}.{ALLOWED_MIME[file.content_type]}"
    try:
        get_storage().put(key, data)
    except Exception as exc:
        await log_error(service="reports.storage", exc=exc, user_id=user.id)
        raise HTTPException(status_code=500, detail="We could not save your report. Please try again.")

    now = utcnow()
    try:
        report = MedicalReport(
            patient_id=patient.id, document_id=document_id, report_type=report_type,
            file_name=file.filename, file_type=file.content_type, status="UPLOADED", uploaded_at=now,
        )
        db.add(report)
        await db.commit()
        await db.refresh(report)

        await medical_documents.insert_one({
            "_id": doc_oid,
            "document_id": document_id,
            "patient_id": str(patient.id),
            "report_type": report_type,
            "file_metadata": {
                "file_name": file.filename, "mime_type": file.content_type,
                "size_bytes": len(data), "checksum_sha256": hashlib.sha256(data).hexdigest(),
                "page_count": None,
            },
            "storage_reference": key,
            "uploaded_at": now,
        })
        await ocr_results.insert_one({
            "document_id": document_id,
            "patient_id": str(patient.id),
            "extracted_text": None,
            "extracted_fields": {},
            "processing_status": "QUEUED",
            "processed_at": None,
            "engine": None,
            "warnings": [],
            "error": None,
            "created_at": now,
        })
    except Exception as exc:
        await log_error(service="reports.upload", exc=exc, user_id=user.id)
        raise HTTPException(status_code=500, detail="We could not register your report. Please try again.")

    await log_audit(db, user_id=user.id, action="REPORT_UPLOADED", entity_type="medical_report",
                    entity_id=str(report.id), metadata={"reportType": report_type})
    background_tasks.add_task(run_report_ocr, document_id, str(patient.id), str(report.id), key, file.content_type)
    return {"report": report_out(report), "documentId": document_id, "status": "UPLOADED"}


@router.get("")
async def list_reports(patient: Patient = Depends(current_patient), db: AsyncSession = Depends(get_db)):
    rows = (await db.execute(
        select(MedicalReport).where(MedicalReport.patient_id == patient.id)
        .order_by(MedicalReport.uploaded_at.desc()).limit(200)
    )).scalars().all()
    return {"reports": [report_out(r) for r in rows]}


async def _owned_report(db: AsyncSession, patient: Patient, report_id: str) -> MedicalReport:
    try:
        report = await db.get(MedicalReport, uuid.UUID(report_id))
    except (ValueError, AttributeError):
        raise HTTPException(status_code=404, detail="Report not found.")
    if not report or report.patient_id != patient.id:
        raise HTTPException(status_code=404, detail="Report not found.")
    return report


@router.get("/{report_id}")
async def get_report(
    report_id: str,
    patient: Patient = Depends(current_patient),
    user: User = Depends(current_user),
    db: AsyncSession = Depends(get_db),
):
    report = await _owned_report(db, patient, report_id)
    doc = await medical_documents.find_one({"document_id": report.document_id})
    await log_audit(db, user_id=user.id, action="REPORT_VIEWED", entity_type="medical_report", entity_id=report_id)
    return {
        "report": report_out(report),
        "fileMetadata": (doc or {}).get("file_metadata"),
    }


@router.get("/{report_id}/ocr")
async def get_report_ocr(
    report_id: str,
    patient: Patient = Depends(current_patient),
    db: AsyncSession = Depends(get_db),
):
    report = await _owned_report(db, patient, report_id)
    result = await ocr_results.find_one({"document_id": report.document_id})
    if not result:
        return {"status": report.status, "extractedText": "", "extractedFields": {}, "unverified": True}
    return {
        "status": result.get("processing_status"),
        "extractedText": result.get("extracted_text") or "",
        "extractedFields": result.get("extracted_fields") or {},
        "engine": result.get("engine"),
        "warnings": result.get("warnings") or [],
        "error": (result.get("error") or {}).get("message"),
        "processedAt": result["processed_at"].isoformat() if result.get("processed_at") else None,
        "unverified": True,
    }
