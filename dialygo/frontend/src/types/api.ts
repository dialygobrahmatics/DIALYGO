// Types for the API layer: controller results and the useApi hook.

export interface ApiErrorInfo {
  message: string;
  /** HTTP status; 0 = no response (network / timeout). */
  status: number;
  /** True for 401: the token is missing, expired or rejected. */
  isAuthError: boolean;
}

/** What every controller resolves to; controllers never throw. */
export type ApiResult<T> =
  | { ok: true; data: T; message: string | null; error: null }
  | { ok: false; data: null; message: null; error: ApiErrorInfo };

export interface ControllerOptions {
  /** false for public endpoints: useApi skips its token guard. Default true. */
  requiresAuth?: boolean;
  /** Toast text on success when the response has no `message` of its own. */
  successMessage?: string | null;
}

export type Controller<TArgs extends unknown[], TData> = ((...args: TArgs) => Promise<ApiResult<TData>>) & {
  requiresAuth: boolean;
};

export interface UseApiOptions {
  showSuccess?: boolean;
  showError?: boolean;
}

/** [isLoading, apiTrigger, apiResponse, isApiHit] */
export type UseApiReturn<TArgs extends unknown[], TData> = [
  boolean,
  (...args: TArgs) => Promise<ApiResult<TData>>,
  TData | null,
  boolean,
];
