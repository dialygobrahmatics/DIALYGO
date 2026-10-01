import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { Upload, FileText, ShieldCheck, HeartPulse, Info, Lock, CheckCircle2, Fingerprint } from "lucide-react";
import { Panel, Metric, Field, EmptyState } from "@/components/Bits";
import { useApp } from "@/context/AppContext";
import { getPatient } from "@/data/mockData";
import { buildInsight, levelColor } from "@/lib/engine";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { uploadDocument, pollOcrJob, validateFile } from "@/api/client";
import { OcrTextDialog, BackendDocumentList, statusTone, statusLabel } from "@/components/OcrDocuments";

const usePatientSelf = () => {
  const { user } = useApp();
  const patient = getPatient(user?.id) || getPatient("DUR-PT-00218");
  return { patient, insight: buildInsight(patient, null) };
};

const Disclaimer = () => (
  <p className="text-xs text-slate-500 mt-4">
    This view shows your own recorded information in simplified form. Machine settings and clinical recommendations are shared
    with your care team, not applied automatically. Please discuss any question with your treating clinician.
  </p>
);

export function PatientHome() {
  const { patient, insight } = usePatientSelf();
  const { userDetails } = useAuth();
  const attention = insight.attention.filter((a) => a.severity !== "info").slice(0, 3);
  const last = patient.sessions[patient.sessions.length - 1];
  return (
    <div className="space-y-4">
      <div className="dg-card p-6">
        <p className="overline">Welcome back</p>
        <h1 className="font-head text-3xl font-extrabold mt-1" data-testid="user-welcome-name">{userDetails?.name}</h1>
        <p className="text-sm text-slate-600 mt-2"><span className="metric-num" data-testid="user-welcome-code">{userDetails?.id}</span> · {patient.schedule}</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5">
          <div className="dg-stat px-4 py-3"><p className="overline">Sessions completed</p><p className="metric-num text-2xl font-semibold mt-1">{patient.sessions.length}</p></div>
          <div className="dg-stat px-4 py-3"><p className="overline">Last session</p><p className="metric-num text-sm font-semibold mt-1">{last.date}</p></div>
          <div className="dg-stat px-4 py-3"><p className="overline">Dry weight</p><p className="metric-num text-2xl font-semibold mt-1">{patient.dryWeight}</p></div>
          <div className={`rounded-lg border px-4 py-3 ${attention.length ? "bg-amber-50 border-amber-200" : "bg-emerald-50 border-emerald-200"}`}>
            <p className="overline">Points to discuss</p>
            <p className="metric-num text-2xl font-semibold mt-1" data-testid="patient-attention-count">{attention.length}</p>
          </div>
        </div>
      </div>

      <Panel title="Things to discuss with your care team" hint="Simplified indicators from your own records" testId="patient-attention-panel">
        {attention.length === 0 ? <EmptyState text="No attention indicators right now — keep following your fluid and diet advice." /> : (
          <ul className="space-y-3">
            {attention.map((a, i) => (
              <li key={i} className={`rounded-xl border p-4 ${levelColor(a.severity === "high" ? "moderate" : "info")}`}>
                <p className="text-sm font-semibold">{a.title}</p>
                <p className="text-sm mt-1 opacity-90">{a.detail}</p>
              </li>
            ))}
          </ul>
        )}
        <Disclaimer />
      </Panel>
    </div>
  );
}

export function PatientMyHealth() {
  const { patient, insight } = usePatientSelf();
  const lab = patient.labs[0];
  const series = [...patient.labs].reverse().map((l) => ({ date: l.date.slice(5), hb: l.hb, k: l.potassium, ktv: l.ktv }));
  return (
    <div className="space-y-4">
      <Panel title="My Health" hint="Your latest results and simple trends" testId="patient-health-panel">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Metric label="Haemoglobin" value={lab.hb} unit="g/dL" tone={lab.hb < 10 ? "warn" : "ok"} sub="Target 10–12" />
          <Metric label="Potassium" value={lab.potassium} unit="mmol/L" tone={lab.potassium >= 5.5 ? "alert" : "ok"} sub="Target below 5.5" />
          <Metric label="Creatinine" value={lab.creatinine} unit="mg/dL" />
          <Metric label="Dialysis adequacy (Kt/V)" value={lab.ktv} tone={lab.ktv < 1.2 ? "warn" : "ok"} sub="Target 1.2 or above" />
        </div>
        <p className="overline mt-6">Haemoglobin, potassium and adequacy over time</p>
        <div className="h-56 mt-2">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={series} margin={{ top: 5, right: 8, left: -18, bottom: 0 }}>
              <CartesianGrid stroke="#e2e8f0" vertical={false} />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} stroke="#94a3b8" />
              <YAxis tick={{ fontSize: 10 }} stroke="#94a3b8" />
              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 6 }} />
              <Line type="monotone" dataKey="hb" stroke="#0a3d62" strokeWidth={2} name="Hb" />
              <Line type="monotone" dataKey="k" stroke="#dc2626" strokeWidth={2} name="Potassium" />
              <Line type="monotone" dataKey="ktv" stroke="#10b981" strokeWidth={2} name="Kt/V" />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-6 rounded-xl border border-slate-200 p-4">
          <p className="overline flex items-center gap-1.5"><HeartPulse className="h-3.5 w-3.5" /> My dialysis access</p>
          <p className="text-sm text-slate-700 mt-2">
            {patient.vascular.type} in your {patient.vascular.side.toLowerCase()} arm, in use since {patient.vascular.createdOn}.
            Your care team is monitoring it {insight.accessStatus.level === "low" ? "and it is working as expected." : "closely — please report any pain, swelling or bleeding."}
          </p>
        </div>
        <Disclaimer />
      </Panel>
    </div>
  );
}

export function PatientUpload() {
  const { uploads, addUpload, user } = useApp();
  const { patient } = usePatientSelf();
  const [form, setForm] = useState({ name: "", type: "Laboratory report", note: "" });
  const [busy, setBusy] = useState(false);
  const [active, setActive] = useState(null);

  const startUpload = async (file) => {
    const problem = validateFile(file);
    if (problem) return toast.error(problem);
    setBusy(true);
    const localId = `UPL-${Date.now()}`;
    addUpload({ id: localId, name: file.name, type: form.type, note: form.note, status: "queued", documentId: null, jobId: null });
    try {
      const res = await uploadDocument({ file, patientId: patient.id, documentType: form.type, uploadedBy: user?.id });
      addUpload({ id: localId, name: file.name, type: form.type, note: form.note, status: "queued", documentId: res.documentId, jobId: res.jobId, replace: true });
      toast.success("Document uploaded", { description: "Text extraction has started." });
      pollOcrJob(res.jobId, {
        onUpdate: (job) => {
          addUpload({ id: localId, name: file.name, type: form.type, note: form.note, status: job.status, documentId: res.documentId, jobId: res.jobId, replace: true });
          if (job.status === "processed") toast.success("Text extraction complete", { description: "Extracted text is unverified — open it to review." });
          if (job.status === "failed") toast.error("Text extraction failed for this document.");
        },
      });
    } catch (e) {
      addUpload({ id: localId, name: file.name, type: form.type, note: form.note, status: "rejected", replace: true });
      toast.error(e.message || "Upload failed.", { duration: 8000 });
    } finally {
      setBusy(false);
    }
  };

  const openText = (u) => setActive({ documentId: u.documentId, originalFilename: u.name, documentType: u.type, ocrStatus: u.status });

  const submit = () => {
    if (!form.name.trim()) return toast.error("Enter a document name.");
    addUpload({ ...form, status: "recorded (no file)" });
    toast.success("Document details recorded", { description: "Attach a file above to run text extraction." });
    setForm({ name: "", type: "Laboratory report", note: "" });
  };

  return (
    <div className="space-y-4">
      <Panel title="Upload Data" hint="Share reports and documents with your care team. PDF, PNG, JPG or WebP up to 20 MB." testId="patient-upload-panel">
        <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-4" data-testid="medical-only-notice">
          ⚠️ Please upload only medical reports such as laboratory reports, clinical notes, prescriptions, discharge
          summaries, or vascular reports.
        </p>
        <label className="dg-dashed p-10 text-center bg-slate-50/60 block cursor-pointer">
          <Upload className="h-8 w-8 text-slate-400 mx-auto" />
          <p className="text-sm font-semibold mt-3">{busy ? "Uploading..." : "Select a report to upload, or record its details below"}</p>
          <p className="text-xs text-slate-500 mt-1">Text is extracted automatically. Extracted text is unverified and is reviewed by your care team.</p>
          <input
            data-testid="upload-file-input"
            type="file"
            className="hidden"
            accept=".pdf,.png,.jpg,.jpeg,.webp"
            disabled={busy}
            onChange={(e) => { const f = e.target.files && e.target.files[0]; e.target.value = ""; if (f) startUpload(f); }}
          />
        </label>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-5">
          <Field label="Document name">
            <Input data-testid="upload-name-input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Labs_June2026.pdf" />
          </Field>
          <Field label="Document type">
            <select data-testid="upload-type-select" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className="w-full h-10 rounded-lg border border-slate-200 px-3 text-sm bg-white">
              {["Laboratory report", "Vascular Doppler", "Discharge summary", "Prescription", "Clinical note", "Other"].map((t) => <option key={t}>{t}</option>)}
            </select>
          </Field>
          <Field label="Note for the care team">
            <Input data-testid="upload-note-input" value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} placeholder="Optional" />
          </Field>
        </div>
        <Button data-testid="upload-submit-btn" className="mt-4 bg-saffron hover:bg-saffron-warm text-white font-bold" onClick={submit}>Submit document</Button>
      </Panel>

      <Panel title="Uploaded in this session" testId="patient-upload-log">
        {uploads.length === 0 ? <EmptyState text="Nothing uploaded yet." /> : (
          <ul className="space-y-2" data-testid="upload-list">
            {uploads.map((u) => (
              <li key={u.id} className="rounded-lg border border-slate-200 p-3 flex items-start gap-3" data-testid={`upload-item-${u.id}`}>
                <FileText className="h-4 w-4 text-navy mt-0.5" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold">{u.name}</p>
                  <p className="text-xs text-slate-500 mt-0.5 flex flex-wrap items-center gap-2">
                    <span>{u.type} · {new Date(u.at).toLocaleTimeString()}</span>
                    <span className={`text-[11px] font-bold px-2 py-0.5 rounded-lg border ${statusTone(u.status)}`} data-testid={`upload-status-${u.id}`}>{statusLabel(u.status)}</span>
                  </p>
                  {u.note && <p className="text-xs text-slate-600 mt-1">{u.note}</p>}
                  {u.status === "processed" && u.documentId && (
                    <Button size="sm" variant="outline" className="mt-2" data-testid={`view-text-btn-${u.id}`} onClick={() => openText(u)}>
                      View extracted text
                    </Button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <OcrTextDialog open={!!active} onOpenChange={(o) => !o && setActive(null)} doc={active} />

    </div>
  );
}

export function PatientReports() {
  const { patient } = usePatientSelf();
  return (
    <Panel title="My Reports" hint="Reports and documents on your record" testId="patient-reports-panel">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {patient.documents.map((d, i) => (
          <div key={i} className="border border-slate-200 rounded-md p-4 flex items-start gap-3">
            <div className="h-9 w-9 rounded bg-navy-tint border border-[#c3dcf7] grid place-items-center shrink-0"><FileText className="h-4 w-4 text-navy" /></div>
            <div className="min-w-0">
              <p className="text-sm font-semibold truncate">{d.name}</p>
              <p className="text-xs text-slate-500 mt-0.5">{d.type} · {d.date} · {d.pages} pages</p>
            </div>
          </div>
        ))}
      </div>
      <Disclaimer />
      <BackendDocumentList patientId={patient.id} testId="myreports-backend-documents" />
    </Panel>
  );
}

export function PatientDialysisOverview() {
  const { patient } = usePatientSelf();
  const data = patient.sessions.map((s) => ({ name: `#${s.sessionNo}`, uf: s.ufAchieved, gain: +(s.preWeight - patient.dryWeight).toFixed(1) }));
  const last = patient.sessions[patient.sessions.length - 1];
  return (
    <div className="space-y-4">
      <Panel title="Dialysis Overview" hint="Your recent dialysis sessions in simple terms" testId="patient-dialysis-panel">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Metric label="Schedule" value={patient.schedule} />
          <Metric label="Last session duration" value={last.durationMin} unit="min" />
          <Metric label="Fluid removed last session" value={last.ufAchieved} unit="L" />
          <Metric label="Weight after last session" value={last.postWeight} unit="kg" />
        </div>
        <p className="overline mt-6">Fluid removed and weight gain between sessions</p>
        <div className="h-56 mt-2">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 5, right: 8, left: -18, bottom: 0 }}>
              <CartesianGrid stroke="#e2e8f0" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 10 }} stroke="#94a3b8" />
              <YAxis tick={{ fontSize: 10 }} stroke="#94a3b8" />
              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 6 }} />
              <Line type="monotone" dataKey="uf" stroke="#0a3d62" strokeWidth={2} name="Fluid removed (L)" />
              <Line type="monotone" dataKey="gain" stroke="#10b981" strokeWidth={2} name="Weight gain (kg)" />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <Disclaimer />
      </Panel>
    </div>
  );
}

export function PatientMedicalHistory() {
  const { patient } = usePatientSelf();
  return (
    <div className="space-y-4">
      <Panel title="Medical History" hint="Diagnosis, conditions, medicines and admissions on your record" testId="patient-history-panel">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <p className="overline">Diagnosis & conditions</p>
            <p className="text-sm font-semibold mt-2">{patient.primaryDiagnosis}</p>
            <div className="flex flex-wrap gap-2 mt-3">
              {patient.comorbidities.map((c) => <span key={c} className="text-xs font-semibold px-2 py-1 rounded-lg border border-slate-200 bg-slate-50">{c}</span>)}
            </div>
            <p className="overline mt-6">Vascular access</p>
            <p className="text-sm text-slate-700 mt-2">{patient.vascular.type} · {patient.vascular.site} · created {patient.vascular.createdOn}</p>
          </div>
          <div>
            <p className="overline">Current medicines</p>
            <ul className="mt-2 space-y-2">
              {patient.medications.map((m, i) => (
                <li key={i} className="text-sm text-slate-700 dg-stat px-3 py-2">
                  <span className="font-semibold">{m.name}</span> · {m.dose} {m.route} · {m.freq}
                </li>
              ))}
            </ul>
          </div>
        </div>
        <p className="overline mt-6">Hospital visits</p>
        <ul className="mt-2 space-y-2">
          {patient.hospitalizations.map((h, i) => (
            <li key={i} className="text-sm text-slate-700"><span className="metric-num text-xs text-slate-500">{h.date}</span> · {h.reason} ({h.days} days)</li>
          ))}
        </ul>
        <Disclaimer />
      </Panel>
    </div>
  );
}
