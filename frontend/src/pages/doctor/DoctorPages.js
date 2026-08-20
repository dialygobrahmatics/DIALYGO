import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { toast } from "sonner";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { ShieldCheck, Undo2, Stethoscope, FileText, Users } from "lucide-react";
import { Panel, Metric, TrendBadge } from "@/components/Bits";
import { PatientBanner, PatientPickerList, NoPatient, usePatientContext } from "@/components/PatientBanner";
import CoreEngineRunner from "@/components/CoreEngineRunner";
import OverviewTab from "@/components/tabs/OverviewTab";
import VascularTab from "@/components/tabs/VascularTab";
import HistoryTab from "@/components/tabs/HistoryTab";
import ReportTab from "@/components/tabs/ReportTab";
import { useApp } from "@/context/AppContext";
import { patients } from "@/data/mockData";
import { buildInsight, levelColor } from "@/lib/engine";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export function DoctorHome() {
  const navigate = useNavigate();
  const { setSelectedPatientId } = useApp();
  const rows = patients.map((p) => ({ p, insight: buildInsight(p, null) }));
  return (
    <div className="space-y-4">
      <div className="bg-white border border-slate-200 rounded-md shadow-sm p-6">
        <p className="overline">Clinical review · {new Date().toDateString()}</p>
        <h1 className="font-head text-3xl font-extrabold mt-1">Doctor Console</h1>
        <p className="text-sm text-slate-600 mt-3 max-w-3xl">
          Compare each patient's evidence over time instead of reviewing sessions in isolation, then approve or return the
          core-engine prescription report.
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5">
          <div className="rounded border border-slate-200 px-4 py-3"><p className="overline">Patients under review</p><p className="metric-num text-2xl font-semibold mt-1">{patients.length}</p></div>
          <div className="rounded border border-amber-200 bg-amber-50 px-4 py-3"><p className="overline text-amber-800">Reports awaiting sign-off</p><p className="metric-num text-2xl font-semibold mt-1 text-amber-800" data-testid="doc-stat-pending">{patients.length}</p></div>
          <div className="rounded border border-red-200 bg-red-50 px-4 py-3"><p className="overline text-red-700">Access risk high</p><p className="metric-num text-2xl font-semibold mt-1 text-red-700">{rows.filter((r) => r.insight.accessStatus.level === "high").length}</p></div>
          <div className="rounded border border-slate-200 px-4 py-3"><p className="overline">Adequacy below target</p><p className="metric-num text-2xl font-semibold mt-1">{patients.filter((p) => p.labs[0].ktv < 1.2).length}</p></div>
        </div>
      </div>
      <Panel title="Assigned patients" hint="Open Patient 360° for the consolidated record" testId="doctor-worklist">
        <PatientPickerList onPick={(id) => { setSelectedPatientId(id); navigate("/doctor/patient-360"); }} />
      </Panel>
    </div>
  );
}

export function DoctorPatients() {
  const navigate = useNavigate();
  const { setSelectedPatientId } = useApp();
  return (
    <Panel title="Patients" hint="All patients available to this clinician" testId="doctor-patients-panel">
      <PatientPickerList onPick={(id) => { setSelectedPatientId(id); navigate("/doctor/patient-360"); }} testId="doctor-patient-list" />
    </Panel>
  );
}

export function DoctorPatient360() {
  const { patient, insight } = usePatientContext();
  const navigate = useNavigate();
  if (!patient) return <NoPatient to="/doctor/patients" />;
  return (
    <div className="space-y-4">
      <PatientBanner patient={patient} insight={insight} />
      <Panel title="Patient 360° consolidation" hint="Demographics, diagnosis, comorbidities, labs, dialysis history, complications, access, cannulation, previous visits, clinician notes and core-engine output" testId="patient-360-panel">
        <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-6 gap-4">
          <Metric label="Primary renal diagnosis" value={patient.primaryDiagnosis} />
          <Metric label="Dialysis vintage" value={patient.dialysisVintageMonths} unit="months" />
          <Metric label="Access" value={patient.vascular.type} sub={patient.vascular.site} />
          <Metric label="Access flow" value={patient.vascular.lastFlowMlMin} unit="mL/min" tone={patient.vascular.lastFlowMlMin < 600 ? "alert" : "ok"} />
          <Metric label="Kt/V" value={patient.labs[0].ktv} tone={patient.labs[0].ktv < 1.2 ? "alert" : "ok"} sub={`URR ${patient.labs[0].urr}%`} />
          <Metric label="Haemoglobin" value={patient.labs[0].hb} unit="g/dL" tone={patient.labs[0].hb < 10 ? "warn" : "ok"} />
          <Metric label="Potassium" value={patient.labs[0].potassium} unit="mmol/L" tone={patient.labs[0].potassium >= 5.5 ? "alert" : "ok"} />
          <Metric label="Creatinine" value={patient.labs[0].creatinine} unit="mg/dL" />
          <Metric label="Dry weight" value={patient.dryWeight} unit="kg" />
          <Metric label="Sessions on record" value={patient.sessions.length} />
          <Metric label="Historical access events" value={insight.stats.accessEvents} />
          <Metric label="Hypotension episodes (last 10)" value={insight.stats.hypotensionCount} tone={insight.stats.hypotensionCount >= 2 ? "alert" : "ok"} />
        </div>
        <div className="flex flex-wrap gap-3 mt-6">
          <Button variant="outline" data-testid="doc-goto-clinical" onClick={() => navigate("/doctor/clinical-history")}>Clinical history</Button>
          <Button variant="outline" data-testid="doc-goto-dialysis" onClick={() => navigate("/doctor/dialysis-history")}>Dialysis history</Button>
          <Button variant="outline" data-testid="doc-goto-vascular" onClick={() => navigate("/doctor/vascular")}>Vascular access</Button>
          <Button className="bg-blue-600 hover:bg-blue-700" data-testid="doc-goto-core" onClick={() => navigate("/doctor/core-analysis")}>Core analysis</Button>
        </div>
      </Panel>
      <OverviewTab patient={patient} insight={insight} onOpenTab={(t) => navigate(t === "vascular" ? "/doctor/vascular" : "/doctor/clinical-history")} />
    </div>
  );
}

export function DoctorClinicalHistory() {
  const { patient, insight } = usePatientContext();
  if (!patient) return <NoPatient to="/doctor/patients" />;
  return (
    <div className="space-y-4">
      <PatientBanner patient={patient} insight={insight} compact />
      <Panel title="Previous visits & clinician opinions" hint="Longitudinal clinical record" testId="clinical-visits-panel">
        <ul className="space-y-3">
          {patient.notes.map((n, i) => (
            <li key={i} className="border-l-2 border-blue-600 pl-4 py-1">
              <p className="metric-num text-xs text-slate-500">{n.date} · {n.by}</p>
              <p className="text-sm text-slate-700 mt-1">{n.text}</p>
            </li>
          ))}
        </ul>
      </Panel>
      <HistoryTab patient={patient} />
    </div>
  );
}

export function DoctorDialysisHistory() {
  const { patient, insight } = usePatientContext();
  if (!patient) return <NoPatient to="/doctor/patients" />;
  const data = patient.sessions.map((s) => ({ name: `#${s.sessionNo}`, qb: s.bloodFlow, uf: s.ufAchieved, vp: s.venousPressure, sbp: Number(s.preBP.split("/")[0]), gain: +(s.preWeight - patient.dryWeight).toFixed(1) }));
  return (
    <div className="space-y-4">
      <PatientBanner patient={patient} insight={insight} compact />
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <Panel title="Session parameter trends" hint="Blood flow and venous pressure across all recorded sessions" testId="doctor-param-trend">
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data} margin={{ top: 5, right: 8, left: -18, bottom: 0 }}>
                <CartesianGrid stroke="#e2e8f0" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} stroke="#94a3b8" />
                <YAxis tick={{ fontSize: 10 }} stroke="#94a3b8" />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 6 }} />
                <Line type="monotone" dataKey="qb" stroke="#2563eb" strokeWidth={2} dot={false} name="Qb" />
                <Line type="monotone" dataKey="vp" stroke="#dc2626" strokeWidth={2} dot={false} name="Venous P" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Panel>
        <Panel title="Interdialytic weight gain & pre-session systolic BP" hint="Fluid management over time" testId="doctor-iwg-trend">
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data} margin={{ top: 5, right: 8, left: -18, bottom: 0 }}>
                <CartesianGrid stroke="#e2e8f0" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} stroke="#94a3b8" />
                <YAxis tick={{ fontSize: 10 }} stroke="#94a3b8" />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 6 }} />
                <Line type="monotone" dataKey="gain" stroke="#10b981" strokeWidth={2} dot={false} name="IDWG (kg)" />
                <Line type="monotone" dataKey="sbp" stroke="#f59e0b" strokeWidth={2} dot={false} name="Pre SBP" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Panel>
      </div>
      <HistoryTab patient={patient} />
    </div>
  );
}

export function DoctorVascular() {
  const { patient, insight } = usePatientContext();
  if (!patient) return <NoPatient to="/doctor/patients" />;
  return (
    <div className="space-y-4">
      <PatientBanner patient={patient} insight={insight} compact />
      <VascularTab patient={patient} insight={insight} />
    </div>
  );
}

export function DoctorCoreAnalysis() {
  const { patient, insight } = usePatientContext();
  const navigate = useNavigate();
  if (!patient) return <NoPatient to="/doctor/patients" />;
  return (
    <div className="space-y-4">
      <PatientBanner patient={patient} insight={insight} compact />
      <CoreEngineRunner patient={patient} onComplete={() => navigate("/doctor/reports")} ctaLabel="Open prescription report" />
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <Panel title="Trend analysis" hint="Current session versus longitudinal history" testId="core-trend-analysis">
          <div className="space-y-3">
            {[
              { label: "Access flow trend", t: insight.stats.flowTrend },
              { label: "Venous pressure trend", t: insight.stats.vpTrend },
              { label: "Achieved blood flow trend", t: insight.stats.qbTrend },
              { label: "Dialysis adequacy (Kt/V) trend", t: insight.stats.ktvTrend },
            ].map((r) => (
              <div key={r.label} className="flex items-center justify-between rounded border border-slate-200 px-3 py-2.5">
                <span className="text-sm text-slate-700">{r.label}</span>
                <TrendBadge direction={r.t.direction} pct={r.t.pct} />
              </div>
            ))}
          </div>
          <p className="text-xs text-slate-500 mt-3">Prototype Analysis · Decision Support Only · Requires Qualified Clinical Review</p>
        </Panel>
        <Panel title="Goal / objective checks" hint="Rule-based objective status" testId="core-goal-checks">
          <div className="space-y-3">
            {[
              { g: "Access supports prescribed blood flow", ok: insight.accessStatus.level === "low", note: insight.accessStatus.objective },
              { g: "Dialysis adequacy Kt/V ≥ 1.2", ok: patient.labs[0].ktv >= 1.2, note: `Current Kt/V ${patient.labs[0].ktv}` },
              { g: "Serum potassium < 5.5 mmol/L", ok: patient.labs[0].potassium < 5.5, note: `Current ${patient.labs[0].potassium} mmol/L` },
              { g: "Haemoglobin ≥ 10 g/dL", ok: patient.labs[0].hb >= 10, note: `Current ${patient.labs[0].hb} g/dL` },
              { g: "Ultrafiltration targets met", ok: insight.stats.ufShortfall < 3, note: `${insight.stats.ufShortfall} shortfall session(s) in last 10` },
            ].map((r) => (
              <div key={r.g} className={`rounded border p-3 ${levelColor(r.ok ? "low" : "moderate")}`}>
                <p className="text-sm font-bold">{r.ok ? "Objective achieved" : "Objective not achieved"} — {r.g}</p>
                <p className="text-xs mt-1 opacity-90">{r.note}</p>
              </div>
            ))}
          </div>
        </Panel>
      </div>
    </div>
  );
}

export function DoctorReports() {
  const { patient, insight } = usePatientContext();
  if (!patient) return <NoPatient to="/doctor/patients" />;
  return (
    <div className="space-y-4">
      <PatientBanner patient={patient} insight={insight} compact />
      <ReportTab patient={patient} insight={insight} />
    </div>
  );
}

export function DoctorClinicalReview() {
  const { patient, insight } = usePatientContext();
  const { user, getDraft, updateDraft } = useApp();
  const [comment, setComment] = useState("");
  if (!patient) return <NoPatient to="/doctor/patients" />;
  const draft = getDraft(patient);
  const so = draft.signOff;
  const status = so.status || (so.accepted ? "approved" : "pending");

  const decide = (decision) => {
    if (!so.clinician.trim() && !user?.name) return toast.error("Enter the reviewing clinician's name.");
    updateDraft(patient, "signOff", {
      clinician: so.clinician.trim() || user.name,
      designation: so.designation || user.title,
      accepted: decision === "approved",
      status: decision,
      comment,
      at: new Date().toISOString(),
    });
    toast[decision === "approved" ? "success" : "info"](
      decision === "approved" ? "Prescription report approved" : "Returned for review",
      { description: decision === "approved" ? "Operator may now view machine insights." : "Operator notified; recommendation not to be applied." }
    );
  };

  return (
    <div className="space-y-4">
      <PatientBanner patient={patient} insight={insight} compact />
      <Panel title="Clinical Review & Sign-Off" hint="Mandatory before any recommendation is applied at the machine" testId="clinical-review-panel">
        <div className={`rounded-md border p-4 ${status === "approved" ? levelColor("low") : status === "returned" ? levelColor("moderate") : levelColor("info")}`}>
          <p className="overline">Review status</p>
          <p className="text-sm font-bold mt-1" data-testid="review-status">
            {status === "approved" ? "Approved — reviewed by clinician" : status === "returned" ? "Returned for review" : "Pending clinician review"}
          </p>
          {so.at && <p className="text-xs mt-1">{so.clinician || user?.name} · {new Date(so.at).toLocaleString()}</p>}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-5">
          <Metric label="Recommended blood flow" value={insight.tuning.bloodFlow} unit="mL/min" />
          <Metric label="Recommended duration" value={insight.tuning.durationMin} unit="min" />
          <Metric label="Recommended UF target" value={insight.tuning.ufTargetL} unit="L" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-5">
          <label className="block">
            <span className="overline">Reviewing clinician</span>
            <Input data-testid="review-clinician-input" className="mt-1.5" value={so.clinician} onChange={(e) => updateDraft(patient, "signOff", { clinician: e.target.value })} placeholder={user?.name} />
          </label>
          <label className="block">
            <span className="overline">Designation</span>
            <Input data-testid="review-designation-input" className="mt-1.5" value={so.designation} onChange={(e) => updateDraft(patient, "signOff", { designation: e.target.value })} placeholder={user?.title} />
          </label>
        </div>
        <label className="block mt-4">
          <span className="overline">Review comment</span>
          <Textarea data-testid="review-comment-input" className="mt-1.5" rows={3} value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Reason for approval or for returning the recommendation..." />
        </label>

        <div className="flex flex-wrap gap-3 mt-5">
          <Button data-testid="approve-btn" className="bg-emerald-600 hover:bg-emerald-700" onClick={() => decide("approved")}>
            <ShieldCheck className="h-4 w-4 mr-1.5" /> Approve recommendation
          </Button>
          <Button data-testid="return-btn" variant="outline" onClick={() => decide("returned")}>
            <Undo2 className="h-4 w-4 mr-1.5" /> Return for review
          </Button>
        </div>
        <p className="text-xs text-slate-500 mt-3">
          Recommendations are never applied automatically. The operator receives machine insights only after approval is recorded here.
        </p>
      </Panel>
    </div>
  );
}
