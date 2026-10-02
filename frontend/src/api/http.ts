// Shared axios instance for every call to the DialyGo backend. Feature modules (auth.ts, client.js, ...)
// build on this; keep docs/frontend-api.md in sync when adding calls.
import axios, { AxiosError, AxiosResponse } from "axios";
import { isJwtExpired } from "@/lib/jwt";

const BASE_URL = process.env.REACT_APP_API_BASE_URL !== undefined
  ? process.env.REACT_APP_API_BASE_URL
  : process.env.REACT_APP_BACKEND_URL || "http://localhost:8000";

const TOKEN_KEY = "dialygo_access_token";

// Access token persistence. localStorage keeps the session across reloads (see docs/code-structure.md).
export const tokenStore = {
  get: (): string | null => localStorage.getItem(TOKEN_KEY),
  set: (token: string): void => localStorage.setItem(TOKEN_KEY, token),
  clear: (): void => localStorage.removeItem(TOKEN_KEY),
  // True when a token is stored and not yet expired (checked locally, see lib/jwt.ts).
  isValid: (): boolean => {
    const token = localStorage.getItem(TOKEN_KEY);
    return !!token && !isJwtExpired(token);
  },
};

// Registered by AuthProvider so an expired/invalid token anywhere ends the session and returns to login.
let onUnauthorized: () => void = () => {};
export const setUnauthorizedHandler = (handler: () => void): void => { onUnauthorized = handler; };
export const notifyUnauthorized = (): void => onUnauthorized();

export class ApiError extends Error {
  status: number; // 0 = no response (network / timeout)

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

export const http = axios.create({ baseURL: `${BASE_URL.replace(/\/$/, "")}/api`, timeout: 30000 });

http.interceptors.request.use((config) => {
  const token = tokenStore.get();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

interface ErrorBody {
  detail?: string | { message?: string } | unknown[];
  message?: string;
}

// FastAPI errors arrive as { detail: "msg" } or { detail: { message } }; validation errors (422) as an array.
function messageFrom(error: AxiosError<ErrorBody>): string {
  const body = error.response?.data;
  const detail = body?.detail;
  if (typeof detail === "string") return detail;
  if (detail && !Array.isArray(detail) && typeof detail === "object" && detail.message) return detail.message;
  if (body?.message) return body.message;
  if (Array.isArray(detail)) return "Please check the details you entered.";
  if (!error.response) return "Cannot reach the server. Check your connection and try again.";
  return `Request failed (${error.response.status})`;
}

http.interceptors.response.use(
  (response) => response,
  (error: AxiosError<ErrorBody>) => {
    // 401 on a request that carried a token = the session is gone. (A wrong OTP is a 400, not a 401.)
    if (error.response?.status === 401 && tokenStore.get()) {
      tokenStore.clear();
      onUnauthorized();
    }
    return Promise.reject(new ApiError(messageFrom(error), error.response?.status ?? 0));
  },
);

// Every API function returns the response body rather than the axios response.
export const unwrap = <T>(promise: Promise<AxiosResponse<T>>): Promise<T> => promise.then((response) => response.data);
