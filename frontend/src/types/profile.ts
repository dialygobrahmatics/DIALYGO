// Patient profile types. Mirrors GET/PATCH /patient/profile (backend/routers/patient.py).
import type { UserType } from "./auth";

export interface PatientInfo {
  id: string;
  patientIdentifier: string;
  name: string;
  dateOfBirth: string | null;
  age: number | null;
  gender: string | null;
  /** Last 4 digits only; the full Aadhaar number is never returned. */
  aadhaarMasked: string;
  createdAt: string | null;
}

/** The signed-in patient's own account details (unmasked). */
export interface AccountInfo {
  userCode: string;
  mobileNumber: string;
  email: string | null;
  userType: UserType;
  lastLoginAt: string | null;
}

export interface ProfileDetails {
  bloodGroup: string | null;
  emergencyContact: string | null;
  knownAllergies: string | null;
  occupation: string | null;
}

export interface ProfileConsents {
  dataSharing: boolean;
  privacyNotice: boolean;
  research: boolean;
  updatedAt: string | null;
}

export interface PatientProfileResponse {
  patient: PatientInfo;
  account: AccountInfo;
  details: ProfileDetails;
  consents: ProfileConsents;
}

/** PATCH /patient/profile body: send only what changes; an empty string clears a text field. */
export interface UpdateProfilePayload {
  name?: string;
  date_of_birth?: string;
  gender?: string;
  email?: string;
  /** New sign-in number (no OTP required). */
  mobile_number?: string;
  blood_group?: string;
  emergency_contact?: string;
  known_allergies?: string;
  occupation?: string;
  consent_data_sharing?: boolean;
  consent_privacy_notice?: boolean;
  consent_research?: boolean;
}
