"""Shared Mongo access and API-safe serialisation helpers."""
import os
from datetime import datetime, timezone

from motor.motor_asyncio import AsyncIOMotorClient

_client = AsyncIOMotorClient(os.environ["MONGO_URL"])
db = _client[os.environ["DB_NAME"]]

# Legacy web-app collections (Dialygo web Upload Data flow) — unchanged.
documents = db["documents"]
ocr_jobs = db["ocr_jobs"]

# Approved Dialygo mobile MongoDB design.
medical_documents = db["medical_documents"]
ocr_results = db["ocr_results"]
clinical_insights = db["clinical_insights"]


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


def iso(value):
    return value.isoformat() if isinstance(value, datetime) else value


def document_out(doc: dict) -> dict:
    """Never return raw Mongo documents; storage paths are not exposed."""
    return {
        "documentId": str(doc["_id"]),
        "patientId": doc.get("patientId"),
        "uploadedBy": doc.get("uploadedBy"),
        "originalFilename": doc.get("originalFilename"),
        "mimeType": doc.get("mimeType"),
        "sizeBytes": doc.get("sizeBytes"),
        "documentType": doc.get("documentType"),
        "pageCount": doc.get("pageCount"),
        "ocrStatus": doc.get("ocrStatus"),
        "jobId": str(doc["jobId"]) if doc.get("jobId") else None,
        "createdAt": iso(doc.get("createdAt")),
        "updatedAt": iso(doc.get("updatedAt")),
    }


def job_out(job: dict, include_text: bool = False) -> dict:
    out = {
        "jobId": str(job["_id"]),
        "documentId": str(job.get("documentId")),
        "patientId": job.get("patientId"),
        "status": job.get("status"),
        "engine": job.get("engine"),
        "engineVersion": job.get("engineVersion"),
        "startedAt": iso(job.get("startedAt")),
        "finishedAt": iso(job.get("finishedAt")),
        "textLength": len(job.get("extractedText") or ""),
        "warnings": job.get("warnings") or [],
        "error": job.get("error"),
    }
    if include_text:
        out["extractedText"] = job.get("extractedText") or ""
    return out
