import { useState } from "react";
import { toast } from "sonner";
import { FileDown, MessageCircle, ShieldCheck, Stamp, AlertTriangle, CheckCircle2, ListChecks } from "lucide-react";
import { Panel, Metric } from "@/components/Bits";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { useApp } from "@/context/AppContext";
import { levelColor } from "@/lib/engine";
import { whatsappTemplates } from "@/data/mockData";

export default function ReportTab({ patient, insight }) {
  const { operator, getDraft, updateDraft, whatsappLog, addWhatsapp } = useApp();
  const draft = getDraft(patient);
  const signOff = draft.signOff;
  const [phone, setPhone] = useState(patient.phone);

  const signed = signOff.accepted && signOff.clinician.trim().length > 1;

  const sign = () => {
    if (!signOff.clinician.trim()) return toast.error("Enter the reviewing clinician's name.");
    updateDraft(patient, "signOff", { accepted: true, at: new Date().toISOString() });
    toast.success("Clinician sign-off recorded", { description: "Recommendations may now be applied at the machine." });
  };

  const sendWhatsapp = (kind) => {
    if (!signed) return toast.error("Clinician sign-off is required before dispatch.");
    const body = kind === "pdf" ? whatsappTemplates.reportDispatch(patient) : whatsappTemplates.sessionSummary(patient, { sessionNo: patient.nextSessionNo, date: new Date().toISOString().slice(0, 10), durationMin: insight.tuning.durationMin, ufAchieved: draft.after.actualUf || insight.tuning.ufTargetL });
    addWhatsapp({ to: phone, kind: kind === "pdf" ? "PDF report" : "Text message", body, attachment: kind === "pdf" ? `DURISE_Session_${patient.nextSessionNo}_${patient.id}.pdf` : null });
    toast.success(`WhatsApp ${kind === "pdf" ? "report" : "message"} queued to ${phone}`, { description: "MOCKED dispatch — Phase-2 connects the WhatsApp Business API." });
  };

  return (
    <div className="space-y-4">
      <Panel
        testId="prescription-report-panel"
        title="Core Engine Output — Prescription Report"
        hint="Rule-based Phase-1 engine. Decision support for clinician review, not an autonomous machine setting."
        right={
          <div className="flex gap-2 no-print">
            <Button data-testid="print-pdf-btn" variant="outline" onClick={() => { toast.info("Preparing PDF"); setTimeout(() => window.print(), 300); }}>
              <FileDown className="h-4 w-4 mr-1.5" /> Generate PDF
            </Button>
          </div>
        }
      >
        <div className="rounded-md border border-slate-200 p-4 mb-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Metric label="Patient" value={patient.name} sub={`${patient.id} · UHID ${patient.uhid}`} />
            <Metric label="Session" value={`#${patient.nextSessionNo}`} sub={new Date().toDateString()} />
            <Metric label="Operator" value={operator?.name} sub={operator?.id} />
            <Metric label="Access" value={patient.vascular.type} sub={patient.vascular.site} />
          </div>
        </div>

        <p className="overline">1 · Session tuning recommendation</p>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mt-3 rounded-md border border-blue-200 bg-blue-50 p-4" data-testid="tuning-block">
          <Metric label="Blood flow" value={insight.tuning.bloodFlow} unit="mL/min" testId="tuning-qb" />
          <Metric label="Dialysate flow" value={insight.tuning.dialysateFlow} unit="mL/min" />
          <Metric label="Duration" value={insight.tuning.durationMin} unit="min" />
          <Metric label="UF target" value={insight.tuning.ufTargetL} unit="L" testId="tuning-uf" />
          <Metric label="UF rate" value={insight.tuning.ufRateMlKgHr} unit="mL/kg/hr" />
        </div>
        <ul className="mt-3 space-y-1.5">
          {insight.tuning.rationale.map((r, i) => (
            <li key={i} className="text-sm text-slate-700 flex gap-2"><span className="text-blue-600">·</span>{r}</li>
          ))}
        </ul>

        <p className="overline mt-8">2 · Access status check</p>
        <div className={`mt-3 rounded-md border p-4 ${levelColor(insight.accessStatus.level)}`} data-testid="access-status-block">
          <p className="text-sm font-bold">{insight.accessStatus.objective}</p>
          <p className="text-sm mt-1.5">{insight.accessStatus.summary}</p>
          <p className="text-sm mt-1.5">Current condition: {insight.accessStatus.status}</p>
        </div>

        <p className="overline mt-8">3 · Vascular condition trend across visits</p>
        <p className="text-sm text-slate-700 mt-2" data-testid="vascular-trend-block">{insight.vascularTrend.detail}</p>

        <p className="overline mt-8">4 · Risk flags</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3" data-testid="risk-flags">
          {insight.riskFlags.map((f, i) => (
            <div key={i} className={`rounded-md border p-4 ${levelColor(f.level)}`} data-testid={`risk-flag-${i}`}>
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-bold">{f.name}</p>
                <span className="text-xs font-bold uppercase tracking-wider">{f.level}</span>
              </div>
              <p className="text-xs mt-1.5 opacity-90">{f.basis}</p>
            </div>
          ))}
        </div>
        <p className="text-xs text-slate-500 mt-3">
          Risk flags are derived from dialysis history, vascular-access records and laboratory data only. No genomic or DNA-based
          personalisation is used anywhere in DURISE.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
          <div>
            <p className="overline flex items-center gap-1.5"><ListChecks className="h-3.5 w-3.5" /> 5a · Plan now (this session)</p>
            <ul className="mt-3 space-y-2" data-testid="plan-now">
              {insight.planNow.map((p, i) => (
                <li key={i} className="text-sm text-slate-700 flex gap-2"><CheckCircle2 className="h-4 w-4 text-blue-600 mt-0.5 shrink-0" />{p}</li>
              ))}
            </ul>
          </div>
          <div>
            <p className="overline flex items-center gap-1.5"><AlertTriangle className="h-3.5 w-3.5" /> 5b · Plan next (upcoming sessions)</p>
            <ul className="mt-3 space-y-2" data-testid="plan-next">
              {insight.planNext.map((p, i) => (
                <li key={i} className="text-sm text-slate-700 flex gap-2"><CheckCircle2 className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />{p}</li>
              ))}
            </ul>
          </div>
        </div>

        <p className="overline mt-8">6 · Clinician sign-off</p>
        <div className="mt-3 rounded-md border border-slate-200 bg-slate-50 p-4" data-testid="signoff-block">
          {signed ? (
            <div className="flex items-start gap-3">
              <Stamp className="h-5 w-5 text-emerald-700 mt-0.5" />
              <div>
                <p className="text-sm font-bold text-emerald-800" data-testid="signoff-status">Reviewed and approved for application</p>
                <p className="text-sm text-slate-700 mt-1">
                  {signOff.clinician}{signOff.designation ? `, ${signOff.designation}` : ""} · {new Date(signOff.at).toLocaleString()}
                </p>
              </div>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <label className="block">
                  <span className="overline">Reviewing clinician</span>
                  <Input data-testid="signoff-clinician-input" className="mt-1.5" value={signOff.clinician} onChange={(e) => updateDraft(patient, "signOff", { clinician: e.target.value })} placeholder="Dr. N. Bhatt" />
                </label>
                <label className="block">
                  <span className="overline">Designation</span>
                  <Input data-testid="signoff-designation-input" className="mt-1.5" value={signOff.designation} onChange={(e) => updateDraft(patient, "signOff", { designation: e.target.value })} placeholder="Consultant Nephrologist" />
                </label>
                <div className="flex items-end">
                  <Button data-testid="signoff-btn" onClick={sign} className="w-full bg-blue-600 hover:bg-blue-700">
                    <ShieldCheck className="h-4 w-4 mr-1.5" /> Record sign-off
                  </Button>
                </div>
              </div>
              <p className="text-xs text-slate-500 mt-3">
                No recommendation in this report may be applied at the machine until a qualified clinician records sign-off.
              </p>
            </>
          )}
        </div>
      </Panel>

      <Panel
        testId="whatsapp-panel"
        title="Patient WhatsApp Dispatch"
        hint="MOCKED in Phase-1 — messages and PDF reports are logged locally, not transmitted."
      >
        <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_auto] gap-3 items-end no-print">
          <label className="block">
            <span className="overline">Patient WhatsApp number</span>
            <Input data-testid="whatsapp-number-input" className="mt-1.5 metric-num" value={phone} onChange={(e) => setPhone(e.target.value)} />
          </label>
          <Button data-testid="send-whatsapp-msg-btn" variant="outline" onClick={() => sendWhatsapp("text")}>
            <MessageCircle className="h-4 w-4 mr-1.5" /> Send session summary
          </Button>
          <Button data-testid="send-whatsapp-pdf-btn" className="bg-emerald-600 hover:bg-emerald-700" onClick={() => sendWhatsapp("pdf")}>
            <FileDown className="h-4 w-4 mr-1.5" /> Send PDF report
          </Button>
        </div>
        {!signed && <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded px-3 py-2 mt-3">Clinician sign-off required before any dispatch to the patient.</p>}

        <p className="overline mt-6">Dispatch log</p>
        {whatsappLog.length === 0 ? (
          <p className="text-sm text-slate-500 mt-2">No messages dispatched yet in this shift.</p>
        ) : (
          <ul className="mt-2 space-y-2" data-testid="whatsapp-log">
            {whatsappLog.map((w) => (
              <li key={w.id} className="rounded-md border border-slate-200 p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded px-2 py-0.5">{w.status}</span>
                  <span className="metric-num text-xs text-slate-500">{w.to} · {new Date(w.at).toLocaleTimeString()} · {w.kind}</span>
                </div>
                <p className="text-sm text-slate-700 mt-2">{w.body}</p>
                {w.attachment && <p className="text-xs text-blue-700 mt-1">Attachment: {w.attachment}</p>}
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}
