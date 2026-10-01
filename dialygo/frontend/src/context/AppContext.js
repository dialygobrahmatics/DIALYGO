import { createContext, useContext, useMemo, useState } from "react";
import { patients } from "@/data/mockData";
import { useAuth } from "@/hooks/useAuth";

// Mock workspace state (drafts, uploads, selected patient, ...). Who is logged in comes from AuthContext.

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

export function AppProvider({ children }) {
  const { userDetails: user, role, signOut } = useAuth();
  const [drafts, setDrafts] = useState({});
  const [whatsappLog, setWhatsappLog] = useState([]);
  const [selectedPatientId, setSelectedPatientId] = useState("DUR-PT-00218");
  const [uploads, setUploads] = useState([]);
  const [engineRuns, setEngineRuns] = useState({});
  const [customPatients, setCustomPatients] = useState([]);
  const [reportRuns, setReportRuns] = useState({});

  const setReportRun = (patientId, state) => setReportRuns((prev) => ({ ...prev, [patientId]: state }));

  const addCustomPatient = (form) => {
    const p = buildCustomPatient(form);
    setCustomPatients((prev) => [...prev, p]);
    return p;
  };

  const addUpload = (doc) => setUploads((prev) => {
    const entry = { id: doc.id || `UPL-${Date.now()}`, at: new Date().toISOString(), status: doc.status || "Received (mock)", ...doc };
    if (doc.replace) {
      const idx = prev.findIndex((u) => u.id === entry.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = { ...prev[idx], ...entry, at: prev[idx].at };
        return next;
      }
    }
    return [entry, ...prev];
  });

  const recordEngineRun = (patientId) => setEngineRuns((prev) => ({ ...prev, [patientId]: new Date().toISOString() }));

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
      user,
      role,
      logout: signOut,
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
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [user, role, drafts, whatsappLog, selectedPatientId, uploads, engineRuns, customPatients, reportRuns]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export const useApp = () => useContext(AppContext);
