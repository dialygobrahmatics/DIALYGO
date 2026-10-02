export type UserType = 'PATIENT' | 'DOCTOR';

export type SessionProfile = {
  id: string;
  name: string;
  patientIdentifier?: string;
  specialization?: string | null;
};

export type Session = {
  userId?: string;
  mobileNumber?: string;
  userType: UserType;
  registrationRequired: boolean;
  profile: SessionProfile | null;
};

export type PatientProfile = {
  id: string;
  patientIdentifier: string;
  name: string;
  dateOfBirth: string | null;
  age: number | null;
  gender: string | null;
  aadhaarMasked: string;
  createdAt: string | null;
};

export type LabValue = {
  testName: string;
  value: string | null;
  unit: string | null;
  referenceRange: string | null;
  testDate: string | null;
};

export type ClinicalOverview = {
  labs: LabValue[];
  vitals: { systolicBp: number | null; diastolicBp: number | null; heartRate: number | null; weight: number | null; recordedAt: string } | null;
  unverified: boolean;
};

export type DialysisSessionSummary = {
  id: string;
  sessionDate: string;
  startTime: string | null;
  status: string | null;
  dialysisCenter: string | null;
};

export type ReportSummary = {
  id: string;
  documentId?: string;
  reportType: string;
  fileName: string | null;
  fileType?: string | null;
  status: string;
  uploadedAt: string;
  processedAt?: string | null;
};

export type Dashboard = {
  patient: PatientProfile;
  nextSession: DialysisSessionSummary | null;
  lastSession: DialysisSessionSummary | null;
  clinicalOverview: ClinicalOverview;
  recentReports: ReportSummary[];
  reportCount: number;
};

export type Insight = {
  insight_type: 'ATTENTION' | 'MONITOR' | 'STABLE';
  title: string;
  insight_text: string;
  supporting_data: Record<string, unknown>;
};

export type InsightsResponse = {
  insights: Insight[];
  counts: { attention: number; monitor: number; stable: number };
  disclaimer: string;
};

export type OcrResult = {
  status: string;
  extractedText: string;
  extractedFields: { labs?: { test_name: string; test_value: string; unit: string; reference_range: string }[]; vitals?: Record<string, number> };
  engine?: string | null;
  warnings?: string[];
  error?: string | null;
  processedAt?: string | null;
  unverified: boolean;
};

export const REPORT_TYPES: { value: string; label: string }[] = [
  { value: 'LAB_REPORT', label: 'Lab Report' },
  { value: 'DIALYSIS_REPORT', label: 'Previous Dialysis Report' },
  { value: 'VASCULAR_DOPPLER', label: 'Vascular Doppler' },
  { value: 'DISCHARGE_SUMMARY', label: 'Discharge Summary' },
  { value: 'PRESCRIPTION', label: 'Prescription' },
  { value: 'CLINICAL_NOTE', label: 'Clinical Note' },
  { value: 'OTHER', label: 'Other Medical Report' },
];

export const reportTypeLabel = (value: string) =>
  REPORT_TYPES.find((t) => t.value === value)?.label ?? 'Medical Report';
