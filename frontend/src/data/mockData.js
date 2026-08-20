// DialyGo Phase-I mock evidence store (JSON). Phase-2 will replace with API calls.

export const operators = [
  { id: "OPR-1041", name: "S. Kulkarni", role: "Senior Dialysis Technician", unit: "Nephro Unit B", pin: "1041" },
  { id: "OPR-2276", name: "R. Menon", role: "Dialysis Procedure Operator", unit: "Nephro Unit A", pin: "2276" },
  { id: "OPR-3390", name: "A. Fernandes", role: "Charge Nurse - Dialysis", unit: "Critical Care Dialysis", pin: "3390" },
];

const rnd = (seed) => {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
};

function buildSessions({ seed, count, startNo, baseQb, baseUf, baseSbp, dryWeight, decline }) {
  const r = rnd(seed);
  const out = [];
  const today = new Date("2026-06-14T08:00:00Z");
  for (let i = 0; i < count; i++) {
    const idx = count - 1 - i;
    const d = new Date(today.getTime() - idx * 2.4 * 86400000);
    const drift = decline ? Math.round(idx * -decline) : 0;
    const qb = Math.round(baseQb + drift + (r() * 20 - 10));
    const preW = +(dryWeight + 1.6 + r() * 1.4).toFixed(1);
    const postW = +(dryWeight + r() * 0.5).toFixed(1);
    const ufTarget = +(preW - dryWeight).toFixed(1);
    const ufAchieved = +(ufTarget - r() * 0.35).toFixed(2);
    const sbp = Math.round(baseSbp + (r() * 26 - 13));
    const dbp = Math.round(sbp * 0.56);
    const complications = [];
    if (r() > 0.78) complications.push("Intradialytic hypotension");
    if (r() > 0.86) complications.push("Cramps (lower limb)");
    if (decline && idx < 4 && r() > 0.5) complications.push("High venous pressure alarm");
    out.push({
      sessionNo: startNo + i,
      date: d.toISOString().slice(0, 10),
      durationMin: 240 - (r() > 0.85 ? 25 : 0),
      bloodFlow: qb,
      dialysateFlow: 500,
      ufTarget,
      ufAchieved,
      ufRate: +((ufAchieved * 1000) / 4).toFixed(0),
      preWeight: preW,
      postWeight: postW,
      preBP: `${sbp}/${dbp}`,
      postBP: `${sbp - 14}/${dbp - 8}`,
      prePulse: Math.round(76 + r() * 18),
      temperature: +(36.4 + r() * 0.7).toFixed(1),
      venousPressure: Math.round(140 + (decline ? idx < 5 ? 60 - idx * 8 : 0 : 0) + r() * 20),
      arterialPressure: -Math.round(120 + r() * 30),
      tmp: Math.round(130 + r() * 40),
      heparin: "3000 IU bolus",
      dialysate: { na: 138, k: 2.0, hco3: 32, ca: 1.5, tempC: 36.5 },
      cannulationAttempts: r() > 0.82 ? 2 : 1,
      infiltration: decline && idx < 3 && r() > 0.55,
      accessCondition: decline && idx < 3 ? "Thrill reduced, mild swelling" : "Good thrill and bruit",
      alarms: complications.length ? ["Venous pressure high"] : [],
      complications,
      outcome: complications.length ? "Completed with events" : "Completed uneventfully",
      operator: operators[i % 3].id,
      operatorNotes: complications.length
        ? "Saline bolus 200 mL given, UF rate reduced, patient stabilised."
        : "Session uneventful. Bleeding time 6 min post decannulation.",
    });
  }
  return out;
}

export const patients = [
  {
    id: "DUR-PT-00218",
    uhid: "AH/2021/88214",
    name: "Ramesh Iyer",
    age: 58,
    gender: "Male",
    bloodGroup: "B+",
    phone: "+91 98200 41127",
    photo: "https://images.pexels.com/photos/38547573/pexels-photo-38547573.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940",
    primaryDiagnosis: "Diabetic Nephropathy - ESRD",
    dialysisVintageMonths: 41,
    comorbidities: ["Type 2 Diabetes Mellitus", "Hypertension", "Peripheral Vascular Disease"],
    dryWeight: 64.5,
    schedule: "Mon / Wed / Fri - 08:00",
    nextSessionNo: 128,
    riskTier: "high",
    vascular: {
      type: "AV Fistula",
      site: "Left radiocephalic (wrist)",
      side: "Left",
      createdOn: "2022-11-04",
      maturedOn: "2023-01-19",
      accessAgeMonths: 43,
      patency: "Patent - reduced thrill",
      lastFlowMlMin: 480,
      lastFlowDate: "2026-05-28",
      lastIntervention: "2025-12-11",
      currentCondition: "Segmental stenosis suspected at juxta-anastomotic segment",
      needle: "15G x 25mm, rope-ladder",
      flowSeries: [
        { date: "2025-06", flow: 920 },
        { date: "2025-09", flow: 870 },
        { date: "2025-12", flow: 760 },
        { date: "2026-02", flow: 640 },
        { date: "2026-04", flow: 540 },
        { date: "2026-05", flow: 480 },
      ],
      timeline: [
        { date: "2022-11-04", type: "creation", title: "AV Fistula created", detail: "Left radiocephalic AVF, end-to-side anastomosis." },
        { date: "2023-01-19", type: "maturation", title: "Maturation confirmed", detail: "Vein diameter 6.2 mm, flow 1120 mL/min. Cleared for cannulation." },
        { date: "2023-08-22", type: "infiltration", title: "Infiltration event", detail: "Arterial needle infiltration, haematoma 3 cm. Rested 1 session." },
        { date: "2024-05-09", type: "infection", title: "Exit-site infection", detail: "Localised cellulitis over cannulation zone. Cefazolin x 7 days." },
        { date: "2025-03-17", type: "stenosis", title: "Stenosis detected", detail: "Doppler: 62% juxta-anastomotic stenosis. Observation advised." },
        { date: "2025-12-11", type: "intervention", title: "Percutaneous angioplasty", detail: "Balloon angioplasty of juxta-anastomotic segment. Post-flow 980 mL/min." },
        { date: "2026-04-21", type: "observation", title: "Reduced thrill noted", detail: "Operator documented weaker thrill, prolonged bleeding 14 min." },
        { date: "2026-05-28", type: "flow", title: "Access flow measurement", detail: "Flow 480 mL/min - below 600 mL/min surveillance threshold." },
      ],
    },
    prescription: {
      bloodFlow: 320,
      dialysateFlow: 500,
      durationMin: 240,
      ufTargetL: 2.4,
      dialysateNa: 138,
      dialysateK: 2.0,
      dialyser: "F8 HPS - high flux",
      anticoagulant: "Heparin 3000 IU bolus + 1000 IU/hr",
      frequency: "3 sessions / week",
      verifiedBy: "Dr. Girish Reddy",
      verifiedOn: "2026-05-02",
    },
    medications: [
      { name: "Erythropoietin alfa", dose: "4000 IU", route: "SC", freq: "Twice weekly", since: "2023-02" },
      { name: "Iron sucrose", dose: "100 mg", route: "IV", freq: "Weekly x 5", since: "2026-04" },
      { name: "Sevelamer", dose: "800 mg", route: "PO", freq: "TDS with meals", since: "2023-06" },
      { name: "Telmisartan", dose: "40 mg", route: "PO", freq: "OD", since: "2022-05" },
      { name: "Insulin glargine", dose: "18 U", route: "SC", freq: "Nightly", since: "2019-08" },
    ],
    labs: [
      { date: "2026-06-02", hb: 9.1, potassium: 5.7, creatinine: 8.4, urea: 132, albumin: 3.4, calcium: 8.2, phosphate: 6.1, ktv: 1.12, urr: 62, crp: 14 },
      { date: "2026-05-04", hb: 9.6, potassium: 5.2, creatinine: 8.1, urea: 124, albumin: 3.5, calcium: 8.4, phosphate: 5.8, ktv: 1.24, urr: 66, crp: 9 },
      { date: "2026-04-06", hb: 10.2, potassium: 4.9, creatinine: 7.8, urea: 118, albumin: 3.6, calcium: 8.6, phosphate: 5.4, ktv: 1.31, urr: 69, crp: 6 },
      { date: "2026-03-08", hb: 10.5, potassium: 4.7, creatinine: 7.6, urea: 112, albumin: 3.7, calcium: 8.7, phosphate: 5.1, ktv: 1.38, urr: 71, crp: 5 },
    ],
    hospitalizations: [
      { date: "2025-12-10", reason: "Elective admission - AVF angioplasty", days: 2, unit: "Vascular Surgery" },
      { date: "2025-07-02", reason: "Fluid overload with pulmonary oedema", days: 4, unit: "Nephrology ICU" },
    ],
    procedures: [
      { date: "2025-12-11", name: "Balloon angioplasty - left AVF", by: "Dr. S. Rao (IR)" },
      { date: "2022-11-04", name: "AV Fistula creation - left radiocephalic", by: "Dr. M. Kapoor" },
    ],
    documents: [
      { name: "Doppler_AVF_28May2026.pdf", type: "Vascular Doppler", date: "2026-05-28", pages: 3 },
      { name: "Labs_CBC_RFT_02Jun2026.pdf", type: "Laboratory", date: "2026-06-02", pages: 2 },
      { name: "Angioplasty_Discharge_Dec2025.pdf", type: "Discharge summary", date: "2025-12-12", pages: 5 },
      { name: "Nephrology_OPD_Note_02May2026.pdf", type: "Clinical note", date: "2026-05-02", pages: 1 },
    ],
    notes: [
      { date: "2026-06-02", by: "Dr. Girish Reddy", text: "Declining access flow with rising venous pressures. Refer vascular for re-look angiography if trend persists over next 3 sessions." },
      { date: "2026-05-02", by: "Dr. Girish Reddy", text: "Kt/V trending down. Consider extending session duration to 250 min if access permits." },
      { date: "2026-04-21", by: "S. Kulkarni (Operator)", text: "Prolonged bleeding post decannulation (14 min). Thrill weaker than usual." },
    ],
    sessions: buildSessions({ seed: 7, count: 12, startNo: 116, baseQb: 340, baseUf: 2.4, baseSbp: 152, dryWeight: 64.5, decline: 4 }),
  },
  {
    id: "DUR-PT-00341",
    uhid: "AH/2023/13907",
    name: "Fatima Sheikh",
    age: 46,
    gender: "Female",
    bloodGroup: "O+",
    phone: "+91 91670 55832",
    photo: "https://images.pexels.com/photos/38547573/pexels-photo-38547573.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940",
    primaryDiagnosis: "Hypertensive Nephrosclerosis - ESRD",
    dialysisVintageMonths: 18,
    comorbidities: ["Hypertension", "Anaemia of CKD"],
    dryWeight: 52.0,
    schedule: "Tue / Thu / Sat - 12:00",
    nextSessionNo: 79,
    riskTier: "moderate",
    vascular: {
      type: "AV Graft",
      site: "Right brachio-axillary",
      side: "Right",
      createdOn: "2024-10-02",
      maturedOn: "2024-11-15",
      accessAgeMonths: 20,
      patency: "Patent - good flow",
      lastFlowMlMin: 1120,
      lastFlowDate: "2026-05-10",
      lastIntervention: "None",
      currentCondition: "Graft soft, no aneurysmal change, strong bruit",
      needle: "16G x 25mm, rotating sites",
      flowSeries: [
        { date: "2025-06", flow: 1180 },
        { date: "2025-09", flow: 1150 },
        { date: "2025-12", flow: 1160 },
        { date: "2026-02", flow: 1130 },
        { date: "2026-04", flow: 1140 },
        { date: "2026-05", flow: 1120 },
      ],
      timeline: [
        { date: "2024-10-02", type: "creation", title: "AV Graft placed", detail: "Right brachio-axillary PTFE graft." },
        { date: "2024-11-15", type: "maturation", title: "Cleared for cannulation", detail: "Incorporation complete, flow 1210 mL/min." },
        { date: "2025-06-08", type: "bleeding", title: "Prolonged bleeding", detail: "11 min at venous site after heparin dose. Dose reviewed." },
        { date: "2026-05-10", type: "flow", title: "Access flow measurement", detail: "Flow 1120 mL/min - within acceptable range." },
      ],
    },
    prescription: {
      bloodFlow: 300,
      dialysateFlow: 500,
      durationMin: 240,
      ufTargetL: 2.0,
      dialysateNa: 138,
      dialysateK: 2.5,
      dialyser: "F7 HPS - high flux",
      anticoagulant: "Heparin 2500 IU bolus",
      frequency: "3 sessions / week",
      verifiedBy: "Dr. P. Deshmukh",
      verifiedOn: "2026-05-20",
    },
    medications: [
      { name: "Erythropoietin alfa", dose: "3000 IU", route: "SC", freq: "Twice weekly", since: "2024-12" },
      { name: "Amlodipine", dose: "5 mg", route: "PO", freq: "OD", since: "2023-01" },
      { name: "Calcium acetate", dose: "667 mg", route: "PO", freq: "TDS", since: "2025-02" },
    ],
    labs: [
      { date: "2026-06-05", hb: 10.4, potassium: 4.6, creatinine: 6.9, urea: 104, albumin: 3.9, calcium: 8.8, phosphate: 4.8, ktv: 1.42, urr: 72, crp: 3 },
      { date: "2026-05-07", hb: 10.2, potassium: 4.8, creatinine: 7.0, urea: 108, albumin: 3.8, calcium: 8.7, phosphate: 5.0, ktv: 1.39, urr: 71, crp: 4 },
      { date: "2026-04-09", hb: 9.9, potassium: 4.5, creatinine: 6.8, urea: 101, albumin: 3.9, calcium: 8.9, phosphate: 4.6, ktv: 1.45, urr: 73, crp: 3 },
    ],
    hospitalizations: [{ date: "2024-10-01", reason: "Elective AV graft placement", days: 3, unit: "Vascular Surgery" }],
    procedures: [{ date: "2024-10-02", name: "AV Graft placement - right arm", by: "Dr. M. Kapoor" }],
    documents: [
      { name: "Doppler_Graft_10May2026.pdf", type: "Vascular Doppler", date: "2026-05-10", pages: 2 },
      { name: "Labs_05Jun2026.pdf", type: "Laboratory", date: "2026-06-05", pages: 2 },
    ],
    notes: [
      { date: "2026-05-20", by: "Dr. P. Deshmukh", text: "Stable on current prescription. Continue rope-ladder rotation to protect graft." },
    ],
    sessions: buildSessions({ seed: 19, count: 10, startNo: 69, baseQb: 300, baseUf: 2.0, baseSbp: 138, dryWeight: 52.0, decline: 0 }),
  },
  {
    id: "DUR-PT-00477",
    uhid: "AH/2026/02219",
    name: "Joseph D'Souza",
    age: 67,
    gender: "Male",
    bloodGroup: "A-",
    phone: "+91 99304 71209",
    photo: "https://images.pexels.com/photos/38547573/pexels-photo-38547573.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940",
    primaryDiagnosis: "Obstructive Uropathy - ESRD (new initiation)",
    dialysisVintageMonths: 3,
    comorbidities: ["Hypertension", "Ischaemic Heart Disease", "Cardiac Failure (EF 38%)"],
    dryWeight: 71.0,
    schedule: "Mon / Thu - 16:00",
    nextSessionNo: 22,
    riskTier: "high",
    vascular: {
      type: "Tunnelled Catheter",
      site: "Right internal jugular",
      side: "Right",
      createdOn: "2026-03-12",
      maturedOn: null,
      accessAgeMonths: 3,
      patency: "Functional - intermittent poor flow",
      lastFlowMlMin: 260,
      lastFlowDate: "2026-06-08",
      lastIntervention: "2026-05-19",
      currentCondition: "Exit site clean; positional flow limitation reported",
      needle: "N/A - catheter lumens",
      flowSeries: [
        { date: "2026-03", flow: 320 },
        { date: "2026-04", flow: 300 },
        { date: "2026-05", flow: 270 },
        { date: "2026-06", flow: 260 },
      ],
      timeline: [
        { date: "2026-03-12", type: "creation", title: "Tunnelled catheter inserted", detail: "Right IJV tunnelled cuffed catheter, tip at cavo-atrial junction." },
        { date: "2026-04-28", type: "observation", title: "Positional flow limitation", detail: "Arterial pressure alarms on left-sided posture." },
        { date: "2026-05-19", type: "intervention", title: "Urokinase lock", detail: "Lumen thrombolysis performed. Flow improved transiently." },
        { date: "2026-06-08", type: "flow", title: "Flow check", detail: "Achievable Qb limited to 260 mL/min." },
      ],
    },
    prescription: {
      bloodFlow: 250,
      dialysateFlow: 500,
      durationMin: 210,
      ufTargetL: 1.8,
      dialysateNa: 140,
      dialysateK: 2.0,
      dialyser: "F6 HPS",
      anticoagulant: "Heparin 2000 IU bolus",
      frequency: "2 sessions / week",
      verifiedBy: "Dr. Girish Reddy",
      verifiedOn: "2026-06-01",
    },
    medications: [
      { name: "Furosemide", dose: "40 mg", route: "PO", freq: "BD", since: "2026-03" },
      { name: "Carvedilol", dose: "3.125 mg", route: "PO", freq: "BD", since: "2025-11" },
      { name: "Atorvastatin", dose: "20 mg", route: "PO", freq: "Nightly", since: "2024-06" },
    ],
    labs: [
      { date: "2026-06-10", hb: 8.4, potassium: 6.1, creatinine: 9.2, urea: 148, albumin: 3.1, calcium: 7.9, phosphate: 6.6, ktv: 0.98, urr: 55, crp: 22 },
      { date: "2026-05-12", hb: 8.8, potassium: 5.6, creatinine: 8.9, urea: 139, albumin: 3.2, calcium: 8.0, phosphate: 6.2, ktv: 1.02, urr: 58, crp: 18 },
    ],
    hospitalizations: [{ date: "2026-03-11", reason: "ESRD initiation, catheter insertion", days: 6, unit: "Nephrology" }],
    procedures: [{ date: "2026-03-12", name: "Tunnelled HD catheter insertion", by: "Dr. S. Rao (IR)" }],
    documents: [{ name: "Catheter_Insertion_Note_Mar2026.pdf", type: "Procedure note", date: "2026-03-12", pages: 2 }],
    notes: [
      { date: "2026-06-01", by: "Dr. Girish Reddy", text: "Permanent access planning pending - vascular referral raised. Cardiac failure limits UF tolerance." },
    ],
    sessions: buildSessions({ seed: 31, count: 8, startNo: 14, baseQb: 260, baseUf: 1.8, baseSbp: 118, dryWeight: 71.0, decline: 2 }),
  },
];

export const whatsappTemplates = {
  sessionSummary: (p, s) =>
    `Dear ${p.name}, your dialysis session #${s.sessionNo} on ${s.date} is complete. Duration ${s.durationMin} min, fluid removed ${s.ufAchieved} L. Please follow fluid and diet advice. - DialyGo Dialysis Unit`,
  reportDispatch: (p) =>
    `Dear ${p.name}, your DialyGo session report (PDF) is attached. Please carry it for your next nephrology review. - DialyGo Dialysis Unit`,
};

export const getPatient = (id) => patients.find((p) => p.id === id);
