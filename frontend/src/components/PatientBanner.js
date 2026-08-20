import { Link } from "react-router-dom";
import { AlertTriangle, HeartPulse, Phone, UserRound } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { patients, getPatient } from "@/data/mockData";
import { buildInsight, levelColor } from "@/lib/engine";
import { EmptyState } from "@/components/Bits";

export const usePatientContext = () => {
  const { selectedPatientId, getDraft, customPatients } = useApp();
  const patient = customPatients.find((p) => p.id === selectedPatientId) || getPatient(selectedPatientId);
  const draft = patient ? getDraft(patient) : null;
  const insight = patient ? buildInsight(patient, draft) : null;
  return { patient, draft, insight };
};

export const NoPatient = ({ to = "/operator/search" }) => (
  <div className="dg-card p-8" data-testid="no-patient-state">
    <EmptyState text="No patient selected. Choose a patient to load their consolidated evidence." />
    <div className="text-center mt-4">
      <Link to={to} className="text-sm font-semibold text-saffron-warm hover:text-saffron transition-colors">Go to patient search →</Link>
    </div>
  </div>
);

export const PatientBanner = ({ patient, insight, compact = false }) => {
  const highCount = insight.attention.filter((a) => a.severity === "high").length;
  return (
    <div className="dg-card p-5" data-testid="patient-banner">
      <div className="flex flex-col lg:flex-row lg:items-center gap-5 justify-between">
        <div className="flex items-start gap-4 min-w-0">
          <div className="h-12 w-12 rounded bg-navy-tint border border-[#c3dcf7] grid place-items-center shrink-0">
            <HeartPulse className="h-6 w-6 text-navy" />
          </div>
          <div className="min-w-0">
            <p className="overline">Patient · Session #{patient.nextSessionNo}</p>
            <h1 className="font-head text-2xl font-extrabold mt-0.5" data-testid="patient-name">{patient.name}</h1>
            <p className="text-sm text-slate-600 mt-1">
              {patient.age} y · {patient.gender} · {patient.bloodGroup} · Dry weight {patient.dryWeight} kg · Vintage {patient.dialysisVintageMonths} mo
            </p>
            <p className="text-xs metric-num text-slate-500 mt-1">
              {patient.id} · UHID {patient.uhid} · <Phone className="h-3 w-3 inline" /> {patient.phone}
            </p>
          </div>
        </div>
        {!compact && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="dg-stat px-3 py-2">
              <p className="overline">Diagnosis</p>
              <p className="text-xs font-semibold mt-1">{patient.primaryDiagnosis}</p>
            </div>
            <div className="dg-stat px-3 py-2">
              <p className="overline">Access</p>
              <p className="text-xs font-semibold mt-1">{patient.vascular.type} · {patient.vascular.side}</p>
            </div>
            <div className={`rounded-lg border px-3 py-2 ${levelColor(insight.accessStatus.level)}`}>
              <p className="overline">Access risk</p>
              <p className="text-sm font-bold mt-1 uppercase" data-testid="banner-access-risk">{insight.accessStatus.level}</p>
            </div>
            <div className={`rounded-lg border px-3 py-2 ${highCount ? "bg-red-50 border-red-200" : "bg-emerald-50 border-emerald-200"}`}>
              <p className={`overline ${highCount ? "text-red-700" : "text-emerald-700"}`}>Attention</p>
              <p className={`metric-num text-sm font-bold mt-1 ${highCount ? "text-red-700" : "text-emerald-700"}`} data-testid="banner-attention-count">
                {highCount ? <><AlertTriangle className="h-3.5 w-3.5 inline mr-1" />{highCount} high</> : "None"}
              </p>
            </div>
          </div>
        )}
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        {patient.comorbidities.map((c) => (
          <span key={c} className="text-xs font-semibold px-2 py-1 rounded-lg border border-slate-200 bg-slate-50 text-slate-700">{c}</span>
        ))}
      </div>
    </div>
  );
};

export const PatientPickerList = ({ onPick, testId = "patient-list", renderExtra }) => {
  const { selectedPatientId, customPatients } = useApp();
  const allPatients = [...patients, ...customPatients];
  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-4" data-testid={testId}>
      {allPatients.map((p) => {
        const ins = buildInsight(p, null);
        const highs = ins.attention.filter((a) => a.severity === "high");
        return (
          <div key={p.id} className="flex flex-col gap-3">
          <button
            data-testid={`patient-card-${p.id}`}
            onClick={() => onPick(p.id)}
            className={`text-left bg-white border rounded-md shadow-sm hover:shadow-md transition-colors p-5 ${
              selectedPatientId === p.id ? "border-navy" : "border-slate-200 hover:border-slate-300"
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-head text-lg font-bold">{p.name}</h3>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-lg border ${levelColor(ins.accessStatus.level)}`}>
                    Access risk {ins.accessStatus.level}
                  </span>
                </div>
                <p className="metric-num text-xs text-slate-500 mt-1">{p.id} · UHID {p.uhid}</p>
                <p className="text-sm text-slate-600 mt-1.5">{p.age} y · {p.gender} · {p.primaryDiagnosis}</p>
              </div>
              <UserRound className="h-5 w-5 text-slate-400 shrink-0" />
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 pt-4 border-t border-slate-100">
              <div><p className="overline">Next session</p><p className="metric-num font-semibold mt-1">#{p.nextSessionNo}</p></div>
              <div><p className="overline">Access</p><p className="text-sm font-semibold mt-1">{p.vascular.type}</p></div>
              <div><p className="overline">Access flow</p><p className="metric-num font-semibold mt-1">{p.vascular.lastFlowMlMin}</p></div>
              <div><p className="overline">Schedule</p><p className="text-xs font-semibold mt-1">{p.schedule}</p></div>
            </div>
            {highs.length > 0 && (
              <p className="mt-3 text-xs font-semibold text-red-700 bg-red-50 border border-red-200 rounded px-3 py-2">
                {highs.length} high-priority attention point(s) · {highs[0].title}
              </p>
            )}
          </button>
          {renderExtra ? renderExtra(p) : null}
          </div>
        );
      })}
    </div>
  );
};
