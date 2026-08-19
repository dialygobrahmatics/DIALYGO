import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, ChevronRight, AlertTriangle, CalendarClock, Droplets } from "lucide-react";
import AppShell from "@/components/AppShell";
import { patients } from "@/data/mockData";
import { buildInsight, levelColor } from "@/lib/engine";
import { Input } from "@/components/ui/input";

const tierLabel = { high: "High attention", moderate: "Monitor", low: "Stable" };

export default function PatientRoster() {
  const navigate = useNavigate();
  const [q, setQ] = useState("");

  const rows = useMemo(
    () =>
      patients
        .filter((p) => `${p.name} ${p.id} ${p.uhid}`.toLowerCase().includes(q.toLowerCase()))
        .map((p) => ({ p, insight: buildInsight(p, null) })),
    [q]
  );

  const totalHigh = rows.filter((r) => r.insight.attention.some((a) => a.severity === "high")).length;

  return (
    <AppShell>
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div>
          <p className="overline">Today · {new Date().toDateString()}</p>
          <h1 className="font-head text-3xl sm:text-4xl font-extrabold mt-1">Session Worklist</h1>
          <p className="text-sm text-slate-600 mt-2 max-w-2xl">
            Select a patient to load their consolidated historical dialysis, vascular-access and clinical evidence before
            starting the procedure.
          </p>
        </div>
        <div className="flex gap-3">
          <div className="rounded-md border border-slate-200 bg-white px-4 py-3 min-w-[110px]">
            <p className="overline">Scheduled</p>
            <p className="metric-num text-2xl font-semibold mt-1" data-testid="stat-scheduled">{patients.length}</p>
          </div>
          <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 min-w-[110px]">
            <p className="overline text-red-700">Attention</p>
            <p className="metric-num text-2xl font-semibold mt-1 text-red-700" data-testid="stat-attention">{totalHigh}</p>
          </div>
        </div>
      </div>

      <div className="relative mt-6 max-w-md">
        <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <Input
          data-testid="patient-search-input"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search by patient name, DURISE ID or UHID"
          className="pl-9 h-11 bg-white"
        />
      </div>

      <div className="mt-6 grid grid-cols-1 xl:grid-cols-2 gap-4" data-testid="patient-roster">
        {rows.map(({ p, insight }) => {
          const highs = insight.attention.filter((a) => a.severity === "high");
          return (
            <button
              key={p.id}
              data-testid={`patient-card-${p.id}`}
              onClick={() => navigate(`/patient/${p.id}`)}
              className="text-left bg-white border border-slate-200 rounded-md shadow-sm hover:shadow-md hover:border-slate-300 transition-colors p-6"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="font-head text-xl font-bold">{p.name}</h2>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded border ${levelColor(p.riskTier)}`}>
                      {tierLabel[p.riskTier]}
                    </span>
                  </div>
                  <p className="text-xs metric-num text-slate-500 mt-1">{p.id} · UHID {p.uhid}</p>
                  <p className="text-sm text-slate-600 mt-2">
                    {p.age} y · {p.gender} · {p.bloodGroup} · {p.primaryDiagnosis}
                  </p>
                </div>
                <ChevronRight className="h-5 w-5 text-slate-400 shrink-0" />
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5 pt-5 border-t border-slate-100">
                <div>
                  <p className="overline">Next session</p>
                  <p className="metric-num font-semibold mt-1">#{p.nextSessionNo}</p>
                </div>
                <div>
                  <p className="overline">Access</p>
                  <p className="text-sm font-semibold mt-1">{p.vascular.type}</p>
                </div>
                <div>
                  <p className="overline">Access flow</p>
                  <p className="metric-num font-semibold mt-1">{p.vascular.lastFlowMlMin} <span className="text-xs text-slate-500">mL/min</span></p>
                </div>
                <div>
                  <p className="overline">Vintage</p>
                  <p className="metric-num font-semibold mt-1">{p.dialysisVintageMonths} <span className="text-xs text-slate-500">mo</span></p>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-2 text-xs">
                <span className="inline-flex items-center gap-1.5 text-slate-600">
                  <CalendarClock className="h-3.5 w-3.5" /> {p.schedule}
                </span>
                <span className="inline-flex items-center gap-1.5 text-slate-600">
                  <Droplets className="h-3.5 w-3.5" /> Dry weight {p.dryWeight} kg
                </span>
              </div>

              {highs.length > 0 && (
                <div className="mt-4 rounded border border-red-200 bg-red-50 px-3 py-2">
                  <p className="text-xs font-bold text-red-700 flex items-center gap-1.5">
                    <AlertTriangle className="h-3.5 w-3.5" /> {highs.length} high-priority attention point(s)
                  </p>
                  <p className="text-xs text-red-800 mt-1 line-clamp-2">{highs[0].title} — {highs[0].detail}</p>
                </div>
              )}
            </button>
          );
        })}
      </div>
    </AppShell>
  );
}
