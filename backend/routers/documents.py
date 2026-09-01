"""Documents + OCR routes. JSON only, no DOM/browser assumptions — reusable by React Native."""
import hashlib
import logging
from typing import Optional

from bson import ObjectId
from bson.errors import InvalidId
from fastapi import APIRouter, BackgroundTasks, File, Form, HTTPException, UploadFile

from core.db import job_out, ocr_jobs, documents, document_out, utcnow
from services.ocr import get_engine
from services.storage import get_storage

logger = logging.getLogger(__name__)
router = APIRouter()

ALLOWED = {
    "application/pdf": "pdf",
    "image/png": "png",
    "image/jpeg": "jpg",
    "image/webp": "webp",
}
MAX_BYTES = 20 * 1024 * 1024


def _oid(value: str) -> ObjectId:
    try:
        return ObjectId(value)
    except (InvalidId, TypeError):
        raise HTTPException(status_code=404, detail="Not found")


async def _run_ocr(document_id: ObjectId, job_id: ObjectId, storage_key: str, mime_type: str):
    """Background OCR. Only IDs and status are logged — never document content."""
    await ocr_jobs.update_one({"_id": job_id}, {"$set": {"status": "processing", "startedAt": utcnow()}})
    await documents.update_one({"_id": document_id}, {"$set": {"ocrStatus": "processing", "updatedAt": utcnow()}})
    engine = get_engine()
    try:
        data = get_storage().get(storage_key)
        result = engine.run(data, mime_type)
        await ocr_jobs.update_one(
            {"_id": job_id},
            {"$set": {
                "status": "processed",
                "engine": result.engine,
                "engineVersion": result.engine_version,
                "extractedText": result.text,
                "warnings": result.warnings,
                "finishedAt": utcnow(),
                "error": None,
            }},
        )
        await documents.update_one(
            {"_id": document_id},
            {"$set": {"ocrStatus": "processed", "pageCount": result.page_count, "updatedAt": utcnow()}},
        )
        logger.info("OCR processed document=%s job=%s chars=%d", document_id, job_id, len(result.text))
    except Exception as exc:
        logger.warning("OCR failed document=%s job=%s type=%s", document_id, job_id, type(exc).__name__)
        await ocr_jobs.update_one(
            {"_id": job_id},
            {"$set": {"status": "failed", "finishedAt": utcnow(),
                      "error": {"code": type(exc).__name__, "message": "OCR processing failed for this document."}}},
        )
        await documents.update_one({"_id": document_id}, {"$set": {"ocrStatus": "failed", "updatedAt": utcnow()}})


@router.post("/documents")
async def upload_document(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    patient_id: str = Form(...),
    document_type: Optional[str] = Form(None),
    uploaded_by: Optional[str] = Form(None),
):
    if file.content_type not in ALLOWED:
        raise HTTPException(status_code=415, detail="Unsupported file type. Upload a PDF, PNG, JPG or WebP.")
    data = await file.read()
    if not data:
        raise HTTPException(status_code=400, detail="The uploaded file is empty.")
    if len(data) > MAX_BYTES:
        raise HTTPException(status_code=413, detail="File is larger than the 20 MB limit.")
    if file.content_type == "application/pdf" and not data.startswith(b"%PDF"):
        raise HTTPException(status_code=415, detail="File content does not match a PDF.")

    now = utcnow()
    doc_id = ObjectId()
    checksum = hashlib.sha256(data).hexdigest()
    key = f"patients/{patient_id}/{doc_id}.{ALLOWED[file.content_type]}"
    try:
        get_storage().put(key, data)
    except Exception:
        raise HTTPException(status_code=500, detail="Could not store the uploaded file.")

    job_id = ObjectId()
    await documents.insert_one({
        "_id": doc_id,
        "patientId": patient_id,
        "uploadedBy": uploaded_by,
        "originalFilename": file.filename,
        "mimeType": file.content_type,
        "sizeBytes": len(data),
        "documentType": document_type or "Other",
        "storageKey": key,
        "checksumSha256": checksum,
        "pageCount": None,
        "ocrStatus": "queued",
        "jobId": job_id,
        "createdAt": now,
        "updatedAt": now,
    })
    await ocr_jobs.insert_one({
        "_id": job_id,
        "documentId": doc_id,
        "patientId": patient_id,
        "status": "queued",
        "engine": None,
        "engineVersion": None,
        "startedAt": None,
        "finishedAt": None,
        "extractedText": None,
        "warnings": [],
        "error": None,
        "createdAt": now,
    })

    background_tasks.add_task(_run_ocr, doc_id, job_id, key, file.content_type)
    return {"documentId": str(doc_id), "jobId": str(job_id), "status": "queued"}


@router.get("/documents")
async def list_documents(patient_id: str):
    cursor = documents.find({"patientId": patient_id}).sort("createdAt", -1).limit(100)
    return {"documents": [document_out(d) async for d in cursor]}


@router.get("/documents/{document_id}")
async def get_document(document_id: str):
    doc = await documents.find_one({"_id": _oid(document_id)})
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    return document_out(doc)


@router.get("/documents/{document_id}/text")
async def get_document_text(document_id: str):
    doc = await documents.find_one({"_id": _oid(document_id)})
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    job = await ocr_jobs.find_one({"documentId": doc["_id"]})
    if not job:
        raise HTTPException(status_code=404, detail="OCR job not found")
    return {
        "documentId": str(doc["_id"]),
        "status": job.get("status"),
        "engine": job.get("engine"),
        "engineVersion": job.get("engineVersion"),
        "warnings": job.get("warnings") or [],
        "text": job.get("extractedText") or "",
        "unverified": True,
    }


@router.get("/ocr/jobs/{job_id}")
async def get_job(job_id: str):
    job = await ocr_jobs.find_one({"_id": _oid(job_id)})
    if not job:
        raise HTTPException(status_code=404, detail="OCR job not found")
    return job_out(job)
