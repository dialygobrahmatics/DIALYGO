import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { operators, patients } from "@/data/mockData";
import { doctorsDirectory } from "@/data/adminData";

// Demo access gate only — not real security. Single shared password for all valid mock IDs.
export const DEMO_PASSWORD = "DialyGo2026";

export const validIdsByRole = {
  operator: operators.map((o) => o.id),
  doctor: doctorsDirectory.map((d) => d.id),
  patient: patients.map((p) => p.id),
  dialysisadmin: ["ADM-0002"],
  techadmin: ["ADM-0001"],
};

const AppContext = createContext(null);

// Builds a display-ready patient record from the operator's manual entry form (mock only).
const buildCustomPatient = (form) => {
  const tpl = patients[1];
  return {
    ...tpl,
    isCustom: true,
    id: form.uhid ? `DUR-PT-${String(form.uhid).slice(-5)}` : `DUR-PT-N${Date.now().toString().slice(-5)}`,
    uhid: form.uhid || tpl.uhid,
    name: form.name,
    age: Number(form.age) || tpl.age,
    gender: form.gender || tpl.gender,
    primaryDiagnosis: form.diagnosis || tpl.primaryDiagnosis,
    nextSessionNo: form.nextSession || tpl.nextSessionNo,
    schedule: form.schedule || tpl.schedule,
    cog: `Maintain ${form.accessType || tpl.vascular.type} function and achieve prescribed session targets`,
    vascular: {
      ...tpl.vascular,
      type: form.accessType || tpl.vascular.type,
      lastFlowMlMin: Number(form.accessFlow) || tpl.vascular.lastFlowMlMin,
    },
  };
};

const emptyDraft = (patient) => ({
  stage: "before",
  before: {
    weight: "",
    bp: "",
    pulse: "",
    temperature: "",
    fluidStatus: "",
    accessAssessment: "",
    cannulationAttempts: "1",
    needle: patient.vascular.needle,
    prescriptionVerified: false,
    medsConfirmed: false,
    symptoms: "",
  },
  during: {
    bloodFlow: "",
    dialysateFlow: String(patient.prescription.dialysateFlow),
    venousPressure: "",
    arterialPressure: "",
    tmp: "",
    ufRemoved: "",
    dialysateNa: String(patient.prescription.dialysateNa),
    dialysateTemp: "36.5",
    alarms: [],
    accessObservation: "",
    symptoms: "",
    interventions: "",
    medicationGiven: "",
  },
  after: {
    postWeight: "",
    postBp: "",
    postPulse: "",
    actualUf: "",
    durationMin: "",
    accessCondition: "",
    bleedingTimeMin: "",
    complications: "",
    observations: "",
    outcome: "",
  },
  signOff: { clinician: "", designation: "", accepted: false, at: null },
});

export const ROLES = {
  operator: { id: "operator", label: "Operator", home: "/operator/home", tagline: "Dialysis Procedure Operator" },
  doctor: { id: "doctor", label: "Doctor", home: "/doctor/home", tagline: "Consultant Nephrologist" },
  patient: { id: "patient", label: "Patient / Guest", home: "/patient/home", tagline: "Patient self-service" },
  dialysisadmin: { id: "dialysisadmin", label: "Dialysis Admin", home: "/clinical-admin/home", tagline: "Clinical unit administration" },
  techadmin: { id: "techadmin", label: "Technical Admin", home: "/tech-admin/home", tagline: "Platform & systems administration" },
};

const demoUsers = {
  operator: { id: "OPR-1041", name: "S. Kulkarni", role: "operator", title: "Senior Dialysis Technician", unit: "Nephro Unit B" },
  doctor: { id: "DOC-0071", name: "DR. Gireesh Reddy", role: "doctor", title: "Consultant Nephrologist", unit: "Nephrology" },
  patient: { id: "DUR-PT-00218", name: "Ramesh Iyer", role: "patient", title: "Patient", unit: "Maintenance haemodialysis" },
  dialysisadmin: { id: "ADM-0002", name: "Dr. K. Sharma", role: "dialysisadmin", title: "Dialysis Unit Administrator", unit: "Dialysis Services" },
  techadmin: { id: "ADM-0001", name: "P. Raghavan", role: "techadmin", title: "Technical Administrator", unit: "DialyGo Platform Operations" },
};

export function AppProvider({ children }) {
  const [operator, setOperator] = useState(() => {
    const raw = localStorage.getItem("dialygo_user");
    return raw ? JSON.parse(raw) : null;
  });
  const [drafts, setDrafts] = useState({});
  const [whatsappLog, setWhatsappLog] = useState([]);
  const [selectedPatientId, setSelectedPatientId] = useState("DUR-PT-00218");
  const [uploads, setUploads] = useState([]);
  const [engineRuns, setEngineRuns] = useState({});
  const [customPatients, setCustomPatients] = useState([]);
  const [demoAccess, setDemoAccess] = useState(() => localStorage.getItem("dialygo_demo_access") === "true");
  const [reportRuns, setReportRuns] = useState({});

  const setReportRun = (patientId, state) => setReportRuns((prev) => ({ ...prev, [patientId]: state }));

  const addCustomPatient = (form) => {
    const p = buildCustomPatient(form);
    setCustomPatients((prev) => [...prev, p]);
    return p;
  };

  useEffect(() => {
    if (operator) localStorage.setItem("dialygo_user", JSON.stringify(operator));
    else localStorage.removeItem("dialygo_user");
  }, [operator]);

  const login = (roleId, identifier, consent, password) => {
    if (!ROLES[roleId]) return { ok: false, error: "Select a role to continue." };
    if (!consent) return { ok: false, error: "DPDP Act consent acknowledgement is required." };
    const entered = (identifier || "").trim();
    const known = (validIdsByRole[roleId] || []).find((v) => v.toLowerCase() === entered.toLowerCase());
    if (!known) return { ok: false, error: "Invalid ID or password." };
    if (!demoAccess && (password || "") !== DEMO_PASSWORD) return { ok: false, error: "Invalid ID or password." };
    if (!demoAccess) {
      localStorage.setItem("dialygo_demo_access", "true");
      setDemoAccess(true);
    }
    if (roleId === "operator") {
      const found = operators.find((o) => o.id.toLowerCase() === known.toLowerCase());
      setOperator({ ...demoUsers.operator, id: found.id, name: found.name, title: found.role, unit: found.unit, loginAt: new Date().toISOString(), consentAt: new Date().toISOString() });
      return { ok: true, home: ROLES.operator.home };
    }
    setOperator({ ...demoUsers[roleId], id: known, loginAt: new Date().toISOString(), consentAt: new Date().toISOString() });
    return { ok: true, home: ROLES[roleId].home };
  };

  const switchRole = (roleId) => {
    setOperator((prev) => ({ ...demoUsers[roleId], loginAt: prev?.loginAt || new Date().toISOString(), consentAt: new Date().toISOString() }));
    return ROLES[roleId].home;
  };

  const addUpload = (doc) => setUploads((prev) => [{ id: `UPL-${Date.now()}`, at: new Date().toISOString(), status: "Received (mock)", ...doc }, ...prev]);

  const recordEngineRun = (patientId) => setEngineRuns((prev) => ({ ...prev, [patientId]: new Date().toISOString() }));

  const logout = () => setOperator(null);

  const getDraft = (patient) => drafts[patient.id] || emptyDraft(patient);

  const updateDraft = (patient, stage, patch) =>
    setDrafts((prev) => {
      const cur = prev[patient.id] || emptyDraft(patient);
      return { ...prev, [patient.id]: { ...cur, [stage]: { ...cur[stage], ...patch } } };
    });

  const setStage = (patient, stage) =>
    setDrafts((prev) => {
      const cur = prev[patient.id] || emptyDraft(patient);
      return { ...prev, [patient.id]: { ...cur, stage } };
    });

  const addWhatsapp = (entry) =>
    setWhatsappLog((prev) => [{ id: `WA-${Date.now()}`, at: new Date().toISOString(), status: "delivered (simulated)", ...entry }, ...prev]);

  const value = useMemo(
    () => ({
      user: operator,
      operator,
      role: operator?.role || null,
      login,
      logout,
      switchRole,
      drafts,
      getDraft,
      updateDraft,
      setStage,
      whatsappLog,
      addWhatsapp,
      selectedPatientId,
      setSelectedPatientId,
      uploads,
      addUpload,
      engineRuns,
      recordEngineRun,
      customPatients,
      addCustomPatient,
      reportRuns,
      setReportRun,
      demoAccess,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [operator, drafts, whatsappLog, selectedPatientId, uploads, engineRuns, customPatients, reportRuns, demoAccess]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export const useApp = () => useContext(AppContext);
