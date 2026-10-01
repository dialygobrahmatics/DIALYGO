// Authentication endpoints. See docs/frontend-api.md.
import type { LoginSession, SendOtpResponse, UserSession, UserType } from "@/types";
import { http, unwrap } from "./http";

// Sends an OTP to the mobile number / email stored for the user code (printed in the backend log in development).
// `userType` is the workspace picked on the login screen; the backend rejects a mismatch.
export const sendOtp = (userCode: string, userType: UserType): Promise<SendOtpResponse> =>
  unwrap(http.post<SendOtpResponse>("/auth/send-otp", { user_code: userCode.trim(), user_type: userType }));

export const verifyOtp = (userCode: string, otp: string, userType: UserType): Promise<LoginSession> =>
  unwrap(http.post<LoginSession>("/auth/verify-otp", { user_code: userCode.trim(), otp: otp.trim(), user_type: userType }));

// Restores a session from a stored token.
export const fetchSession = (): Promise<UserSession> => unwrap(http.get<UserSession>("/auth/session"));

export const logout = (): Promise<{ success: boolean }> => unwrap(http.post<{ success: boolean }>("/auth/logout"));
