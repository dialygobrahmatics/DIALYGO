// Auth controllers: use these with useApi (e.g. useApi(AuthControllers.sendOtp)). Endpoints: docs/frontend-api.md.
import * as authApi from "@/api/auth";
import { controller } from "./controller";

export const AuthControllers = {
  sendOtp: controller(authApi.sendOtp, { requiresAuth: false, successMessage: "Verification code sent." }),
  verifyOtp: controller(authApi.verifyOtp, { requiresAuth: false, successMessage: "Signed in successfully." }),
  session: controller(authApi.fetchSession),
  logout: controller(authApi.logout),
};
