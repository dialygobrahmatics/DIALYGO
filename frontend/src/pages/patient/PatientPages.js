import { useState } from "react";
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
import { uploadDocument, getDocumentText, pollOcrJob, validateFile } from "@/api/client";

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
  const attention = insight.attention.filter((a) => a.severity !== "info").slice(0, 3);
  const last = patient.sessions[patient.sessions.length - 1];
  return (
    <div className="space-y-4">
      <div className="dg-card p-6">
        <p className="overline">Welcome back</p>
        <h1 className="font-head text-3xl font-extrabold mt-1">{patient.name}</h1>
        <p className="text-sm text-slate-600 mt-2">{patient.id} · {patient.schedule}</p>
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
  const [viewer, setViewer] = useState({ open: false, title: "", text: "", loading: false });

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
      addUpload({ id: localId, name: file.name, type: form.type, note: form.note, status: "failed", replace: true });
      toast.error(e.message || "Upload failed.");
    } finally {
      setBusy(false);
    }
  };

  const openText = async (u) => {
    setViewer({ open: true, title: u.name, text: "", loading: true });
    try {
      const res = await getDocumentText(u.documentId);
      setViewer({ open: true, title: u.name, text: res.text || "(No text could be extracted from this document.)", loading: false });
    } catch (e) {
      setViewer({ open: true, title: u.name, text: `Could not load extracted text: ${e.message}`, loading: false });
    }
  };

  const submit = () => {
    if (!form.name.trim()) return toast.error("Enter a document name.");
    addUpload({ ...form, status: "recorded (no file)" });
    toast.success("Document details recorded", { description: "Attach a file above to run text extraction." });
    setForm({ name: "", type: "Laboratory report", note: "" });
  };

  const statusTone = (s) =>
    s === "processed" ? "bg-emerald-50 text-emerald-700 border-emerald-200"
      : s === "failed" ? "bg-red-50 text-red-700 border-red-200"
      : s === "processing" || s === "queued" ? "bg-amber-50 text-amber-800 border-amber-200"
      : "bg-slate-50 text-slate-600 border-slate-200";

  return (
    <div className="space-y-4">
      <Panel title="Upload Data" hint="Share reports and documents with your care team. PDF, PNG, JPG or WebP up to 20 MB." testId="patient-upload-panel">
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
                    <span className={`text-[11px] font-bold px-2 py-0.5 rounded-lg border ${statusTone(u.status)}`} data-testid={`upload-status-${u.id}`}>{u.status}</span>
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

      <Dialog open={viewer.open} onOpenChange={(o) => setViewer((v) => ({ ...v, open: o }))}>
        <DialogContent className="max-w-3xl" data-testid="ocr-text-dialog">
          <DialogHeader>
            <DialogTitle>Extracted text — {viewer.title}</DialogTitle>
          </DialogHeader>
          <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
            Unverified extracted text. It is not added to your clinical record and is reviewed by your care team.
          </p>
          <div className="max-h-[55vh] overflow-y-auto rounded-lg border border-slate-200 p-4 bg-slate-50/60">
            <pre className="text-xs whitespace-pre-wrap font-mono text-slate-700" data-testid="ocr-text-content">
              {viewer.loading ? "Loading..." : viewer.text}
            </pre>
          </div>
        </DialogContent>
      </Dialog>

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

export function PatientProfile() {
  const { patient } = usePatientSelf();
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState("");
  const [verified, setVerified] = useState(true);
  const [consents, setConsents] = useState({ share: true, privacy: true, research: false });
  const [missing, setMissing] = useState({ emergencyContact: "", allergies: "", occupation: "" });

  return (
    <div className="space-y-4">
      <Panel title="Profile & KYC" hint="Demographics and clinical identity captured in Phase-I" testId="patient-profile-panel">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Metric label="Name" value={patient.name} />
          <Metric label="Age" value={patient.age} unit="years" />
          <Metric label="Gender" value={patient.gender} />
          <Metric label="Blood group" value={patient.bloodGroup} />
          <Metric label="DialyGo ID" value={patient.id} />
          <Metric label="UHID" value={patient.uhid} />
          <Metric label="Mobile" value={patient.phone} />
          <Metric label="Dialysis vintage" value={patient.dialysisVintageMonths} unit="months" />
        </div>
      </Panel>

      <Panel title="Mock OTP authentication" hint="Demonstration only — no message is sent" testId="patient-otp-panel">
        <div className="flex flex-wrap items-end gap-3">
          <Field label="Registered mobile"><Input data-testid="otp-phone-input" defaultValue={patient.phone} className="metric-num w-56" /></Field>
          <Button data-testid="send-otp-btn" variant="outline" onClick={() => { setOtpSent(true); setVerified(false); toast.info("Mock OTP 123456 generated"); }}>Send OTP</Button>
          {otpSent && (
            <>
              <Field label="Enter OTP"><Input data-testid="otp-input" value={otp} onChange={(e) => setOtp(e.target.value)} placeholder="123456" className="metric-num w-32" /></Field>
              <Button data-testid="verify-otp-btn" className="bg-navy hover:bg-navy-deep" onClick={() => { if (otp.trim() === "123456") { setVerified(true); toast.success("Mobile verified (mock)"); } else toast.error("Invalid mock OTP — use 123456"); }}>Verify</Button>
            </>
          )}
          {verified && <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded px-2 py-1" data-testid="otp-verified-badge"><CheckCircle2 className="h-3.5 w-3.5" /> Verified</span>}
        </div>
        <div className="mt-5 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4">
          <p className="text-sm font-semibold flex items-center gap-2"><Fingerprint className="h-4 w-4 text-slate-500" /> Biometric, fingerprint and face-recognition login</p>
          <p className="text-xs text-slate-600 mt-1">Future Release – Not Available in Phase I.</p>
        </div>
      </Panel>

      <Panel title="Consent for data sharing" hint="DPDP Act 2023 — explicit, revocable consent" testId="patient-consent-panel">
        <div className="space-y-3">
          {[
            { key: "share", text: "I consent to sharing my personal, medical and clinical data with DialyGo and my treating facility for the purpose of dialysis care delivery." },
            { key: "privacy", text: "I have read and accept the privacy notice and prototype disclaimer: this application provides decision support only and does not replace clinical judgement." },
            { key: "research", text: "Optional: I consent to the use of my de-identified data for service improvement." },
          ].map((c) => (
            <label key={c.key} className="flex items-start gap-3 rounded-lg border border-slate-200 p-3 cursor-pointer hover:border-slate-300 transition-colors">
              <Checkbox data-testid={`consent-${c.key}`} checked={consents[c.key]} onCheckedChange={(v) => setConsents((p) => ({ ...p, [c.key]: !!v }))} />
              <span className="text-sm text-slate-700">{c.text}</span>
            </label>
          ))}
        </div>
        <Button data-testid="save-consent-btn" className="mt-4 bg-navy hover:bg-navy-deep" onClick={() => toast.success("Consent preferences saved")}>
          <ShieldCheck className="h-4 w-4 mr-1.5" /> Save consent preferences
        </Button>
        <p className="text-xs text-slate-500 mt-3 flex items-start gap-1.5">
          <Info className="h-3.5 w-3.5 mt-0.5" /> Automatic hospital data integration is a future release; in Phase-I your information is entered or uploaded manually.
        </p>
      </Panel>

      <Panel title="Complete missing information" hint="Fields not yet captured on your record" testId="patient-missing-panel">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Field label="Emergency contact"><Input data-testid="missing-emergency-input" value={missing.emergencyContact} onChange={(e) => setMissing({ ...missing, emergencyContact: e.target.value })} placeholder="Name and number" /></Field>
          <Field label="Known allergies"><Input data-testid="missing-allergies-input" value={missing.allergies} onChange={(e) => setMissing({ ...missing, allergies: e.target.value })} placeholder="None / drug names" /></Field>
          <Field label="Occupation"><Input data-testid="missing-occupation-input" value={missing.occupation} onChange={(e) => setMissing({ ...missing, occupation: e.target.value })} placeholder="Optional" /></Field>
        </div>
        <Button data-testid="save-missing-btn" variant="outline" className="mt-4" onClick={() => toast.success("Missing information saved to your record (mock)")}>Save information</Button>
      </Panel>
    </div>
  );
}
