"""Mobile medical-report pipeline: upload -> validation -> OCR -> extraction.

PostgreSQL holds `medical_reports` metadata. MongoDB holds `medical_documents` and
`ocr_results`. Storage, OCR and the medical-document check are the existing Dialygo services.
"""
import logging
import uuid
from datetime import datetime, timezone

from bson import ObjectId
from sqlalchemy import select

from core.db import medical_documents, ocr_results
from core.sql import SessionLocal
from models.sql_models import LabResult, MedicalReport, Vital
from services.extraction import extract_fields
from services.logs import log_error
from services.ocr import get_engine
from services.storage import get_storage

logger = logging.getLogger(__name__)

REPORT_TYPES = {
    "LAB_REPORT", "DIALYSIS_REPORT", "VASCULAR_DOPPLER", "PRESCRIPTION",
    "DISCHARGE_SUMMARY", "CLINICAL_NOTE", "OTHER",
}

ALLOWED_MIME = {
    "application/pdf": "pdf",
    "image/png": "png",
    "image/jpeg": "jpg",
    "image/webp": "webp",
}


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


def report_out(report: MedicalReport) -> dict:
    return {
        "id": str(report.id),
        "documentId": report.document_id,
        "reportType": report.report_type,
        "fileName": report.file_name,
        "fileType": report.file_type,
        "status": report.status,
        "uploadedAt": report.uploaded_at.isoformat() if report.uploaded_at else None,
        "processedAt": report.processed_at.isoformat() if report.processed_at else None,
    }


async def run_report_ocr(document_id: str, patient_id: str, report_id: str, storage_key: str, mime_type: str):
    """Background OCR. Only identifiers and status are logged — never document content."""
    now = utcnow()
    await ocr_results.update_one(
        {"document_id": document_id},
        {"$set": {"processing_status": "PROCESSING", "started_at": now}},
    )
    async with SessionLocal() as db:
        report = await db.get(MedicalReport, uuid.UUID(report_id))
        if report:
            report.status = "PROCESSING"
            await db.commit()

    try:
        data = get_storage().get(storage_key)
        result = get_engine().run(data, mime_type)
        fields = extract_fields(result.text)
        finished = utcnow()
        await ocr_results.update_one(
            {"document_id": document_id},
            {"$set": {
                "processing_status": "COMPLETED",
                "extracted_text": result.text,
                "extracted_fields": fields,
                "engine": result.engine,
                "engine_version": result.engine_version,
                "warnings": result.warnings,
                "page_count": result.page_count,
                "processed_at": finished,
                "error": None,
            }},
        )
        await medical_documents.update_one(
            {"document_id": document_id}, {"$set": {"file_metadata.page_count": result.page_count}}
        )
        async with SessionLocal() as db:
            report = await db.get(MedicalReport, uuid.UUID(report_id))
            if report:
                report.status = "COMPLETED"
                report.processed_at = finished
            for lab in fields["labs"]:
                db.add(LabResult(
                    patient_id=uuid.UUID(patient_id), report_id=uuid.UUID(report_id),
                    test_name=lab["test_name"], test_value=lab["test_value"],
                    unit=lab["unit"], reference_range=lab["reference_range"],
                    test_date=finished.date(),
                ))
            vitals = fields["vitals"]
            if vitals:
                db.add(Vital(patient_id=uuid.UUID(patient_id), recorded_at=finished, **vitals))
            await db.commit()
        logger.info("Mobile OCR completed document=%s chars=%d labs=%d",
                    document_id, len(result.text), len(fields["labs"]))
    except Exception as exc:
        logger.warning("Mobile OCR failed document=%s type=%s", document_id, type(exc).__name__)
        await log_error(service="reports.ocr", exc=exc)
        await ocr_results.update_one(
            {"document_id": document_id},
            {"$set": {"processing_status": "FAILED", "processed_at": utcnow(),
                      "error": {"code": type(exc).__name__,
                                "message": "We could not read this report. Please upload a clearer copy."}}},
        )
        async with SessionLocal() as db:
            report = await db.get(MedicalReport, uuid.UUID(report_id))
            if report:
                report.status = "FAILED"
                report.processed_at = utcnow()
                await db.commit()
