// Dialyso Phase-I rule-based decision-support engine (illustrative, non-diagnostic).

export const lastN = (sessions, n = 10) => sessions.slice(-n);

export function rangeOf(sessions, key, n = 10) {
  const vals = lastN(sessions, n).map((s) => Number(s[key])).filter((v) => !Number.isNaN(v));
  if (!vals.length) return null;
  const min = Math.min(...vals);
  const max = Math.max(...vals);
  const mean = vals.reduce((a, b) => a + b, 0) / vals.length;
  return { min, max, mean: +mean.toFixed(1), last: vals[vals.length - 1], count: vals.length };
}

export function trendOf(values) {
  if (!values || values.length < 3) return { direction: "insufficient", slope: 0, pct: 0 };
  const first = values.slice(0, Math.ceil(values.length / 2));
  const second = values.slice(Math.floor(values.length / 2));
  const avg = (a) => a.reduce((x, y) => x + y, 0) / a.length;
  const a = avg(first);
  const b = avg(second);
  const pct = a === 0 ? 0 : ((b - a) / a) * 100;
  const direction = pct > 4 ? "rising" : pct < -4 ? "falling" : "stable";
  return { direction, slope: +(b - a).toFixed(1), pct: +pct.toFixed(1) };
}

export function contextFor(sessions, key, current, n = 10) {
  const r = rangeOf(sessions, key, n);
  if (r == null || current === "" || current == null) return { range: r, status: "unknown", delta: null };
  const v = Number(current);
  if (Number.isNaN(v)) return { range: r, status: "unknown", delta: null };
  const status = v < r.min ? "below" : v > r.max ? "above" : "within";
  const delta = +(v - r.mean).toFixed(1);
  return { range: r, status, delta };
}

const sev = { high: 3, moderate: 2, info: 1 };

export function buildInsight(patient, draft) {
  const s = patient.sessions;
  const recent = lastN(s, 10);
  const latestLab = patient.labs[0];
  const prevLab = patient.labs[1];
  const flowVals = patient.vascular.flowSeries.map((f) => f.flow);
  const flowTrend = trendOf(flowVals);
  const vpTrend = trendOf(recent.map((x) => x.venousPressure));
  const qbTrend = trendOf(recent.map((x) => x.bloodFlow));
  const ktvTrend = trendOf([...patient.labs].reverse().map((l) => l.ktv));
  const accessEvents = patient.vascular.timeline.filter((t) =>
    ["infiltration", "bleeding", "infection", "stenosis", "thrombosis", "observation"].includes(t.type)
  );
  const recentAccessEvents = recent.filter((x) => x.infiltration || x.cannulationAttempts > 1).length;
  const hypotensionCount = recent.filter((x) => x.complications.some((c) => /hypotension/i.test(c))).length;
  const ufShortfall = recent.filter((x) => x.ufTarget - x.ufAchieved > 0.3).length;

  const attention = [];
  const push = (severity, title, detail, tag) => attention.push({ severity, title, detail, tag });

  if (flowTrend.direction === "falling" && patient.vascular.lastFlowMlMin < 600 && patient.vascular.type !== "Tunnelled Catheter") {
    push("high", "Access flow below surveillance threshold",
      `Last measured flow ${patient.vascular.lastFlowMlMin} mL/min on ${patient.vascular.lastFlowDate}; ${Math.abs(flowTrend.pct)}% decline across recorded measurements (threshold 600 mL/min).`, "Vascular access");
  } else if (flowTrend.direction === "falling") {
    push("moderate", "Declining access flow trend", `Access flow down ${Math.abs(flowTrend.pct)}% over recorded measurements.`, "Vascular access");
  }
  if (vpTrend.direction === "rising") {
    push("high", "Rising venous pressure across sessions",
      `Mean venous pressure increased by ${vpTrend.slope} mmHg between earlier and recent sessions - review for outflow obstruction.`, "Machine parameters");
  }
  if (qbTrend.direction === "falling") {
    push("moderate", "Achieved blood flow drifting down",
      `Recent achievable Qb trending ${qbTrend.pct}% versus earlier sessions (prescribed ${patient.prescription.bloodFlow} mL/min).`, "Prescription vs delivered");
  }
  if (recentAccessEvents > 0) {
    push("moderate", `${recentAccessEvents} recent cannulation/access event(s)`,
      "Multiple cannulation attempts or infiltration documented in the last 10 sessions.", "Cannulation record");
  }
  if (latestLab && latestLab.potassium >= 5.5) {
    push("high", "Pre-dialysis hyperkalaemia", `Serum potassium ${latestLab.potassium} mmol/L on ${latestLab.date}. Confirm dialysate K and diet advice.`, "Laboratory");
  }
  if (latestLab && latestLab.ktv < 1.2) {
    push("high", "Dialysis adequacy below target", `Kt/V ${latestLab.ktv} (target >= 1.2). Trend ${ktvTrend.direction}.`, "Adequacy");
  }
  if (latestLab && latestLab.hb < 10) {
    push("moderate", "Anaemia below target", `Haemoglobin ${latestLab.hb} g/dL. Verify ESA and iron administration.`, "Laboratory");
  }
  if (latestLab && latestLab.crp >= 10) {
    push("moderate", "Raised inflammatory marker", `CRP ${latestLab.crp} mg/L - screen access site and exit site for infection.`, "Laboratory");
  }
  if (hypotensionCount >= 2) {
    push("high", "Repeated intradialytic hypotension", `${hypotensionCount} episodes in the last 10 sessions - reassess dry weight and UF rate.`, "Complications");
  }
  if (ufShortfall >= 3) {
    push("moderate", "Ultrafiltration target frequently unmet", `${ufShortfall} of last ${recent.length} sessions ended below UF target.`, "Fluid management");
  }
  if (patient.vascular.type === "Tunnelled Catheter") {
    push("high", "Catheter-dependent access", "No permanent access in place. Confirm vascular access planning status with the nephrologist.", "Vascular access");
  }
  if (!patient.vascular.lastFlowDate || new Date(patient.vascular.lastFlowDate) < new Date("2026-04-01")) {
    push("info", "Access flow surveillance due", "No access flow measurement recorded in the last 8 weeks.", "Missing information");
  }
  if (prevLab && latestLab && latestLab.potassium - prevLab.potassium >= 0.4) {
    push("info", "Change since previous labs", `Potassium rose from ${prevLab.potassium} to ${latestLab.potassium} mmol/L.`, "Change detection");
  }
  push("info", "Data requiring confirmation", "Confirm dry weight, current medication list and access assessment with the patient before connection.", "Verification");

  attention.sort((a, b) => sev[b.severity] - sev[a.severity]);

  // Risk flags
  const riskFlags = [
    {
      name: "Access dysfunction risk",
      level: patient.vascular.lastFlowMlMin < 600 || vpTrend.direction === "rising" ? "high" : flowTrend.direction === "falling" ? "moderate" : "low",
      basis: `Flow ${patient.vascular.lastFlowMlMin} mL/min, flow trend ${flowTrend.direction}, venous pressure trend ${vpTrend.direction}, ${accessEvents.length} historical access events.`,
    },
    {
      name: "Intradialytic hypotension risk",
      level: hypotensionCount >= 2 || patient.comorbidities.some((c) => /Cardiac Failure/i.test(c)) ? "high" : hypotensionCount === 1 ? "moderate" : "low",
      basis: `${hypotensionCount} episode(s) in last 10 sessions; comorbidities: ${patient.comorbidities.join(", ")}.`,
    },
    {
      name: "Inadequate clearance risk",
      level: latestLab.ktv < 1.1 ? "high" : latestLab.ktv < 1.2 ? "moderate" : "low",
      basis: `Kt/V ${latestLab.ktv}, URR ${latestLab.urr}%, adequacy trend ${ktvTrend.direction}.`,
    },
    {
      name: "Electrolyte / metabolic risk",
      level: latestLab.potassium >= 6 ? "high" : latestLab.potassium >= 5.5 || latestLab.phosphate > 5.5 ? "moderate" : "low",
      basis: `K ${latestLab.potassium} mmol/L, PO4 ${latestLab.phosphate} mg/dL, Ca ${latestLab.calcium} mg/dL.`,
    },
    {
      name: "Access infection risk",
      level: latestLab.crp >= 20 ? "high" : latestLab.crp >= 10 || patient.vascular.type === "Tunnelled Catheter" ? "moderate" : "low",
      basis: `CRP ${latestLab.crp} mg/L, access type ${patient.vascular.type}.`,
    },
  ];

  // Session tuning recommendation
  const rx = patient.prescription;
  const rationale = [];
  let qb = rx.bloodFlow;
  if (patient.vascular.lastFlowMlMin < 600 && patient.vascular.type !== "Tunnelled Catheter") {
    qb = Math.min(rx.bloodFlow, 280);
    rationale.push(`Blood flow capped at ${qb} mL/min because measured access flow (${patient.vascular.lastFlowMlMin} mL/min) is below the 600 mL/min surveillance threshold.`);
  } else if (qbTrend.direction === "falling") {
    qb = Math.max(250, rx.bloodFlow - 20);
    rationale.push("Blood flow moderated as recently achieved Qb is trending below prescription.");
  } else {
    rationale.push("Prescribed blood flow retained - access parameters within expected range.");
  }
  let duration = rx.durationMin;
  if (latestLab.ktv < 1.2) {
    duration = Math.min(270, rx.durationMin + 20);
    rationale.push(`Session duration extended to ${duration} min to offset reduced clearance at lower blood flow (Kt/V ${latestLab.ktv}).`);
  }
  const avgPreW = rangeOf(s, "preWeight", 5);
  let ufTarget = +(Math.max(0, (avgPreW ? avgPreW.mean : patient.dryWeight + 2) - patient.dryWeight)).toFixed(1);
  const hypoRisk = riskFlags[1].level;
  const maxUfRate = hypoRisk === "high" ? 10 : 13; // mL/kg/hr
  const cappedUf = +((maxUfRate * patient.dryWeight * (duration / 60)) / 1000).toFixed(1);
  if (ufTarget > cappedUf) {
    rationale.push(`UF target reduced from ${ufTarget} L to ${cappedUf} L to keep UF rate at or below ${maxUfRate} mL/kg/hr given ${hypoRisk} hypotension risk.`);
    ufTarget = cappedUf;
  } else {
    rationale.push(`UF target ${ufTarget} L derived from mean pre-dialysis weight (${avgPreW ? avgPreW.mean : "-"} kg) versus dry weight ${patient.dryWeight} kg.`);
  }
  let dialysateK = rx.dialysateK;
  if (latestLab.potassium >= 5.5 && dialysateK > 2.0) {
    dialysateK = 2.0;
    rationale.push("Dialysate potassium suggested at 2.0 mmol/L for pre-dialysis hyperkalaemia - requires clinician confirmation.");
  }
  const ufRate = +((ufTarget * 1000) / (duration / 60) / patient.dryWeight).toFixed(1);

  const tuning = {
    bloodFlow: qb,
    dialysateFlow: rx.dialysateFlow,
    durationMin: duration,
    ufTargetL: ufTarget,
    ufRateMlKgHr: ufRate,
    dialysateK,
    dialysateNa: rx.dialysateNa,
    rationale,
  };

  const accessStatus = {
    status: patient.vascular.currentCondition,
    level: riskFlags[0].level,
    objective: riskFlags[0].level === "low" ? "Objective achieved - access supports prescribed blood flow" : "Objective at risk - access may not support prescribed blood flow",
    summary: `${patient.vascular.type} at ${patient.vascular.site}, age ${patient.vascular.accessAgeMonths} months. Patency: ${patient.vascular.patency}. Last intervention: ${patient.vascular.lastIntervention}.`,
  };

  const vascularTrend = {
    direction: flowTrend.direction,
    pct: flowTrend.pct,
    detail: `Access flow moved from ${flowVals[0]} mL/min to ${flowVals[flowVals.length - 1]} mL/min across ${flowVals.length} recorded measurements (${flowTrend.pct}%). Venous pressure trend across last ${recent.length} sessions: ${vpTrend.direction}.`,
  };

  const planNow = [];
  if (accessStatus.level !== "low") planNow.push("Perform structured access assessment (look, listen, feel) and document thrill, bruit and swelling before cannulation.");
  planNow.push(`Set machine to Qb ${tuning.bloodFlow} mL/min, Qd ${tuning.dialysateFlow} mL/min, duration ${tuning.durationMin} min, UF target ${tuning.ufTargetL} L after clinician confirmation.`);
  if (hypoRisk === "high") planNow.push("Monitor BP every 15 minutes for the first hour; keep UF rate below 10 mL/kg/hr.");
  if (latestLab.potassium >= 5.5) planNow.push(`Confirm dialysate potassium ${tuning.dialysateK} mmol/L and recheck post-dialysis potassium.`);
  if (recentAccessEvents > 0) planNow.push("Use single-operator cannulation with ultrasound guidance if available; avoid previous infiltration site.");
  planNow.push("Record cannulation attempts, alarms and any intervention in the session log.");

  const planNext = [];
  if (accessStatus.level === "high") planNext.push("Escalate for vascular imaging / fistulogram review before the next scheduled session.");
  if (patient.vascular.type === "Tunnelled Catheter") planNext.push("Follow up permanent access (AVF) planning with nephrology and vascular surgery.");
  if (latestLab.ktv < 1.2) planNext.push("Repeat Kt/V after two sessions on the revised duration.");
  if (latestLab.hb < 10) planNext.push("Review ESA / iron dosing at next nephrology round.");
  planNext.push("Schedule access flow surveillance measurement within 4 weeks.");
  planNext.push("Reassess dry weight at the next clinical review if UF targets remain unmet.");

  return {
    attention,
    riskFlags,
    tuning,
    accessStatus,
    vascularTrend,
    planNow,
    planNext,
    stats: { flowTrend, vpTrend, qbTrend, ktvTrend, hypotensionCount, recentAccessEvents, ufShortfall, accessEvents: accessEvents.length },
    context: {
      bloodFlow: contextFor(s, "bloodFlow", draft?.during?.bloodFlow),
      ufAchieved: contextFor(s, "ufAchieved", draft?.after?.actualUf),
      preWeight: contextFor(s, "preWeight", draft?.before?.weight),
      prePulse: contextFor(s, "prePulse", draft?.before?.pulse),
      venousPressure: contextFor(s, "venousPressure", draft?.during?.venousPressure),
    },
  };
}

export const levelColor = (level) =>
  ({
    high: "bg-red-50 text-red-700 border-red-200",
    moderate: "bg-amber-50 text-amber-800 border-amber-200",
    low: "bg-emerald-50 text-emerald-700 border-emerald-200",
    info: "bg-blue-50 text-blue-700 border-blue-200",
  }[level] || "bg-slate-50 text-slate-700 border-slate-200");
