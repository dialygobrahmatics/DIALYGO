import { request } from './api';
import type { ClinicalOverview, Insight, PatientProfile, ReportSummary } from '../types';

export const fetchDoctorProfile = () =>
  request<{ doctor: { id: string; name: string; specialization: string | null; registrationNumber: string | null; status: string }; account: { mobileNumber: string; userType: string } }>(
    '/doctor/profile',
  );

export const fetchDoctorPatients = () =>
  request<{ patients: (PatientProfile & { latestReportAt: string | null })[] }>('/doctor/patients');

export const fetchDoctorPatient = (patientId: string) =>
  request<{ patient: PatientProfile; clinicalOverview: ClinicalOverview; reports: ReportSummary[]; insights: Insight[] }>(
    `/doctor/patients/${patientId}`,
  );
