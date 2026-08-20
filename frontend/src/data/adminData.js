// Mock platform/admin data for the DialyGo Phase-I prototype.

export const platformUsers = [
  { id: "OPR-1041", name: "S. Kulkarni", role: "Operator", unit: "Nephro Unit B", status: "Active", lastLogin: "2026-06-19 07:42" },
  { id: "OPR-2276", name: "R. Menon", role: "Operator", unit: "Nephro Unit A", status: "Active", lastLogin: "2026-06-18 12:05" },
  { id: "OPR-3390", name: "A. Fernandes", role: "Operator", unit: "Critical Care Dialysis", status: "Active", lastLogin: "2026-06-17 16:20" },
  { id: "DOC-0071", name: "Dr. Girish Reddy", role: "Doctor", unit: "Nephrology", status: "Active", lastLogin: "2026-06-19 08:10" },
  { id: "DOC-0088", name: "Dr. P. Deshmukh", role: "Doctor", unit: "Nephrology", status: "Active", lastLogin: "2026-06-16 09:55" },
  { id: "DOC-0102", name: "Dr. S. Rao", role: "Doctor", unit: "Interventional Radiology", status: "Invited", lastLogin: "—" },
  { id: "ADM-0001", name: "P. Raghavan", role: "Technical Admin", unit: "DialyGo Platform Operations", status: "Active", lastLogin: "2026-06-19 06:30" },
  { id: "ADM-0002", name: "Dr. K. Sharma", role: "Dialysis Admin", unit: "Dialysis Services", status: "Active", lastLogin: "2026-06-19 07:15" },
  { id: "DUR-PT-00218", name: "Ramesh Iyer", role: "Patient", unit: "Maintenance HD", status: "Active", lastLogin: "2026-06-14 19:02" },
  { id: "DUR-PT-00341", name: "Fatima Sheikh", role: "Patient", unit: "Maintenance HD", status: "Active", lastLogin: "2026-06-12 18:40" },
  { id: "DUR-PT-00477", name: "Joseph D'Souza", role: "Patient", unit: "Maintenance HD", status: "Consent pending", lastLogin: "2026-06-10 17:15" },
];

export const doctorsDirectory = [
  { id: "DOC-0071", name: "Dr. Girish Reddy", speciality: "Nephrology", patients: 2, pendingSignOffs: 1, unit: "Nephro Unit B" },
  { id: "DOC-0088", name: "Dr. P. Deshmukh", speciality: "Nephrology", patients: 1, pendingSignOffs: 0, unit: "Nephro Unit A" },
  { id: "DOC-0102", name: "Dr. S. Rao", speciality: "Interventional Radiology", patients: 0, pendingSignOffs: 0, unit: "Vascular" },
];

export const operatorsDirectory = [
  { id: "OPR-1041", name: "S. Kulkarni", shift: "Morning", sessionsToday: 3, unit: "Nephro Unit B", certification: "Valid to 2027-03" },
  { id: "OPR-2276", name: "R. Menon", shift: "Afternoon", sessionsToday: 2, unit: "Nephro Unit A", certification: "Valid to 2026-11" },
  { id: "OPR-3390", name: "A. Fernandes", shift: "Night", sessionsToday: 1, unit: "Critical Care", certification: "Valid to 2028-01" },
];

export const ingestionJobs = [
  { id: "ING-9001", source: "Manual entry — operator console", records: 128, status: "Completed", mode: "Phase-I", at: "2026-06-19 07:55" },
  { id: "ING-9002", source: "Patient portal upload (mock)", records: 6, status: "Completed", mode: "Phase-I", at: "2026-06-18 20:12" },
  { id: "ING-9003", source: "Laboratory CSV (mock)", records: 42, status: "Completed", mode: "Phase-I", at: "2026-06-18 06:40" },
  { id: "ING-9004", source: "Dialysis machine telemetry (simulated)", records: 310, status: "Running", mode: "Phase-I", at: "2026-06-19 08:20" },
  { id: "ING-9005", source: "Scanned report extraction", records: 0, status: "Future release", mode: "Roadmap", at: "—" },
];

export const integrations = [
  { name: "Dialysis machine API / HL7 gateway", state: "Simulated in Phase-I", detail: "Telemetry stream replayed from mock device profile FRESENIUS-4008S." },
  { name: "Hospital management system (HIS/EMR)", state: "Future release", detail: "Bi-directional patient and prescription sync planned post Phase-I." },
  { name: "Laboratory information system", state: "Simulated in Phase-I", detail: "Lab values entered manually or via mock CSV ingestion." },
  { name: "Patient portal document upload", state: "Simulated in Phase-I", detail: "Mock upload zone captures file metadata only." },
  { name: "Scanned report extraction (OCR)", state: "Future release", detail: "Not implemented in Phase-I." },
  { name: "WhatsApp Business API", state: "Mocked in Phase-I", detail: "Dispatch is logged in-app; no message leaves the device." },
];

export const machineFleet = [
  { id: "MC-4008-01", model: "Fresenius 4008S", unit: "Nephro Unit B", status: "In session", uptime: "99.2%", alarms24h: 3, lastService: "2026-05-02" },
  { id: "MC-4008-02", model: "Fresenius 4008S", unit: "Nephro Unit B", status: "Idle", uptime: "98.7%", alarms24h: 0, lastService: "2026-04-18" },
  { id: "MC-5008-07", model: "Fresenius 5008", unit: "Nephro Unit A", status: "In session", uptime: "99.6%", alarms24h: 1, lastService: "2026-05-27" },
  { id: "MC-AK98-03", model: "Gambro AK98", unit: "Critical Care", status: "Maintenance", uptime: "94.1%", alarms24h: 6, lastService: "2026-06-11" },
];

export const auditActivity = [
  { at: "2026-06-19 08:22", actor: "OPR-1041", action: "Viewed Patient 360° — DUR-PT-00218" },
  { at: "2026-06-19 08:20", actor: "OPR-1041", action: "Ran core engine — session #128" },
  { at: "2026-06-19 08:11", actor: "DOC-0071", action: "Approved prescription report — session #127" },
  { at: "2026-06-18 20:12", actor: "DUR-PT-00341", action: "Uploaded laboratory report (mock)" },
  { at: "2026-06-18 19:47", actor: "ADM-0001", action: "Updated retention policy setting" },
];

export const roadmapItems = [
  { title: "Automatic device data capture", detail: "Direct ingestion of dialysis machine parameters and alarms through vendor APIs / HL7 instead of simulated telemetry.", group: "Data capture" },
  { title: "Hospital management system integration", detail: "Two-way sync of demographics, prescriptions, admissions and laboratory results with the facility HIS/EMR.", group: "Integration" },
  { title: "Portal-based report upload", detail: "Verified patient and facility portals for structured document submission with validation workflows.", group: "Data capture" },
  { title: "Scanned report extraction", detail: "Extraction of values from scanned laboratory and discharge documents to reduce manual entry.", group: "Data capture" },
  { title: "LLM-based analysis", detail: "Narrative consolidation of longitudinal evidence into clinician-facing summaries.", group: "Analytics" },
  { title: "RAG-based knowledge retrieval", detail: "Retrieval of guideline and protocol context alongside the patient's own record.", group: "Analytics" },
  { title: "Predictive machine learning", detail: "Predictive models for access dysfunction and intradialytic events, replacing rule-based illustration.", group: "Analytics" },
  { title: "Image-based / angiogram analysis", detail: "Assessment of vascular imaging as part of the COG Vascular Access programme.", group: "Imaging" },
  { title: "Biometric and face-recognition login", detail: "Fingerprint / face authentication for patient and operator sign-in.", group: "Access" },
];
