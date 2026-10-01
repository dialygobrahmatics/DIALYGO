import { request } from './api';
import type { Dashboard, InsightsResponse, PatientProfile, Session } from '../types';

export const sendOtp = (mobileNumber: string) =>
  request<{ requestId: string; mobileNumber: string; expiresInSeconds: number; devOtp?: string }>(
    '/auth/send-otp',
    { method: 'POST', body: { mobile_number: mobileNumber }, auth: false },
  );

export const verifyOtp = (mobileNumber: string, otp: string) =>
  request<Session & { accessToken: string }>('/auth/verify-otp', {
    method: 'POST',
    body: { mobile_number: mobileNumber, otp },
    auth: false,
  });

export const fetchSession = () => request<Session>('/auth/session');

export const logoutRequest = () => request<{ success: boolean }>('/auth/logout', { method: 'POST' });

export const registerPatient = (payload: {
  name: string;
  aadhaar_number: string;
  date_of_birth?: string | null;
  gender?: string | null;
}) => request<{ patient: PatientProfile; created: boolean }>('/patient/register', { method: 'POST', body: payload });

export const fetchProfile = () =>
  request<{ patient: PatientProfile; account: { mobileNumber: string; userType: string; lastLoginAt: string | null } }>(
    '/patient/profile',
  );

export const updateProfile = (payload: { name?: string; gender?: string | null; date_of_birth?: string | null }) =>
  request<{ patient: PatientProfile }>('/patient/profile', { method: 'PATCH', body: payload });

export const fetchDashboard = () => request<Dashboard>('/patient/dashboard');

export const fetchInsights = () => request<InsightsResponse>('/insights');
