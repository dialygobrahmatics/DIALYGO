import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Activity, Play, Pause, Radio, AlertTriangle, Plug } from "lucide-react";
import { Panel, Metric, ContextLine, Field } from "@/components/Bits";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useApp } from "@/context/AppContext";
import { contextFor } from "@/lib/engine";

const jitter = (v, spread) => Math.round(v + (Math.random() * spread * 2 - spread));

function TelemetryPanel({ patient, insight, onSample }) {
  const [running, setRunning] = useState(false);
  const [tick, setTick] = useState(0);
  const [t, setT] = useState({
    bloodFlow: insight.tuning.bloodFlow,
    dialysateFlow: patient.prescription.dialysateFlow,
    venousPressure: patient.sessions[patient.sessions.length - 1].venousPressure,
    arterialPressure: -140,
    tmp: 150,
    ufVolume: 0,
    ufRate: Math.round((insight.tuning.ufTargetL * 1000) / (insight.tuning.durationMin / 60)),
    condNa: patient.prescription.dialysateNa,
    dialysateTemp: 36.5,
    elapsedMin: 0,
  });
  const [alarms, setAlarms] = useState([]);
  const alarmRef = useRef(0);

  useEffect(() => {
    if (!running) return;
    const iv = setInterval(() => {
      setT((prev) => {
        const next = {
          ...prev,
          bloodFlow: Math.max(180, jitter(insight.tuning.bloodFlow, 12)),
          venousPressure: jitter(prev.venousPressure, 9),
          arterialPressure: jitter(-140, 12),
          tmp: jitter(150, 15),
          elapsedMin: prev.elapsedMin + 5,
          ufVolume: +(prev.ufVolume + (insight.tuning.ufTargetL * 1000) / (insight.tuning.durationMin / 5)).toFixed(0),
          dialysateTemp: +(36.3 + Math.random() * 0.4).toFixed(1),
        };
        if (next.venousPressure > 220 && Date.now() - alarmRef.current > 4000) {
          alarmRef.current = Date.now();
          const a = { at: new Date().toLocaleTimeString(), code: "VP-HIGH", text: `Venous pressure high (${next.venousPressure} mmHg)` };
          setAlarms((p) => [a, ...p].slice(0, 8));
          toast.error(`Machine alarm: ${a.text}`, { description: "Check access outflow and needle position." });
        }
        if (next.arterialPressure < -230 && Date.now() - alarmRef.current > 4000) {
          alarmRef.current = Date.now();
          const a = { at: new Date().toLocaleTimeString(), code: "AP-LOW", text: `Arterial pressure very negative (${next.arterialPressure} mmHg)` };
          setAlarms((p) => [a, ...p].slice(0, 8));
          toast.error(`Machine alarm: ${a.text}`, { description: "Possible inflow limitation / access recirculation." });
        }
        return next;
      });
      setTick((x) => x + 1);
    }, 2500);
    return () => clearInterval(iv);
  }, [running, insight.tuning.bloodFlow, insight.tuning.durationMin, insight.tuning.ufTargetL]);

  useEffect(() => {
    if (running) onSample(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tick]);

  const qbCtx = contextFor(patient.sessions, "bloodFlow", t.bloodFlow);
  const vpCtx = contextFor(patient.sessions, "venousPressure", t.venousPressure);

  return (
    <Panel
      testId="telemetry-panel"
      title="Dialysis Machine Telemetry"
      hint="Simulated device stream (Phase-1). Phase-2 connects to machine API / HL7 gateway."
      right={
        <Button
          data-testid="telemetry-toggle-btn"
          onClick={() => { setRunning((r) => !r); toast.info(running ? "Telemetry stream paused" : "Telemetry stream connected (simulated)"); }}
          className={running ? "bg-red-600 hover:bg-red-700" : "bg-navy hover:bg-navy-deep"}
        >
          {running ? <><Pause className="h-4 w-4 mr-1.5" /> Pause stream</> : <><Play className="h-4 w-4 mr-1.5" /> Connect machine</>}
        </Button>
      }
    >
      <div className="flex items-center gap-2 mb-4">
        <span className={`inline-flex items-center gap-1.5 text-xs font-bold px-2 py-1 rounded-lg border ${running ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-slate-50 text-slate-600 border-slate-200"}`}>
          <Radio className="h-3.5 w-3.5" /> {running ? "Streaming" : "Disconnected"}
        </span>
        <span className="text-xs text-slate-500 metric-num">Device: FRESENIUS-4008S · SN 4008-2291 · elapsed {t.elapsedMin} min</span>
      </div>

      <div key={tick} className="grid grid-cols-2 md:grid-cols-4 gap-4 telemetry-flash rounded p-1" data-testid="telemetry-grid">
        <Metric label="Blood flow" value={t.bloodFlow} unit="mL/min" testId="tele-qb" />
        <Metric label="Dialysate flow" value={t.dialysateFlow} unit="mL/min" />
        <Metric label="Venous pressure" value={t.venousPressure} unit="mmHg" tone={t.venousPressure > 200 ? "alert" : "default"} testId="tele-vp" />
        <Metric label="Arterial pressure" value={t.arterialPressure} unit="mmHg" tone={t.arterialPressure < -220 ? "alert" : "default"} />
        <Metric label="TMP" value={t.tmp} unit="mmHg" />
        <Metric label="UF removed" value={t.ufVolume} unit="mL" />
        <Metric label="UF rate" value={t.ufRate} unit="mL/hr" />
        <Metric label="Dialysate temp" value={t.dialysateTemp} unit="°C" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
        <div className="rounded-xl border border-slate-200 p-3">
          <p className="overline">Blood flow in context</p>
          <ContextLine ctx={qbCtx} unit="mL/min" />
        </div>
        <div className="rounded-xl border border-slate-200 p-3">
          <p className="overline">Venous pressure in context</p>
          <ContextLine ctx={vpCtx} unit="mmHg" />
        </div>
      </div>

      <div className="mt-5">
        <p className="overline flex items-center gap-1.5"><AlertTriangle className="h-3.5 w-3.5" /> Machine alarm log</p>
        {alarms.length === 0 ? (
          <p className="text-sm text-slate-500 mt-2">No alarms recorded in this session yet.</p>
        ) : (
          <ul className="mt-2 space-y-1.5" data-testid="alarm-log">
            {alarms.map((a, i) => (
              <li key={i} className="text-sm text-red-700 bg-red-50 border border-red-200 rounded px-3 py-1.5 metric-num">
                {a.at} · {a.code} · {a.text}
              </li>
            ))}
          </ul>
        )}
      </div>
    </Panel>
  );
}

export default function SessionTab({ patient, insight }) {
  const { getDraft, updateDraft, setStage } = useApp();
  const draft = getDraft(patient);
  const s = patient.sessions;
  const set = (stage) => (field) => (e) => updateDraft(patient, stage, { [field]: e?.target ? e.target.value : e });

  const onSample = (t) =>
    updateDraft(patient, "during", {
      bloodFlow: String(t.bloodFlow),
      venousPressure: String(t.venousPressure),
      arterialPressure: String(t.arterialPressure),
      tmp: String(t.tmp),
      ufRemoved: String(t.ufVolume),
    });

  return (
    <div className="space-y-4">
      <TelemetryPanel patient={patient} insight={insight} onSample={onSample} />

      <Panel testId="session-workflow-panel" title="Current Session Input" hint="Record the procedure across the three clinical stages. Each entry is compared against the patient's history.">
        <Tabs value={draft.stage} onValueChange={(v) => setStage(patient, v)}>
          <TabsList data-testid="stage-tabs">
            <TabsTrigger value="before" data-testid="stage-tab-before">Before dialysis</TabsTrigger>
            <TabsTrigger value="during" data-testid="stage-tab-during">During dialysis</TabsTrigger>
            <TabsTrigger value="after" data-testid="stage-tab-after">After dialysis</TabsTrigger>
          </TabsList>

          <TabsContent value="before" className="mt-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <div>
                <Field label="Pre-dialysis weight (kg)">
                  <Input data-testid="input-pre-weight" inputMode="decimal" value={draft.before.weight} onChange={set("before")("weight")} placeholder={String(patient.dryWeight + 2)} className="metric-num" />
                </Field>
                <ContextLine ctx={contextFor(s, "preWeight", draft.before.weight)} unit="kg" />
              </div>
              <div>
                <Field label="Blood pressure (mmHg)">
                  <Input data-testid="input-pre-bp" value={draft.before.bp} onChange={set("before")("bp")} placeholder="150/86" className="metric-num" />
                </Field>
                <p className="text-xs text-slate-500 mt-1">
                  Previous pre-dialysis BP: {s[s.length - 1].preBP} · last session #{s[s.length - 1].sessionNo}
                </p>
              </div>
              <div>
                <Field label="Pulse (bpm)">
                  <Input data-testid="input-pre-pulse" inputMode="numeric" value={draft.before.pulse} onChange={set("before")("pulse")} placeholder="82" className="metric-num" />
                </Field>
                <ContextLine ctx={contextFor(s, "prePulse", draft.before.pulse)} unit="bpm" />
              </div>
              <Field label="Temperature (°C)">
                <Input data-testid="input-temperature" inputMode="decimal" value={draft.before.temperature} onChange={set("before")("temperature")} placeholder="36.6" className="metric-num" />
              </Field>
              <Field label="Fluid status assessment">
                <Input data-testid="input-fluid-status" value={draft.before.fluidStatus} onChange={set("before")("fluidStatus")} placeholder="Euvolaemic / mild oedema / overloaded" />
              </Field>
              <Field label="Cannulation attempts">
                <Input data-testid="input-cannulation-attempts" inputMode="numeric" value={draft.before.cannulationAttempts} onChange={set("before")("cannulationAttempts")} className="metric-num" />
              </Field>
              <Field label="Needle / technique" hint={`Historical: ${patient.vascular.needle}`}>
                <Input data-testid="input-needle" value={draft.before.needle} onChange={set("before")("needle")} />
              </Field>
              <div className="md:col-span-2">
                <Field label="Access assessment (look, listen, feel)" hint={`Last documented condition: ${s[s.length - 1].accessCondition}`}>
                  <Textarea data-testid="input-access-assessment" rows={3} value={draft.before.accessAssessment} onChange={set("before")("accessAssessment")} placeholder="Thrill, bruit, swelling, redness, aneurysmal change, pain..." />
                </Field>
              </div>
              <div className="md:col-span-3">
                <Field label="Patient symptoms before connection">
                  <Textarea data-testid="input-pre-symptoms" rows={2} value={draft.before.symptoms} onChange={set("before")("symptoms")} placeholder="Breathlessness, cramps, dizziness, chest discomfort..." />
                </Field>
              </div>
            </div>

            <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3">
              <label className="flex items-start gap-3 cursor-pointer">
                <Checkbox data-testid="check-rx-verified" checked={draft.before.prescriptionVerified} onCheckedChange={(v) => updateDraft(patient, "before", { prescriptionVerified: !!v })} />
                <span className="text-sm text-slate-700">
                  Prescription verified against chart — Qb {patient.prescription.bloodFlow} mL/min, Qd {patient.prescription.dialysateFlow} mL/min,
                  {" "}{patient.prescription.durationMin} min, UF {patient.prescription.ufTargetL} L, {patient.prescription.anticoagulant}.
                </span>
              </label>
              <label className="flex items-start gap-3 cursor-pointer">
                <Checkbox data-testid="check-meds-confirmed" checked={draft.before.medsConfirmed} onCheckedChange={(v) => updateDraft(patient, "before", { medsConfirmed: !!v })} />
                <span className="text-sm text-slate-700">Current medication list confirmed with patient ({patient.medications.length} active medications on record).</span>
              </label>
            </div>
          </TabsContent>

          <TabsContent value="during" className="mt-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <div>
                <Field label="Blood flow (mL/min)">
                  <Input data-testid="input-blood-flow" inputMode="numeric" value={draft.during.bloodFlow} onChange={set("during")("bloodFlow")} className="metric-num" />
                </Field>
                <ContextLine ctx={contextFor(s, "bloodFlow", draft.during.bloodFlow)} unit="mL/min" />
              </div>
              <Field label="Dialysate flow (mL/min)">
                <Input data-testid="input-dialysate-flow" inputMode="numeric" value={draft.during.dialysateFlow} onChange={set("during")("dialysateFlow")} className="metric-num" />
              </Field>
              <div>
                <Field label="Venous pressure (mmHg)">
                  <Input data-testid="input-venous-pressure" inputMode="numeric" value={draft.during.venousPressure} onChange={set("during")("venousPressure")} className="metric-num" />
                </Field>
                <ContextLine ctx={contextFor(s, "venousPressure", draft.during.venousPressure)} unit="mmHg" />
              </div>
              <Field label="Arterial pressure (mmHg)">
                <Input data-testid="input-arterial-pressure" value={draft.during.arterialPressure} onChange={set("during")("arterialPressure")} className="metric-num" />
              </Field>
              <Field label="TMP (mmHg)">
                <Input data-testid="input-tmp" value={draft.during.tmp} onChange={set("during")("tmp")} className="metric-num" />
              </Field>
              <Field label="UF removed so far (mL)">
                <Input data-testid="input-uf-removed" value={draft.during.ufRemoved} onChange={set("during")("ufRemoved")} className="metric-num" />
              </Field>
              <Field label="Dialysate sodium (mmol/L)">
                <Input data-testid="input-dialysate-na" value={draft.during.dialysateNa} onChange={set("during")("dialysateNa")} className="metric-num" />
              </Field>
              <Field label="Dialysate temperature (°C)">
                <Input data-testid="input-dialysate-temp" value={draft.during.dialysateTemp} onChange={set("during")("dialysateTemp")} className="metric-num" />
              </Field>
              <Field label="Medication administered intra-dialysis">
                <Input data-testid="input-medication-given" value={draft.during.medicationGiven} onChange={set("during")("medicationGiven")} placeholder="Iron sucrose 100 mg IV" />
              </Field>
              <div className="md:col-span-3 grid grid-cols-1 md:grid-cols-3 gap-5">
                <Field label="Access observations during run">
                  <Textarea data-testid="input-access-observation" rows={3} value={draft.during.accessObservation} onChange={set("during")("accessObservation")} placeholder="Needle position, swelling, pain, infiltration..." />
                </Field>
                <Field label="Patient symptoms">
                  <Textarea data-testid="input-during-symptoms" rows={3} value={draft.during.symptoms} onChange={set("during")("symptoms")} placeholder="Cramps, nausea, hypotension symptoms..." />
                </Field>
                <Field label="Interventions performed">
                  <Textarea data-testid="input-interventions" rows={3} value={draft.during.interventions} onChange={set("during")("interventions")} placeholder="Saline bolus, UF rate reduction, repositioning..." />
                </Field>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="after" className="mt-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <div>
                <Field label="Post-dialysis weight (kg)">
                  <Input data-testid="input-post-weight" inputMode="decimal" value={draft.after.postWeight} onChange={set("after")("postWeight")} placeholder={String(patient.dryWeight)} className="metric-num" />
                </Field>
                <ContextLine ctx={contextFor(s, "postWeight", draft.after.postWeight)} unit="kg" />
              </div>
              <Field label="Post BP (mmHg)">
                <Input data-testid="input-post-bp" value={draft.after.postBp} onChange={set("after")("postBp")} placeholder="132/78" className="metric-num" />
              </Field>
              <Field label="Post pulse (bpm)">
                <Input data-testid="input-post-pulse" value={draft.after.postPulse} onChange={set("after")("postPulse")} className="metric-num" />
              </Field>
              <div>
                <Field label="Actual ultrafiltration (L)">
                  <Input data-testid="input-actual-uf" inputMode="decimal" value={draft.after.actualUf} onChange={set("after")("actualUf")} placeholder={String(insight.tuning.ufTargetL)} className="metric-num" />
                </Field>
                <ContextLine ctx={contextFor(s, "ufAchieved", draft.after.actualUf)} unit="L" />
              </div>
              <Field label="Session duration (min)">
                <Input data-testid="input-duration" value={draft.after.durationMin} onChange={set("after")("durationMin")} placeholder={String(insight.tuning.durationMin)} className="metric-num" />
              </Field>
              <Field label="Bleeding time after decannulation (min)" hint="Historical prolonged bleeding is an access warning sign">
                <Input data-testid="input-bleeding-time" value={draft.after.bleedingTimeMin} onChange={set("after")("bleedingTimeMin")} placeholder="6" className="metric-num" />
              </Field>
              <Field label="Access condition post-session">
                <Input data-testid="input-post-access-condition" value={draft.after.accessCondition} onChange={set("after")("accessCondition")} placeholder="Haemostasis achieved, no haematoma" />
              </Field>
              <Field label="Complications">
                <Input data-testid="input-complications" value={draft.after.complications} onChange={set("after")("complications")} placeholder="None / hypotension / cramps" />
              </Field>
              <Field label="Session outcome">
                <Input data-testid="input-outcome" value={draft.after.outcome} onChange={set("after")("outcome")} placeholder="Completed uneventfully" />
              </Field>
              <div className="md:col-span-3">
                <Field label="Operator observations">
                  <Textarea data-testid="input-observations" rows={3} value={draft.after.observations} onChange={set("after")("observations")} placeholder="Anything the next operator must know before the following session..." />
                </Field>
              </div>
            </div>

            <div className="mt-6 rounded-xl border border-[#c3dcf7] bg-navy-tint p-4 flex items-start gap-3">
              <Plug className="h-4 w-4 text-navy mt-0.5" />
              <p className="text-sm text-navy">
                Completing this stage populates the Prescription Report for clinician sign-off, PDF generation and patient WhatsApp dispatch.
              </p>
            </div>
          </TabsContent>
        </Tabs>
      </Panel>

      <Panel testId="session-context-panel" title="Historical Evidence + Current Condition" hint="Every recorded value is interpreted against the patient's own longitudinal record">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {[
            { label: "Current blood flow", value: draft.during.bloodFlow, unit: "mL/min", ctx: contextFor(s, "bloodFlow", draft.during.bloodFlow) },
            { label: "Current venous pressure", value: draft.during.venousPressure, unit: "mmHg", ctx: contextFor(s, "venousPressure", draft.during.venousPressure) },
            { label: "Pre-dialysis weight", value: draft.before.weight, unit: "kg", ctx: contextFor(s, "preWeight", draft.before.weight) },
          ].map((row, i) => (
            <div key={i} className="rounded-xl border border-slate-200 p-4" data-testid={`context-card-${i}`}>
              <p className="overline">{row.label}</p>
              <p className="metric-num text-2xl font-semibold mt-1">
                {row.value || "—"} <span className="text-xs text-slate-500">{row.unit}</span>
              </p>
              <ContextLine ctx={row.ctx} unit={row.unit} />
            </div>
          ))}
          <div className="rounded-xl border border-slate-200 p-4">
            <p className="overline">Recent access-related events</p>
            <p className="metric-num text-2xl font-semibold mt-1">{insight.stats.recentAccessEvents}</p>
            <p className="text-xs text-slate-500 mt-1">Cannulation difficulty / infiltration in last 10 sessions</p>
          </div>
          <div className="rounded-xl border border-slate-200 p-4">
            <p className="overline">Last vascular intervention</p>
            <p className="metric-num text-2xl font-semibold mt-1">{patient.vascular.lastIntervention}</p>
            <p className="text-xs text-slate-500 mt-1">{patient.procedures[0].name}</p>
          </div>
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
            <p className="overline text-amber-800 flex items-center gap-1.5"><Activity className="h-3.5 w-3.5" /> Operator attention</p>
            <p className="text-sm text-amber-900 font-semibold mt-1.5">{insight.attention[0].title}</p>
            <p className="text-xs text-amber-800 mt-1">{insight.attention[0].detail}</p>
          </div>
        </div>
      </Panel>
    </div>
  );
}
