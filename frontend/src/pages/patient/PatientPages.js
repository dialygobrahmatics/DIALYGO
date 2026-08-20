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
      <div className="bg-white border border-slate-200 rounded-md shadow-sm p-6">
        <p className="overline">Welcome back</p>
        <h1 className="font-head text-3xl font-extrabold mt-1">{patient.name}</h1>
        <p className="text-sm text-slate-600 mt-2">{patient.id} · {patient.schedule}</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5">
          <div className="rounded border border-slate-200 px-4 py-3"><p className="overline">Sessions completed</p><p className="metric-num text-2xl font-semibold mt-1">{patient.sessions.length}</p></div>
          <div className="rounded border border-slate-200 px-4 py-3"><p className="overline">Last session</p><p className="metric-num text-sm font-semibold mt-1">{last.date}</p></div>
          <div className="rounded border border-slate-200 px-4 py-3"><p className="overline">Dry weight</p><p className="metric-num text-2xl font-semibold mt-1">{patient.dryWeight}</p></div>
          <div className={`rounded border px-4 py-3 ${attention.length ? "bg-amber-50 border-amber-200" : "bg-emerald-50 border-emerald-200"}`}>
            <p className="overline">Points to discuss</p>
            <p className="metric-num text-2xl font-semibold mt-1" data-testid="patient-attention-count">{attention.length}</p>
          </div>
        </div>
      </div>

      <Panel title="Things to discuss with your care team" hint="Simplified indicators from your own records" testId="patient-attention-panel">
        {attention.length === 0 ? <EmptyState text="No attention indicators right now — keep following your fluid and diet advice." /> : (
          <ul className="space-y-3">
            {attention.map((a, i) => (
              <li key={i} className={`rounded-md border p-4 ${levelColor(a.severity === "high" ? "moderate" : "info")}`}>
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
              <Line type="monotone" dataKey="hb" stroke="#2563eb" strokeWidth={2} name="Hb" />
              <Line type="monotone" dataKey="k" stroke="#dc2626" strokeWidth={2} name="Potassium" />
              <Line type="monotone" dataKey="ktv" stroke="#10b981" strokeWidth={2} name="Kt/V" />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-6 rounded-md border border-slate-200 p-4">
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
  const { uploads, addUpload } = useApp();
  const [form, setForm] = useState({ name: "", type: "Laboratory report", note: "" });
  const submit = () => {
    if (!form.name.trim()) return toast.error("Enter a document name.");
    addUpload({ ...form });
    toast.success("Document received (mock)", { description: "Only file metadata is captured in the Phase-I prototype." });
    setForm({ name: "", type: "Laboratory report", note: "" });
  };
  return (
    <div className="space-y-4">
      <Panel title="Upload Data" hint="Share reports and documents with your care team. Mock upload — no file leaves this device." testId="patient-upload-panel">
        <div className="border-2 border-dashed border-slate-300 rounded-md p-8 text-center bg-slate-50">
          <Upload className="h-8 w-8 text-slate-400 mx-auto" />
          <p className="text-sm font-semibold mt-3">Drop a report here, or record its details below</p>
          <p className="text-xs text-slate-500 mt-1">Scanned report extraction is a future release and is not available in Phase I.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-5">
          <Field label="Document name">
            <Input data-testid="upload-name-input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Labs_June2026.pdf" />
          </Field>
          <Field label="Document type">
            <select data-testid="upload-type-select" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className="w-full h-10 rounded border border-slate-200 px-3 text-sm bg-white">
              {["Laboratory report", "Vascular Doppler", "Discharge summary", "Prescription", "Clinical note", "Other"].map((t) => <option key={t}>{t}</option>)}
            </select>
          </Field>
          <Field label="Note for the care team">
            <Input data-testid="upload-note-input" value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} placeholder="Optional" />
          </Field>
        </div>
        <Button data-testid="upload-submit-btn" className="mt-4 bg-blue-600 hover:bg-blue-700" onClick={submit}>Submit document</Button>
      </Panel>

      <Panel title="Uploaded in this session" testId="patient-upload-log">
        {uploads.length === 0 ? <EmptyState text="Nothing uploaded yet." /> : (
          <ul className="space-y-2" data-testid="upload-list">
            {uploads.map((u) => (
              <li key={u.id} className="rounded border border-slate-200 p-3 flex items-start gap-3">
                <FileText className="h-4 w-4 text-blue-700 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold">{u.name}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{u.type} · {u.status} · {new Date(u.at).toLocaleTimeString()}</p>
                  {u.note && <p className="text-xs text-slate-600 mt-1">{u.note}</p>}
                </div>
              </li>
            ))}
          </ul>
        )}
      </Panel>
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
            <div className="h-9 w-9 rounded bg-blue-50 border border-blue-200 grid place-items-center shrink-0"><FileText className="h-4 w-4 text-blue-700" /></div>
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
              <Line type="monotone" dataKey="uf" stroke="#2563eb" strokeWidth={2} name="Fluid removed (L)" />
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
              {patient.comorbidities.map((c) => <span key={c} className="text-xs font-semibold px-2 py-1 rounded border border-slate-200 bg-slate-50">{c}</span>)}
            </div>
            <p className="overline mt-6">Vascular access</p>
            <p className="text-sm text-slate-700 mt-2">{patient.vascular.type} · {patient.vascular.site} · created {patient.vascular.createdOn}</p>
          </div>
          <div>
            <p className="overline">Current medicines</p>
            <ul className="mt-2 space-y-2">
              {patient.medications.map((m, i) => (
                <li key={i} className="text-sm text-slate-700 rounded border border-slate-200 px-3 py-2">
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
          <Metric label="Dialyso ID" value={patient.id} />
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
              <Button data-testid="verify-otp-btn" className="bg-blue-600 hover:bg-blue-700" onClick={() => { if (otp.trim() === "123456") { setVerified(true); toast.success("Mobile verified (mock)"); } else toast.error("Invalid mock OTP — use 123456"); }}>Verify</Button>
            </>
          )}
          {verified && <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded px-2 py-1" data-testid="otp-verified-badge"><CheckCircle2 className="h-3.5 w-3.5" /> Verified</span>}
        </div>
        <div className="mt-5 rounded-md border border-dashed border-slate-300 bg-slate-50 p-4">
          <p className="text-sm font-semibold flex items-center gap-2"><Fingerprint className="h-4 w-4 text-slate-500" /> Biometric, fingerprint and face-recognition login</p>
          <p className="text-xs text-slate-600 mt-1">Future Release – Not Available in Phase I.</p>
        </div>
      </Panel>

      <Panel title="Consent for data sharing" hint="DPDP Act 2023 — explicit, revocable consent" testId="patient-consent-panel">
        <div className="space-y-3">
          {[
            { key: "share", text: "I consent to sharing my personal, medical and clinical data with Dialyso and my treating facility for the purpose of dialysis care delivery." },
            { key: "privacy", text: "I have read and accept the privacy notice and prototype disclaimer: this application provides decision support only and does not replace clinical judgement." },
            { key: "research", text: "Optional: I consent to the use of my de-identified data for service improvement." },
          ].map((c) => (
            <label key={c.key} className="flex items-start gap-3 rounded border border-slate-200 p-3 cursor-pointer hover:border-slate-300 transition-colors">
              <Checkbox data-testid={`consent-${c.key}`} checked={consents[c.key]} onCheckedChange={(v) => setConsents((p) => ({ ...p, [c.key]: !!v }))} />
              <span className="text-sm text-slate-700">{c.text}</span>
            </label>
          ))}
        </div>
        <Button data-testid="save-consent-btn" className="mt-4 bg-blue-600 hover:bg-blue-700" onClick={() => toast.success("Consent preferences saved")}>
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
