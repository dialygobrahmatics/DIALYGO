// Authentication and session types. Mirrors the backend responses in backend/routers/auth.py.

export type UserType = "PATIENT" | "DOCTOR" | "OPERATOR" | "DIALYSIS_ADMIN" | "TECH_ADMIN";

/** Frontend role id; one per workspace (see config/roles.ts). */
export type Role = "operator" | "doctor" | "patient" | "dialysisadmin" | "techadmin";

export interface RoleConfig {
  id: Role;
  label: string;
  home: string;
  tagline: string;
}

export interface PatientProfile {
  id: string;
  name: string;
  patientIdentifier: string;
}

export interface DoctorProfile {
  id: string;
  name: string;
  specialization: string | null;
}

export interface StaffProfile {
  id: string;
  name: string;
  designation: string | null;
  unit: string | null;
}

export type AccountProfile = PatientProfile | DoctorProfile | StaffProfile;

/** Fields shared by the verify-otp and session responses. `profile` is null until the account is registered. */
export interface AccountContext {
  userCode: string;
  userType: UserType;
  registrationRequired: boolean;
  profile: AccountProfile | null;
}

/** POST /auth/verify-otp */
export interface LoginSession extends AccountContext {
  accessToken: string;
}

/** GET /auth/session */
export interface UserSession extends AccountContext {
  userId: string;
  mobileNumber: string; // masked
}

/** POST /auth/send-otp */
export interface SendOtpResponse {
  requestId: string;
  mobileNumber: string; // masked
  email: string | null; // masked
  expiresInSeconds: number;
  channel: string;
  devOtp?: string;
}

/** The signed-in user as the UI uses it. `id` is the login user code (e.g. DOC-0071). */
export interface UserDetails {
  id: string;
  name: string;
  role: Role;
  title: string;
  unit: string | null;
  registrationRequired: boolean;
}

/** Value of the auth context, read through the useAuth hook. */
export interface AuthState {
  userDetails: UserDetails | null;
  /** True while the stored token is being verified with the backend (GET /auth/session). */
  userLoading: boolean;
  role: Role | null;
  /** Starts a session from a verify-otp response; returns null for an account type the web app does not support. */
  startSession: (session: LoginSession) => UserDetails | null;
  signOut: () => Promise<void>;
  /** Local-only: drops the token and the user (expired or rejected token). */
  expireSession: () => void;
}
