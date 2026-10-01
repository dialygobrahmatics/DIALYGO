// DialyGo document/OCR API. Framework/DOM independent so a future React Native app can reuse it.
import { http, unwrap } from "./http";

export const ALLOWED_MIME_TYPES = ["application/pdf", "image/png", "image/jpeg", "image/webp"];
export const MAX_FILE_BYTES = 20 * 1024 * 1024;

export function validateFile(file) {
  if (!file) return "No file selected.";
  if (!ALLOWED_MIME_TYPES.includes(file.type)) return "Unsupported file type. Upload a PDF, PNG, JPG or WebP.";
  if (file.size > MAX_FILE_BYTES) return "File is larger than the 20 MB limit.";
  return null;
}

// file: browser File or React Native { uri, name, type }
export function uploadDocument({ file, patientId, documentType, uploadedBy }) {
  const form = new FormData();
  form.append("file", file);
  form.append("patient_id", patientId);
  if (documentType) form.append("document_type", documentType);
  if (uploadedBy) form.append("uploaded_by", uploadedBy);
  return unwrap(http.post("/documents", form));
}

export const listDocuments = (patientId) => unwrap(http.get("/documents", { params: { patient_id: patientId } }));
export const getDocuments = listDocuments;
export const getDocument = (documentId) => unwrap(http.get(`/documents/${documentId}`));
export const getOcrJob = (jobId) => unwrap(http.get(`/ocr/jobs/${jobId}`));
export const getDocumentText = (documentId) => unwrap(http.get(`/documents/${documentId}/text`));
export const health = () => unwrap(http.get("/health"));

// Polls an OCR job until it is no longer queued/processing. Simple linear backoff.
export function pollOcrJob(jobId, { onUpdate, intervalMs = 2000, maxMs = 120000 } = {}) {
  const started = Date.now();
  let delay = intervalMs;
  let stopped = false;
  const tick = async () => {
    if (stopped) return;
    try {
      const job = await getOcrJob(jobId);
      if (onUpdate) onUpdate(job);
      if (job.status === "processed" || job.status === "failed") return;
    } catch (e) {
      if (onUpdate) onUpdate({ jobId, status: "processing" });
    }
    if (Date.now() - started > maxMs) {
      if (onUpdate) onUpdate({ jobId, status: "failed", error: { message: "Timed out waiting for OCR." } });
      return;
    }
    delay = Math.min(delay + 500, 6000);
    setTimeout(tick, delay);
  };
  setTimeout(tick, delay);
  return () => { stopped = true; };
}
