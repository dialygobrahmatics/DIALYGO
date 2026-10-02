// Wrapper for every API controller. It never throws: the result is always an ApiResult (see types/api.ts)
//   { ok, data, message, error: { message, status, isAuthError } | null }
// so callers (normally the useApi hook) branch on `ok` instead of writing try/catch. Extend this wrapper for
// cross-cutting needs (retries, response mapping, logging) rather than changing individual controllers.
import { ApiError } from "@/api/http";
import type { ApiResult, Controller, ControllerOptions } from "@/types";

const GENERIC_ERROR = "Something went wrong. Please try again.";

export function controller<TArgs extends unknown[], TData>(
  apiFn: (...args: TArgs) => Promise<TData>,
  { requiresAuth = true, successMessage = null }: ControllerOptions = {},
): Controller<TArgs, TData> {
  const run = async (...args: TArgs): Promise<ApiResult<TData>> => {
    try {
      const data = await apiFn(...args);
      const ownMessage = (data as { message?: unknown } | null)?.message;
      return { ok: true, data, message: typeof ownMessage === "string" ? ownMessage : successMessage, error: null };
    } catch (err) {
      const known = err instanceof ApiError;
      return {
        ok: false,
        data: null,
        message: null,
        error: {
          message: known ? err.message : GENERIC_ERROR,
          status: known ? err.status : 0,
          isAuthError: known && err.status === 401,
        },
      };
    }
  };
  return Object.assign(run, { requiresAuth });
}
