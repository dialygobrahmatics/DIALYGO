import { useState } from "react";
import { toast } from "sonner";
import { Database, Plug, Settings as SettingsIcon, ShieldCheck, Users, Activity, Lock } from "lucide-react";
import { Panel, Metric } from "@/components/Bits";
import { patients } from "@/data/mockData";
import { platformUsers, doctorsDirectory, operatorsDirectory, ingestionJobs, integrations, machineFleet, auditActivity } from "@/data/adminData";
import { buildInsight, levelColor } from "@/lib/engine";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";

const Table = ({ cols, rows, testId }) => (
  <div className="overflow-x-auto">
    <table className="w-full text-sm" data-testid={testId}>
      <thead><tr className="text-left border-b border-slate-200">{cols.map((c) => <th key={c} className="overline py-2 pr-4 whitespace-nowrap">{c}</th>)}</tr></thead>
      <tbody>
        {rows.map((r, i) => (
          <tr key={i} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
            {r.map((cell, j) => <td key={j} className="py-2.5 pr-4 whitespace-nowrap">{cell}</td>)}
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

const Badge = ({ text, level }) => <span className={`text-xs font-bold px-2 py-0.5 rounded border ${levelColor(level)}`}>{text}</span>;

export function AdminHome() {
  return (
    <div className="space-y-4">
      <div className="bg-white border border-slate-200 rounded-md shadow-sm p-6">
        <p className="overline">Platform overview</p>
        <h1 className="font-head text-3xl font-extrabold mt-1">Admin Console</h1>
        <p className="text-sm text-slate-600 mt-3 max-w-3xl">Manage roles, patient records, historical data, ingestion and integration status for the Dialyso Phase-I prototype. All data shown is mock data.</p>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mt-5">
          <div className="rounded border border-slate-200 px-4 py-3"><p className="overline">Users</p><p className="metric-num text-2xl font-semibold mt-1" data-testid="admin-stat-users">{platformUsers.length}</p></div>
          <div className="rounded border border-slate-200 px-4 py-3"><p className="overline">Patients</p><p className="metric-num text-2xl font-semibold mt-1">{patients.length}</p></div>
          <div className="rounded border border-slate-200 px-4 py-3"><p className="overline">Doctors</p><p className="metric-num text-2xl font-semibold mt-1">{doctorsDirectory.length}</p></div>
          <div className="rounded border border-slate-200 px-4 py-3"><p className="overline">Operators</p><p className="metric-num text-2xl font-semibold mt-1">{operatorsDirectory.length}</p></div>
          <div className="rounded border border-amber-200 bg-amber-50 px-4 py-3"><p className="overline text-amber-800">Ingestion running</p><p className="metric-num text-2xl font-semibold mt-1 text-amber-800">{ingestionJobs.filter((j) => j.status === "Running").length}</p></div>
        </div>
      </div>
      <Panel title="Application activity" hint="Audit trail of access and actions (mock)" testId="admin-activity-panel">
        <Table testId="admin-activity-table" cols={["Time", "Actor", "Action"]} rows={auditActivity.map((a) => [<span className="metric-num text-xs">{a.at}</span>, <span className="metric-num text-xs">{a.actor}</span>, a.action])} />
      </Panel>
    </div>
  );
}

export function AdminUsers() {
  const [q, setQ] = useState("");
  const rows = platformUsers.filter((u) => `${u.name} ${u.id} ${u.role}`.toLowerCase().includes(q.toLowerCase()));
  return (
    <Panel title="Users & Profiles" hint="Manage roles and profile status" testId="admin-users-panel">
      <Input data-testid="admin-user-search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search users by name, ID or role" className="max-w-sm mb-4" />
      <Table
        testId="admin-users-table"
        cols={["ID", "Name", "Role", "Unit", "Status", "Last login", "Actions"]}
        rows={rows.map((u) => [
          <span className="metric-num text-xs">{u.id}</span>,
          <span className="font-semibold">{u.name}</span>,
          u.role,
          u.unit,
          <Badge text={u.status} level={u.status === "Active" ? "low" : u.status === "Invited" ? "info" : "moderate"} />,
          <span className="metric-num text-xs">{u.lastLogin}</span>,
          <Button size="sm" variant="outline" data-testid={`admin-manage-${u.id}`} onClick={() => toast.info(`Role management for ${u.name} (mock)`)}>Manage role</Button>,
        ])}
      />
    </Panel>
  );
}

export function AdminPatients() {
  return (
    <Panel title="Patients" hint="Patient records available on the platform" testId="admin-patients-panel">
      <Table
        testId="admin-patients-table"
        cols={["Dialyso ID", "UHID", "Name", "Age/Gender", "Diagnosis", "Access", "Sessions", "Access risk"]}
        rows={patients.map((p) => {
          const ins = buildInsight(p, null);
          return [
            <span className="metric-num text-xs">{p.id}</span>,
            <span className="metric-num text-xs">{p.uhid}</span>,
            <span className="font-semibold">{p.name}</span>,
            `${p.age} / ${p.gender}`,
            p.primaryDiagnosis,
            p.vascular.type,
            <span className="metric-num">{p.sessions.length}</span>,
            <Badge text={ins.accessStatus.level} level={ins.accessStatus.level} />,
          ];
        })}
      />
    </Panel>
  );
}

export function AdminDoctors() {
  return (
    <Panel title="Doctors" hint="Clinician directory and pending sign-offs" testId="admin-doctors-panel">
      <Table
        testId="admin-doctors-table"
        cols={["ID", "Name", "Speciality", "Unit", "Patients", "Pending sign-offs"]}
        rows={doctorsDirectory.map((d) => [
          <span className="metric-num text-xs">{d.id}</span>, <span className="font-semibold">{d.name}</span>, d.speciality, d.unit,
          <span className="metric-num">{d.patients}</span>,
          <Badge text={String(d.pendingSignOffs)} level={d.pendingSignOffs ? "moderate" : "low"} />,
        ])}
      />
    </Panel>
  );
}

export function AdminOperators() {
  return (
    <Panel title="Operators" hint="Operator roster and certification status" testId="admin-operators-panel">
      <Table
        testId="admin-operators-table"
        cols={["ID", "Name", "Unit", "Shift", "Sessions today", "Certification"]}
        rows={operatorsDirectory.map((o) => [
          <span className="metric-num text-xs">{o.id}</span>, <span className="font-semibold">{o.name}</span>, o.unit, o.shift,
          <span className="metric-num">{o.sessionsToday}</span>, o.certification,
        ])}
      />
    </Panel>
  );
}

export function AdminIngestion() {
  return (
    <Panel title="Data Ingestion" hint="Phase-I ingestion is manual entry, mock upload and simulated telemetry" testId="admin-ingestion-panel">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-5">
        <Metric label="Jobs completed" value={ingestionJobs.filter((j) => j.status === "Completed").length} />
        <Metric label="Jobs running" value={ingestionJobs.filter((j) => j.status === "Running").length} tone="warn" />
        <Metric label="Records ingested" value={ingestionJobs.reduce((a, b) => a + b.records, 0)} />
        <Metric label="Future-release sources" value={ingestionJobs.filter((j) => j.mode === "Roadmap").length} />
      </div>
      <Table
        testId="admin-ingestion-table"
        cols={["Job", "Source", "Records", "Status", "Mode", "Last run"]}
        rows={ingestionJobs.map((j) => [
          <span className="metric-num text-xs">{j.id}</span>, j.source, <span className="metric-num">{j.records}</span>,
          <Badge text={j.status} level={j.status === "Completed" ? "low" : j.status === "Running" ? "info" : "moderate"} />,
          j.mode, <span className="metric-num text-xs">{j.at}</span>,
        ])}
      />
      <p className="text-xs text-slate-500 mt-3">Automatic device capture, HIS integration and scanned report extraction are future releases.</p>
    </Panel>
  );
}

export function AdminIntegration() {
  return (
    <Panel title="Data Integration" hint="Interface status for Phase-I" testId="admin-integration-panel">
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {integrations.map((i) => (
          <div key={i.name} className="border border-slate-200 rounded-md p-4">
            <div className="flex items-start gap-2.5">
              <Plug className="h-4 w-4 text-slate-500 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-bold">{i.name}</p>
                <p className="text-xs text-slate-600 mt-1">{i.detail}</p>
                <span className={`inline-block text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border mt-3 ${levelColor(i.state === "Future release" ? "moderate" : "info")}`}>{i.state}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </Panel>
  );
}

export function AdminHistorical() {
  const totalSessions = patients.reduce((a, p) => a + p.sessions.length, 0);
  const totalLabs = patients.reduce((a, p) => a + p.labs.length, 0);
  const totalDocs = patients.reduce((a, p) => a + p.documents.length, 0);
  return (
    <div className="space-y-4">
      <Panel title="Historical Data" hint="Volume and retention of the longitudinal record used by the core engine" testId="admin-historical-panel">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Metric label="Dialysis sessions" value={totalSessions} />
          <Metric label="Laboratory panels" value={totalLabs} />
          <Metric label="Documents" value={totalDocs} />
          <Metric label="Vascular events" value={patients.reduce((a, p) => a + p.vascular.timeline.length, 0)} />
          <Metric label="Clinical notes" value={patients.reduce((a, p) => a + p.notes.length, 0)} />
        </div>
      </Panel>
      <Panel title="Per-patient historical coverage" testId="admin-coverage-panel">
        <Table
          testId="admin-coverage-table"
          cols={["Patient", "Sessions", "Labs", "Vascular events", "Documents", "Notes", "Earliest session"]}
          rows={patients.map((p) => [
            <span className="font-semibold">{p.name}</span>,
            <span className="metric-num">{p.sessions.length}</span>,
            <span className="metric-num">{p.labs.length}</span>,
            <span className="metric-num">{p.vascular.timeline.length}</span>,
            <span className="metric-num">{p.documents.length}</span>,
            <span className="metric-num">{p.notes.length}</span>,
            <span className="metric-num text-xs">{p.sessions[0].date}</span>,
          ])}
        />
      </Panel>
    </div>
  );
}

export function AdminMachineInsights() {
  return (
    <Panel title="Machine Insights" hint="Fleet monitoring — telemetry is simulated in Phase-I" testId="admin-machines-panel">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-5">
        <Metric label="Machines" value={machineFleet.length} />
        <Metric label="In session" value={machineFleet.filter((m) => m.status === "In session").length} />
        <Metric label="In maintenance" value={machineFleet.filter((m) => m.status === "Maintenance").length} tone="warn" />
        <Metric label="Alarms (24 h)" value={machineFleet.reduce((a, b) => a + b.alarms24h, 0)} tone="alert" />
      </div>
      <Table
        testId="admin-machines-table"
        cols={["Machine", "Model", "Unit", "Status", "Uptime", "Alarms 24h", "Last service"]}
        rows={machineFleet.map((m) => [
          <span className="metric-num text-xs">{m.id}</span>, m.model, m.unit,
          <Badge text={m.status} level={m.status === "In session" ? "info" : m.status === "Maintenance" ? "moderate" : "low"} />,
          <span className="metric-num">{m.uptime}</span>, <span className="metric-num">{m.alarms24h}</span>, <span className="metric-num text-xs">{m.lastService}</span>,
        ])}
      />
    </Panel>
  );
}

export function AdminReports() {
  return (
    <Panel title="Reports" hint="Prescription reports generated by the reporting layer" testId="admin-reports-panel">
      <Table
        testId="admin-reports-table"
        cols={["Report", "Patient", "Session", "Generated", "Sign-off status", "Dispatch"]}
        rows={patients.map((p, i) => [
          <span className="metric-num text-xs">RPT-{9100 + i}</span>,
          <span className="font-semibold">{p.name}</span>,
          <span className="metric-num">#{p.nextSessionNo - 1}</span>,
          <span className="metric-num text-xs">{p.sessions[p.sessions.length - 1].date}</span>,
          <Badge text={i === 0 ? "Approved" : i === 1 ? "Pending review" : "Returned for review"} level={i === 0 ? "low" : i === 1 ? "info" : "moderate"} />,
          i === 0 ? "WhatsApp (mocked)" : "—",
        ])}
      />
      <p className="text-xs text-slate-500 mt-3">Reports are decision support only and require clinician sign-off before any recommendation is applied.</p>
    </Panel>
  );
}

export function AdminSettings() {
  const [flags, setFlags] = useState({ telemetry: true, whatsapp: true, patientUpload: true, ml: false, ocr: false, his: false });
  const rows = [
    { key: "telemetry", label: "Simulated machine telemetry", phase: "Phase-I" },
    { key: "whatsapp", label: "Mocked WhatsApp dispatch", phase: "Phase-I" },
    { key: "patientUpload", label: "Patient document upload (mock)", phase: "Phase-I" },
    { key: "ml", label: "Predictive machine learning", phase: "Future release" },
    { key: "ocr", label: "Scanned report extraction (OCR)", phase: "Future release" },
    { key: "his", label: "Hospital management system integration", phase: "Future release" },
  ];
  return (
    <div className="space-y-4">
      <Panel title="Settings" hint="Feature availability for this prototype" testId="admin-settings-panel">
        <div className="space-y-3">
          {rows.map((r) => {
            const locked = r.phase !== "Phase-I";
            return (
              <div key={r.key} className="flex items-center justify-between rounded border border-slate-200 px-4 py-3">
                <div>
                  <p className="text-sm font-semibold flex items-center gap-2">{locked && <Lock className="h-3.5 w-3.5 text-slate-400" />}{r.label}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{locked ? "Future Release – Not Available in Phase I" : "Available in Phase I"}</p>
                </div>
                <Switch
                  data-testid={`setting-${r.key}`}
                  checked={flags[r.key]}
                  disabled={locked}
                  onCheckedChange={(v) => { setFlags((p) => ({ ...p, [r.key]: v })); toast.info(`${r.label} ${v ? "enabled" : "disabled"} (mock)`); }}
                />
              </div>
            );
          })}
        </div>
      </Panel>
      <Panel title="Governance & compliance" testId="admin-governance-panel">
        <ul className="space-y-3 text-sm text-slate-700">
          <li className="flex gap-2.5"><ShieldCheck className="h-4 w-4 text-blue-600 mt-0.5 shrink-0" /> DPDP Act 2023 consent is captured at login and in the patient profile; access is logged and auditable.</li>
          <li className="flex gap-2.5"><Users className="h-4 w-4 text-slate-600 mt-0.5 shrink-0" /> Role-based modules: patient, doctor, operator and admin see only their own workspace.</li>
          <li className="flex gap-2.5"><Activity className="h-4 w-4 text-slate-600 mt-0.5 shrink-0" /> No autonomous machine control; every recommendation requires clinician sign-off.</li>
          <li className="flex gap-2.5"><Database className="h-4 w-4 text-slate-600 mt-0.5 shrink-0" /> No hereditary or gene-level data is captured, stored or used anywhere in Dialyso.</li>
          <li className="flex gap-2.5"><SettingsIcon className="h-4 w-4 text-slate-600 mt-0.5 shrink-0" /> Phase-I uses synthetic mock data only.</li>
        </ul>
      </Panel>
    </div>
  );
}
