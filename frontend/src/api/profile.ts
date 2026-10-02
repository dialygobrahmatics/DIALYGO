// Patient profile endpoints. See docs/frontend-api.md.
import type { PatientProfileResponse, UpdateProfilePayload } from "@/types";
import { http, unwrap } from "./http";

export const getProfile = (): Promise<PatientProfileResponse> =>
  unwrap(http.get<PatientProfileResponse>("/patient/profile"));

// Partial update; resolves to the full updated profile.
export const updateProfile = (payload: UpdateProfilePayload): Promise<PatientProfileResponse> =>
  unwrap(http.patch<PatientProfileResponse>("/patient/profile", payload));
