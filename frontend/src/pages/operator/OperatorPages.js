import { useNavigate } from "react-router-dom";
import { ArrowRight, CalendarClock, ClipboardCheck, Gauge, ListChecks, ShieldCheck, AlertTriangle, Activity, Upload, Loader2 } from "lucide-react";
import { Panel, Metric, TrendBadge, ContextLine, Field } from "@/components/Bits";
import { PatientBanner, PatientPickerList, NoPatient, usePatientContext } from "@/components/PatientBanner";
import CoreEngineRunner from "@/components/CoreEngineRunner";
import OverviewTab from "@/components/tabs/OverviewTab";
import VascularTab from "@/components/tabs/VascularTab";
import HistoryTab from "@/components/tabs/HistoryTab";
import SessionTab from "@/components/tabs/SessionTab";
import ReportTab from "@/components/tabs/ReportTab";
import { useApp } from "@/context/AppContext";
import { patients } from "@/data/mockData";
import { buildInsight, levelColor, contextFor } from "@/lib/engine";
import { machineFleet } from "@/data/adminData";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useState } from "react";

const workflow = [
  "Select patient",
  "Patient 360° summary",
  "Historical dialysis sessions",
  "Laboratory data",
  "Vascular access history",
  "Cannulation history",
  "Previous complications",
  "Current pre-session parameters",
  "Run core engine",
  "Prescription report",
  "Clinician review & sign-off",
  "Current dialysis session",
];

export const WorkflowStrip = ({ active }) => (
  <div className="dg-card p-4 overflow-x-auto" data-testid="workflow-strip">
    <p className="overline mb-3">Operator pre-session workflow</p>
    <ol className="flex items-center gap-2 min-w-max">
      {workflow.map((w, i) => (
        <li key={w} className="flex items-center gap-2">
          <span
            className={`text-xs font-semibold px-2.5 py-1.5 rounded-lg border whitespace-nowrap ${
              i === active ? "bg-navy text-white border-navy" : i < active ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-slate-50 text-slate-500 border-slate-200"
            }`}
          >
            {i + 1}. {w}
          </span>
          {i < workflow.length - 1 && <ArrowRight className="h-3.5 w-3.5 text-slate-300" />}
        </li>
      ))}
    </ol>
  </div>
);

export function OperatorHome() {
  const navigate = useNavigate();
  const { setSelectedPatientId, addCustomPatient, customPatients, reportRuns, setReportRun } = useApp();
  const rows = patients.map((p) => ({ p, insight: buildInsight(p, null) }));
  const highTotal = rows.filter((r) => r.insight.attention.some((a) => a.severity === "high")).length;

  const [uploadedName, setUploadedName] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState({ name: "", age: "", gender: "Male", uhid: "", diagnosis: "", accessType: "AV Fistula", accessFlow: "", nextSession: "", schedule: "" });

  const onFileSelect = (e) => {
    const f = e.target.files && e.target.files[0];
    if (!f) return;
    setUploadedName(f.name);
    setFormOpen(true);
    e.target.value = "";
  };

  const submitForm = () => {
    addCustomPatient(form);
    setFormOpen(false);
    setForm({ name: "", age: "", gender: "Male", uhid: "", diagnosis: "", accessType: "AV Fistula", accessFlow: "", nextSession: "", schedule: "" });
  };

  const runReport = (id) => {
    setReportRun(id, "processing");
    setTimeout(() => setReportRun(id, "complete"), 2500);
  };

  const renderExtra = (p) => {
    if (!p.isCustom) return null;
    const state = reportRuns[p.id] || "idle";
    return (
      <div data-testid={`new-patient-extra-${p.id}`}>
        {state !== "complete" ? (
          <Button
            data-testid={`run-report-btn-${p.id}`}
            disabled={state === "processing"}
            onClick={() => runReport(p.id)}
            className="bg-saffron hover:bg-saffron-warm text-white font-bold"
          >
            {state === "processing" ? <><Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> Analyzing...</> : "Run Report"}
          </Button>
        ) : (
          <Panel title="Prescription Report — Prototype Analysis" hint="Decision Support Only · Requires Qualified Clinical Review" testId={`generated-report-${p.id}`}>
            <p className="overline">Summary</p>
            <p className="text-sm text-slate-700 mt-1.5">
              Consolidated review of the available dialysis, vascular-access and laboratory evidence indicates a session
              profile consistent with the patient's recent baseline. Reviewed by DR. Gireesh Reddy.
            </p>
            <p className="overline mt-5">Risk flag</p>
            <div className={`rounded-xl border p-3 mt-1.5 ${levelColor("moderate")}`}>
              <p className="text-sm font-bold">Access dysfunction risk — moderate</p>
              <p className="text-xs mt-1 opacity-90">Illustrative flag derived from recorded access history and cannulation entries.</p>
            </div>
            <p className="overline mt-5">Recommendation</p>
            <p className="text-sm text-slate-700 mt-1.5">
              Continue the prescribed parameters for this session and repeat access-flow surveillance at the next review,
              subject to clinician sign-off before any change is applied at the machine.
            </p>
          </Panel>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <div className="dg-card p-6">
        <p className="overline">Today · {new Date().toDateString()}</p>
        <h1 className="font-head text-3xl font-extrabold mt-1">Operator Console</h1>
        <p className="text-sm text-slate-600 mt-3 max-w-3xl">
          Before every dialysis session, review the patient's consolidated historical dialysis, vascular-access and clinical
          evidence — so the current procedure is performed with context rather than isolated machine readings.
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5">
          <div className="dg-stat px-4 py-3"><p className="overline">Scheduled today</p><p className="metric-num text-2xl font-semibold mt-1" data-testid="op-stat-scheduled">{patients.length}</p></div>
          <div className="dg-stat border-red-200 bg-red-50 px-4 py-3"><p className="overline text-red-700">Patients with high attention</p><p className="metric-num text-2xl font-semibold mt-1 text-red-700" data-testid="op-stat-attention">{highTotal}</p></div>
          <div className="dg-stat border-amber-200 bg-amber-50 px-4 py-3"><p className="overline text-amber-800">Awaiting sign-off</p><p className="metric-num text-2xl font-semibold mt-1 text-amber-800">1</p></div>
          <div className="dg-stat px-4 py-3"><p className="overline">Machines in session</p><p className="metric-num text-2xl font-semibold mt-1">{machineFleet.filter((m) => m.status === "In session").length}</p></div>
        </div>
      </div>

      <Panel title="Upload patient record" hint="Any file type. The file is not read or processed — it opens the manual entry form." testId="upload-record-panel">
        <div className="flex flex-wrap items-center gap-3">
          <label className="inline-flex items-center gap-2 cursor-pointer">
            <span className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-navy hover:bg-navy-deep text-white text-sm font-semibold transition-colors">
              <Upload className="h-4 w-4" /> Upload file
            </span>
            <input data-testid="operator-file-input" type="file" className="hidden" onChange={onFileSelect} />
          </label>
          {uploadedName && (
            <span className="flex items-center gap-2 text-sm">
              <span className="text-slate-700" data-testid="uploaded-file-name">{uploadedName}</span>
              <span className="text-xs font-bold px-2 py-0.5 rounded-lg border bg-emerald-50 text-emerald-700 border-emerald-200" data-testid="uploaded-label">Uploaded</span>
            </span>
          )}
        </div>
      </Panel>

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-2xl" data-testid="patient-details-modal">
          <DialogHeader>
            <DialogTitle>Enter Patient Details</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Field label="Name"><Input data-testid="form-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
            <Field label="Age"><Input data-testid="form-age" type="number" value={form.age} onChange={(e) => setForm({ ...form, age: e.target.value })} /></Field>
            <Field label="Gender">
              <select data-testid="form-gender" value={form.gender} onChange={(e) => setForm({ ...form, gender: e.target.value })} className="w-full h-10 rounded-lg border border-slate-200 px-3 text-sm bg-white">
                {["Male", "Female", "Other"].map((g) => <option key={g}>{g}</option>)}
              </select>
            </Field>
            <Field label="UHID"><Input data-testid="form-uhid" value={form.uhid} onChange={(e) => setForm({ ...form, uhid: e.target.value })} /></Field>
            <Field label="Diagnosis"><Input data-testid="form-diagnosis" value={form.diagnosis} onChange={(e) => setForm({ ...form, diagnosis: e.target.value })} /></Field>
            <Field label="Access Type">
              <select data-testid="form-access-type" value={form.accessType} onChange={(e) => setForm({ ...form, accessType: e.target.value })} className="w-full h-10 rounded-lg border border-slate-200 px-3 text-sm bg-white">
                {["AV Fistula", "AV Graft", "Catheter"].map((a) => <option key={a}>{a}</option>)}
              </select>
            </Field>
            <Field label="Access Flow"><Input data-testid="form-access-flow" type="number" value={form.accessFlow} onChange={(e) => setForm({ ...form, accessFlow: e.target.value })} /></Field>
            <Field label="Next Session"><Input data-testid="form-next-session" value={form.nextSession} onChange={(e) => setForm({ ...form, nextSession: e.target.value })} /></Field>
            <Field label="Schedule"><Input data-testid="form-schedule" value={form.schedule} onChange={(e) => setForm({ ...form, schedule: e.target.value })} /></Field>
          </div>
          <div className="flex justify-end mt-2">
            <Button data-testid="patient-details-submit-btn" onClick={submitForm} className="bg-saffron hover:bg-saffron-warm text-white font-bold">Submit</Button>
          </div>
        </DialogContent>
      </Dialog>

      <WorkflowStrip active={0} />

      <Panel title="Today's worklist" hint="Select a patient to open the pre-session review" testId="operator-worklist">
        <PatientPickerList onPick={(id) => { setSelectedPatientId(id); navigate("/operator/pre-session"); }} renderExtra={renderExtra} />
      </Panel>
    </div>
  );
}

export function OperatorPatientSearch() {
  const navigate = useNavigate();
  const { setSelectedPatientId } = useApp();
  return (
    <div className="space-y-4">
      <WorkflowStrip active={0} />
      <Panel title="Patient Search" hint="Search by name, DialyGo ID or UHID from the top bar, or select from the unit list" testId="patient-search-panel">
        <PatientPickerList onPick={(id) => { setSelectedPatientId(id); navigate("/operator/pre-session"); }} testId="search-patient-list" />
      </Panel>
    </div>
  );
}

export function OperatorPreSession() {
  const { patient, insight } = usePatientContext();
  const navigate = useNavigate();
  const [checks, setChecks] = useState({});
  if (!patient) return <NoPatient />;

  const s = patient.sessions;
  const last = s[s.length - 1];
  const prev = s[s.length - 2];
  const iwg = +(last.preWeight - patient.dryWeight).toFixed(1);
  const checklist = [
    "Patient identity and session number confirmed",
    "Previous session summary reviewed",
    "Laboratory results reviewed",
    "Vascular access history and cannulation record reviewed",
    "Previous complications reviewed",
    "Pre-session vitals and weight recorded",
    "Prescription verified against chart",
  ];

  return (
    <div className="space-y-4">
      <WorkflowStrip active={1} />
      <PatientBanner patient={patient} insight={insight} />

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <Panel title="Previous session summary" hint={`Session #${last.sessionNo} · ${last.date}`} testId="previous-session-panel">
          <div className="grid grid-cols-2 gap-4">
            <Metric label="Blood flow" value={last.bloodFlow} unit="mL/min" />
            <Metric label="Duration" value={last.durationMin} unit="min" />
            <Metric label="UF target / achieved" value={`${last.ufTarget}/${last.ufAchieved}`} unit="L" />
            <Metric label="Pre → post weight" value={`${last.preWeight} → ${last.postWeight}`} unit="kg" />
            <Metric label="Pre → post BP" value={`${last.preBP} → ${last.postBP}`} />
            <Metric label="Venous pressure" value={last.venousPressure} unit="mmHg" tone={last.venousPressure > 200 ? "alert" : "default"} />
            <Metric label="Cannulation attempts" value={last.cannulationAttempts} tone={last.cannulationAttempts > 1 ? "warn" : "ok"} />
            <Metric label="Outcome" value={last.outcome} tone={last.complications.length ? "warn" : "ok"} />
          </div>
          <p className="text-sm text-slate-700 mt-4">{last.operatorNotes}</p>
          <p className="text-xs text-slate-500 mt-2">Prior session #{prev.sessionNo} outcome: {prev.outcome}</p>
        </Panel>

        <Panel title="Interdialytic weight gain & vitals context" hint="Current session compared with the patient's own baseline" testId="iwg-panel">
          <div className="grid grid-cols-2 gap-4">
            <Metric label="Dry weight" value={patient.dryWeight} unit="kg" />
            <Metric label="Last pre-session weight" value={last.preWeight} unit="kg" />
            <Metric label="Last interdialytic gain" value={iwg} unit="kg" tone={iwg > 2.5 ? "warn" : "ok"} />
            <Metric label="Last pre-session BP" value={last.preBP} unit="mmHg" />
          </div>
          <div className="mt-4 space-y-3">
            <div className="rounded-lg border border-slate-200 p-3">
              <p className="overline">Pre-session weight baseline</p>
              <ContextLine ctx={contextFor(s, "preWeight", last.preWeight)} unit="kg" />
            </div>
            <div className="rounded-lg border border-slate-200 p-3">
              <p className="overline">Achieved ultrafiltration baseline</p>
              <ContextLine ctx={contextFor(s, "ufAchieved", last.ufAchieved)} unit="L" />
            </div>
          </div>
        </Panel>

        <Panel title="Cannulation record — early-warning indicator" hint="Attempts and infiltration events across the last 10 sessions" testId="cannulation-panel">
          <div className="space-y-2">
            {s.slice(-10).reverse().map((x) => (
              <div key={x.sessionNo} className={`flex items-center justify-between rounded-lg border px-3 py-2 text-sm ${x.infiltration || x.cannulationAttempts > 1 ? "border-amber-200 bg-amber-50" : "border-slate-200"}`}>
                <span className="metric-num text-xs text-slate-600">#{x.sessionNo} · {x.date}</span>
                <span className="text-xs font-semibold">
                  {x.cannulationAttempts} attempt{x.cannulationAttempts > 1 ? "s" : ""}{x.infiltration ? " · infiltration" : ""}
                </span>
              </div>
            ))}
          </div>
          <p className="text-xs text-slate-500 mt-3">
            Repeated attempts and infiltration events are treated as a low-cost early-warning signal for access dysfunction.
          </p>
        </Panel>
      </div>

      <Panel title="Pre-session checklist" hint="Confirm the consolidated evidence has been reviewed before connection" testId="pre-session-checklist">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {checklist.map((c, i) => (
            <label key={i} className="flex items-start gap-3 dg-stat px-3 py-2.5 cursor-pointer hover:border-slate-300 transition-colors">
              <Checkbox data-testid={`checklist-item-${i}`} checked={!!checks[i]} onCheckedChange={(v) => setChecks((p) => ({ ...p, [i]: !!v }))} />
              <span className="text-sm text-slate-700">{c}</span>
            </label>
          ))}
        </div>
        <div className="flex flex-wrap gap-3 mt-5">
          <Button data-testid="goto-history-btn" variant="outline" onClick={() => navigate("/operator/history")}>Review patient history</Button>
          <Button data-testid="goto-vascular-btn" variant="outline" onClick={() => navigate("/operator/vascular")}>Review vascular access</Button>
          <Button data-testid="goto-session-btn" className="bg-saffron hover:bg-saffron-warm text-white font-bold" onClick={() => navigate("/operator/current-session")}>Enter pre-session parameters</Button>
        </div>
      </Panel>

      <OverviewTab patient={patient} insight={insight} onOpenTab={(t) => navigate(t === "vascular" ? "/operator/vascular" : "/operator/history")} />

      <CoreEngineRunner patient={patient} onComplete={() => navigate("/operator/reports")} />
    </div>
  );
}

export function OperatorCurrentSession() {
  const { patient, insight } = usePatientContext();
  const navigate = useNavigate();
  if (!patient) return <NoPatient />;
  return (
    <div className="space-y-4">
      <WorkflowStrip active={7} />
      <PatientBanner patient={patient} insight={insight} compact />
      <SessionTab patient={patient} insight={insight} />
      <CoreEngineRunner patient={patient} onComplete={() => navigate("/operator/reports")} />
    </div>
  );
}

export function OperatorPatientHistory() {
  const { patient, insight } = usePatientContext();
  if (!patient) return <NoPatient />;
  return (
    <div className="space-y-4">
      <WorkflowStrip active={2} />
      <PatientBanner patient={patient} insight={insight} compact />
      <HistoryTab patient={patient} />
    </div>
  );
}

export function OperatorVascular() {
  const { patient, insight } = usePatientContext();
  if (!patient) return <NoPatient />;
  return (
    <div className="space-y-4">
      <WorkflowStrip active={4} />
      <PatientBanner patient={patient} insight={insight} compact />
      <VascularTab patient={patient} insight={insight} />
    </div>
  );
}

export function OperatorReports() {
  const { patient, insight } = usePatientContext();
  if (!patient) return <NoPatient />;
  return (
    <div className="space-y-4">
      <WorkflowStrip active={9} />
      <PatientBanner patient={patient} insight={insight} compact />
      <ReportTab patient={patient} insight={insight} />
    </div>
  );
}

export function OperatorMachineInsights() {
  const { patient, insight } = usePatientContext();
  const { getDraft } = useApp();
  if (!patient) return <NoPatient />;
  const draft = getDraft(patient);
  const approved = draft.signOff.accepted && draft.signOff.status !== "returned";

  return (
    <div className="space-y-4">
      <PatientBanner patient={patient} insight={insight} compact />
      <Panel
        title="Machine Insights"
        hint="Machine-facing recommendations are released to the operator only after clinician review. The operator does not independently control the machine."
        testId="machine-insights-panel"
        right={<span className={`text-xs font-bold px-2 py-1 rounded-lg border ${approved ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-amber-50 text-amber-800 border-amber-200"}`}>
          {approved ? "Clinician approved" : "Awaiting clinician sign-off"}
        </span>}
      >
        {approved ? (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4" data-testid="approved-settings">
            <Metric label="Blood flow" value={insight.tuning.bloodFlow} unit="mL/min" />
            <Metric label="Dialysate flow" value={insight.tuning.dialysateFlow} unit="mL/min" />
            <Metric label="Duration" value={insight.tuning.durationMin} unit="min" />
            <Metric label="UF target" value={insight.tuning.ufTargetL} unit="L" />
            <Metric label="UF rate" value={insight.tuning.ufRateMlKgHr} unit="mL/kg/hr" />
          </div>
        ) : (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4" data-testid="machine-insights-locked">
            <p className="text-sm font-bold text-amber-900">Recommendations withheld until clinician sign-off is recorded</p>
            <p className="text-sm text-amber-800 mt-1">
              Open Session Reports, review the prescription report and obtain clinician sign-off. No recommendation may be
              applied at the machine before then.
            </p>
          </div>
        )}

        <p className="overline mt-6">Device status</p>
        <div className="overflow-x-auto mt-2">
          <table className="w-full text-sm" data-testid="machine-fleet-table">
            <thead><tr className="text-left border-b border-slate-200">{["Machine", "Model", "Unit", "Status", "Uptime", "Alarms 24h", "Last service"].map((h) => <th key={h} className="overline py-2 pr-4 whitespace-nowrap">{h}</th>)}</tr></thead>
            <tbody>
              {machineFleet.map((m) => (
                <tr key={m.id} className="border-b border-slate-100">
                  <td className="metric-num py-2.5 pr-4">{m.id}</td>
                  <td className="py-2.5 pr-4">{m.model}</td>
                  <td className="py-2.5 pr-4">{m.unit}</td>
                  <td className="py-2.5 pr-4"><span className={`text-xs font-bold px-2 py-0.5 rounded-lg border ${m.status === "In session" ? levelColor("info") : m.status === "Maintenance" ? levelColor("moderate") : levelColor("low")}`}>{m.status}</span></td>
                  <td className="metric-num py-2.5 pr-4">{m.uptime}</td>
                  <td className="metric-num py-2.5 pr-4">{m.alarms24h}</td>
                  <td className="metric-num py-2.5 pr-4">{m.lastService}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-slate-500 mt-3">Telemetry is simulated in Phase-I. Automatic device data capture is a future release.</p>
      </Panel>
    </div>
  );
}

export function OperatorProcedureSupport() {
  const { patient, insight } = usePatientContext();
  if (!patient) return <NoPatient />;
  return (
    <div className="space-y-4">
      <PatientBanner patient={patient} insight={insight} compact />
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <Panel title="Plan Now — during this session" hint="Decision-support prompts for review, not instructions" testId="procedure-plan-now">
          <ul className="space-y-2" data-testid="support-plan-now">
            {insight.planNow.map((p, i) => (
              <li key={i} className="flex gap-2.5 text-sm text-slate-700 dg-stat px-3 py-2.5">
                <ListChecks className="h-4 w-4 text-navy mt-0.5 shrink-0" />{p}
              </li>
            ))}
          </ul>
        </Panel>
        <Panel title="Plan Next — upcoming sessions" hint="Preparation and follow-up items" testId="procedure-plan-next">
          <ul className="space-y-2" data-testid="support-plan-next">
            {insight.planNext.map((p, i) => (
              <li key={i} className="flex gap-2.5 text-sm text-slate-700 dg-stat px-3 py-2.5">
                <CalendarClock className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />{p}
              </li>
            ))}
          </ul>
        </Panel>
        <Panel title="Risk flags to watch" hint="Derived from history, access records and laboratory data only" testId="procedure-risk-flags">
          <div className="space-y-3">
            {insight.riskFlags.map((f, i) => (
              <div key={i} className={`rounded-lg border p-3 ${levelColor(f.level)}`}>
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-bold">{f.name}</p>
                  <span className="text-xs font-bold uppercase">{f.level}</span>
                </div>
                <p className="text-xs mt-1 opacity-90">{f.basis}</p>
              </div>
            ))}
          </div>
        </Panel>
        <Panel title="Escalation & governance" hint="Who to involve and when" testId="procedure-escalation">
          <ul className="space-y-3 text-sm text-slate-700">
            <li className="flex gap-2.5"><ShieldCheck className="h-4 w-4 text-navy mt-0.5 shrink-0" /> Any change to prescribed parameters requires clinician sign-off in the prescription report before it is applied.</li>
            <li className="flex gap-2.5"><AlertTriangle className="h-4 w-4 text-red-600 mt-0.5 shrink-0" /> Escalate immediately for symptomatic hypotension, suspected access rupture, prolonged bleeding or new access-site infection.</li>
            <li className="flex gap-2.5"><Gauge className="h-4 w-4 text-slate-600 mt-0.5 shrink-0" /> Persistent high venous pressure or repeated cannulation failure — inform the nephrologist and record in the session log.</li>
            <li className="flex gap-2.5"><Activity className="h-4 w-4 text-slate-600 mt-0.5 shrink-0" /> Operators do not adjust machine settings autonomously; recommendations are decision support only.</li>
          </ul>
          <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4">
            <p className="overline">Access status objective</p>
            <p className="text-sm font-semibold mt-1.5">{insight.accessStatus.objective}</p>
            <p className="text-sm text-slate-600 mt-1">{insight.accessStatus.summary}</p>
          </div>
        </Panel>
      </div>
    </div>
  );
}
