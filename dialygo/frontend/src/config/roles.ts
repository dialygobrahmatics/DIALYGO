// Role definitions shared by routing, layout and auth. Role ids are the frontend's; the backend's
// `userType` values are mapped to them below.
import type { Role, RoleConfig, UserType } from "@/types";

export const ROLES: Record<Role, RoleConfig> = {
  operator: { id: "operator", label: "Operator", home: "/operator/home", tagline: "Dialysis Procedure Operator" },
  doctor: { id: "doctor", label: "Doctor", home: "/doctor/home", tagline: "Consultant Nephrologist" },
  patient: { id: "patient", label: "Patient / Guest", home: "/patient/home", tagline: "Patient self-service" },
  dialysisadmin: { id: "dialysisadmin", label: "Dialysis Admin", home: "/clinical-admin/home", tagline: "Clinical unit administration" },
  techadmin: { id: "techadmin", label: "Technical Admin", home: "/tech-admin/home", tagline: "Platform & systems administration" },
};

export const USER_TYPE_TO_ROLE: Record<UserType, Role> = {
  OPERATOR: "operator",
  DOCTOR: "doctor",
  PATIENT: "patient",
  DIALYSIS_ADMIN: "dialysisadmin",
  TECH_ADMIN: "techadmin",
};

export const ROLE_TO_USER_TYPE: Record<Role, UserType> = {
  operator: "OPERATOR",
  doctor: "DOCTOR",
  patient: "PATIENT",
  dialysisadmin: "DIALYSIS_ADMIN",
  techadmin: "TECH_ADMIN",
};
