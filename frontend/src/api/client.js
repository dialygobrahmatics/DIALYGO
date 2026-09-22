// DialyGo API client. Framework/DOM independent so a future React Native app can reuse it.
const BASE = process.env.REACT_APP_BACKEND_URL;
const API = `${BASE}/api`;

async function request(path, options = {}) {
  const res = await fetch(`${API}${path}`, options);
  let body = null;
  try {
    body = await res.json();
  } catch (e) {
    body = null;
  }
  if (!res.ok) {
    const d = body && body.detail;
    const message = (d && typeof d === "object" && d.message) || (typeof d === "string" ? d : null) || (body && body.message) || `Request failed (${res.status})`;
    throw new Error(message);
  }
  return body;
}

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
  return request("/documents", { method: "POST", body: form });
}

export const listDocuments = (patientId) => request(`/documents?patient_id=${encodeURIComponent(patientId)}`);
export const getDocuments = listDocuments;
export const getDocument = (documentId) => request(`/documents/${documentId}`);
export const getOcrJob = (jobId) => request(`/ocr/jobs/${jobId}`);
export const getDocumentText = (documentId) => request(`/documents/${documentId}/text`);
export const health = () => request("/health");

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
