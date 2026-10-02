// Shared backend-document helpers: persisted (MongoDB) documents + the single OCR text viewer.
import { useCallback, useEffect, useState } from "react";
import { FileText } from "lucide-react";
import { listDocuments, getDocumentText } from "@/api/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export const statusTone = (s) =>
  s === "processed" ? "bg-emerald-50 text-emerald-700 border-emerald-200"
    : s === "failed" ? "bg-red-50 text-red-700 border-red-200"
    : s === "processing" || s === "queued" ? "bg-amber-50 text-amber-800 border-amber-200"
    : "bg-slate-50 text-slate-600 border-slate-200";

export const statusLabel = (s) =>
  s === "processed" ? "Processed" : s === "failed" ? "Failed" : s === "processing" || s === "queued" ? "Processing..." : s || "—";

// MongoDB is the source of truth. Re-polls while any document is still processing.
export function useBackendDocuments(patientId) {
  const [docs, setDocs] = useState([]);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    if (!patientId) return;
    try {
      const res = await listDocuments(patientId);
      setDocs(res.documents || []);
      setError(null);
    } catch (e) {
      setError(e.message);
    }
  }, [patientId]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const pending = docs.some((d) => d.ocrStatus === "queued" || d.ocrStatus === "processing");
    if (!pending) return;
    const t = setTimeout(load, 3000);
    return () => clearTimeout(t);
  }, [docs, load]);

  return { docs, error, reload: load };
}

export function OcrTextDialog({ open, onOpenChange, doc }) {
  const [state, setState] = useState({ loading: false, text: "", status: null });

  useEffect(() => {
    if (!open || !doc?.documentId) return;
    setState({ loading: true, text: "", status: doc.ocrStatus });
    getDocumentText(doc.documentId)
      .then((res) => setState({ loading: false, text: res.text || "(No text could be extracted from this document.)", status: res.status }))
      .catch((e) => setState({ loading: false, text: `Could not load extracted text: ${e.message}`, status: doc.ocrStatus }));
  }, [open, doc]);

  const status = state.status || doc?.ocrStatus;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl" data-testid="ocr-text-dialog">
        <DialogHeader>
          <DialogTitle>Extracted text — {doc?.originalFilename || doc?.name}</DialogTitle>
        </DialogHeader>
        <p className="text-xs text-slate-500">
          {doc?.documentType || doc?.type} · Status: <span className="font-semibold">{statusLabel(status)}</span>
        </p>
        <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
          <span className="font-bold">Unverified extracted text.</span> It has not been clinically verified, is not automatically
          added to the clinical record, and must be reviewed by the care team.
        </p>
        <div className="max-h-[55vh] overflow-y-auto rounded-lg border border-slate-200 p-4 bg-slate-50/60">
          <pre className="text-xs whitespace-pre-wrap font-mono text-slate-700" data-testid="ocr-text-content">
            {state.loading ? "Loading..." : status === "failed" ? "Text extraction failed for this document." : status === "processed" ? state.text : "Processing..."}
          </pre>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Renders persisted uploaded documents using the existing document-card presentation.
export function BackendDocumentList({ patientId, testId = "backend-documents" }) {
  const { docs } = useBackendDocuments(patientId);
  const [active, setActive] = useState(null);

  if (!docs.length) return null;

  return (
    <>
      <p className="overline mt-6">Uploaded documents (from patient record)</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-2" data-testid={testId}>
        {docs.map((d) => (
          <div key={d.documentId} className="border border-slate-200 rounded-xl p-4 flex items-start gap-3" data-testid={`backend-doc-${d.documentId}`}>
            <div className="h-9 w-9 rounded-lg bg-navy-tint border border-[#c3dcf7] grid place-items-center shrink-0">
              <FileText className="h-4 w-4 text-navy" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold truncate">{d.originalFilename}</p>
              <p className="text-xs text-slate-500 mt-0.5">
                {d.documentType} · {new Date(d.createdAt).toLocaleString()}
              </p>
              <span className={`inline-block text-[11px] font-bold px-2 py-0.5 rounded-lg border mt-2 ${statusTone(d.ocrStatus)}`} data-testid={`backend-doc-status-${d.documentId}`}>
                {statusLabel(d.ocrStatus)}
              </span>
              {d.ocrStatus === "processed" && (
                <Button size="sm" variant="outline" className="mt-2 block" data-testid={`backend-doc-view-${d.documentId}`} onClick={() => setActive(d)}>
                  View extracted text
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>
      <OcrTextDialog open={!!active} onOpenChange={(o) => !o && setActive(null)} doc={active} />
    </>
  );
}
