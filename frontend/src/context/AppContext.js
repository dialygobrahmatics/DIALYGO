import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { operators } from "@/data/mockData";

const AppContext = createContext(null);

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
  const [operator, setOperator] = useState(() => {
    const raw = localStorage.getItem("durise_operator");
    return raw ? JSON.parse(raw) : null;
  });
  const [drafts, setDrafts] = useState({});
  const [whatsappLog, setWhatsappLog] = useState([]);

  useEffect(() => {
    if (operator) localStorage.setItem("durise_operator", JSON.stringify(operator));
    else localStorage.removeItem("durise_operator");
  }, [operator]);

  const login = (operatorId, consent) => {
    const found = operators.find((o) => o.id.toLowerCase() === operatorId.trim().toLowerCase());
    if (!found) return { ok: false, error: "Operator ID not recognised in this unit." };
    if (!consent) return { ok: false, error: "DPDP Act consent acknowledgement is required." };
    setOperator({ ...found, loginAt: new Date().toISOString(), consentAt: new Date().toISOString() });
    return { ok: true };
  };

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
    () => ({ operator, login, logout, drafts, getDraft, updateDraft, setStage, whatsappLog, addWhatsapp }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [operator, drafts, whatsappLog]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export const useApp = () => useContext(AppContext);
