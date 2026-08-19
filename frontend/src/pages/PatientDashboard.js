import { useMemo, useState } from "react";
import { useParams, Navigate } from "react-router-dom";
import { AlertTriangle, Phone, HeartPulse } from "lucide-react";
import AppShell from "@/components/AppShell";
import OverviewTab from "@/components/tabs/OverviewTab";
import VascularTab from "@/components/tabs/VascularTab";
import HistoryTab from "@/components/tabs/HistoryTab";
import SessionTab from "@/components/tabs/SessionTab";
import ReportTab from "@/components/tabs/ReportTab";
import { getPatient } from "@/data/mockData";
import { buildInsight, levelColor } from "@/lib/engine";
import { useApp } from "@/context/AppContext";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

export default function PatientDashboard() {
  const { id } = useParams();
  const patient = getPatient(id);
  const { getDraft } = useApp();
  const [tab, setTab] = useState("overview");

  const draft = patient ? getDraft(patient) : null;
  const insight = useMemo(() => (patient ? buildInsight(patient, draft) : null), [patient, draft]);

  if (!patient) return <Navigate to="/patients" replace />;

  const highCount = insight.attention.filter((a) => a.severity === "high").length;

  return (
    <AppShell back="/patients">
      <div className="bg-white border border-slate-200 rounded-md shadow-sm p-5 sm:p-6" data-testid="patient-header">
        <div className="flex flex-col lg:flex-row lg:items-center gap-5 justify-between">
          <div className="flex items-start gap-4 min-w-0">
            <div className="h-14 w-14 rounded bg-blue-50 border border-blue-200 grid place-items-center shrink-0">
              <HeartPulse className="h-7 w-7 text-blue-700" />
            </div>
            <div className="min-w-0">
              <p className="overline">Patient · Session #{patient.nextSessionNo}</p>
              <h1 className="font-head text-2xl sm:text-3xl font-extrabold mt-0.5" data-testid="patient-name">{patient.name}</h1>
              <p className="text-sm text-slate-600 mt-1">
                {patient.age} y · {patient.gender} · {patient.bloodGroup} · Dry weight {patient.dryWeight} kg
              </p>
              <p className="text-xs metric-num text-slate-500 mt-1">
                {patient.id} · UHID {patient.uhid} · <Phone className="h-3 w-3 inline" /> {patient.phone}
              </p>
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="rounded border border-slate-200 px-3 py-2">
              <p className="overline">Diagnosis</p>
              <p className="text-xs font-semibold mt-1">{patient.primaryDiagnosis}</p>
            </div>
            <div className="rounded border border-slate-200 px-3 py-2">
              <p className="overline">Vintage</p>
              <p className="metric-num text-sm font-semibold mt-1">{patient.dialysisVintageMonths} mo</p>
            </div>
            <div className={`rounded border px-3 py-2 ${levelColor(insight.accessStatus.level)}`}>
              <p className="overline">Access risk</p>
              <p className="text-sm font-bold mt-1 uppercase">{insight.accessStatus.level}</p>
            </div>
            <div className={`rounded border px-3 py-2 ${highCount ? "bg-red-50 border-red-200" : "bg-emerald-50 border-emerald-200"}`}>
              <p className={`overline ${highCount ? "text-red-700" : "text-emerald-700"}`}>Attention</p>
              <p className={`metric-num text-sm font-bold mt-1 ${highCount ? "text-red-700" : "text-emerald-700"}`}>
                {highCount ? <><AlertTriangle className="h-3.5 w-3.5 inline mr-1" />{highCount} high</> : "None"}
              </p>
            </div>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {patient.comorbidities.map((c) => (
            <span key={c} className="text-xs font-semibold px-2 py-1 rounded border border-slate-200 bg-slate-50 text-slate-700">{c}</span>
          ))}
        </div>
      </div>

      <div className="mt-4">
        <p className="overline mb-3">Evidence → Historical reconstruction → Vascular profile → Current inputs → Operator insight</p>
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="flex flex-wrap h-auto justify-start gap-1" data-testid="main-tabs">
            <TabsTrigger value="overview" data-testid="tab-overview">Pre-dialysis dashboard</TabsTrigger>
            <TabsTrigger value="vascular" data-testid="tab-vascular">Vascular access intelligence</TabsTrigger>
            <TabsTrigger value="history" data-testid="tab-history">Historical evidence</TabsTrigger>
            <TabsTrigger value="session" data-testid="tab-session">Current session &amp; telemetry</TabsTrigger>
            <TabsTrigger value="report" data-testid="tab-report">Prescription report</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-4"><OverviewTab patient={patient} insight={insight} onOpenTab={setTab} /></TabsContent>
          <TabsContent value="vascular" className="mt-4"><VascularTab patient={patient} insight={insight} /></TabsContent>
          <TabsContent value="history" className="mt-4"><HistoryTab patient={patient} /></TabsContent>
          <TabsContent value="session" className="mt-4"><SessionTab patient={patient} insight={insight} /></TabsContent>
          <TabsContent value="report" className="mt-4"><ReportTab patient={patient} insight={insight} /></TabsContent>
        </Tabs>
      </div>
    </AppShell>
  );
}
