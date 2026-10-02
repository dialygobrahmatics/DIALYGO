// The single entry point for calling the backend from components.
//
//   const [isLoading, sendOtpApi, otpResponse, isApiHit] = useApi(AuthControllers.sendOtp);
//   const result = await sendOtpApi(userCode, userType);   // from a submit handler, an effect on mount, anything
//
// - controller: a function wrapped with `controller()` (src/controllers); trigger arguments are passed through to it.
// - options:    { showSuccess = true, showError = true } to silence the automatic toasts.
//
// Responsibilities: token guard before the request (skipped for public controllers), loading state, success/error
// toasts, and ending the session on authentication errors. The trigger always resolves to the controller result
// ({ ok, data, message, error }) and never throws.
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "@/components/ui/sonner";
import { notifyUnauthorized, tokenStore } from "@/api/http";
import type { ApiResult, Controller, UseApiOptions, UseApiReturn } from "@/types";

const SESSION_EXPIRED = "Your session has expired. Please sign in again.";
const SIGN_IN_REQUIRED = "Sign in to continue.";

const failure = (message: string, status = 0, isAuthError = false): ApiResult<never> => ({
  ok: false, data: null, message: null, error: { message, status, isAuthError },
});

// Ends the session (clears token + user, the router sends the user to login) and tells the user why.
const endSession = (message: string): void => {
  notifyUnauthorized();
  toast.error(message);
};

export default function useApi<TArgs extends unknown[], TData>(
  controllerFn: Controller<TArgs, TData>,
  options: UseApiOptions = {},
): UseApiReturn<TArgs, TData> {
  const [isLoading, setIsLoading] = useState(false);
  const [apiResponse, setApiResponse] = useState<TData | null>(null);
  const [isApiHit, setIsApiHit] = useState(false);

  const optionsRef = useRef(options);
  useEffect(() => { optionsRef.current = options; });

  const apiTrigger = useCallback(async (...args: TArgs): Promise<ApiResult<TData>> => {
    const { showSuccess = true, showError = true } = optionsRef.current;

    // Guard: do not send a request that is certain to be rejected.
    if (controllerFn.requiresAuth && !tokenStore.isValid()) {
      const message = tokenStore.get() ? SESSION_EXPIRED : SIGN_IN_REQUIRED;
      endSession(message);
      return failure(message, 401, true);
    }

    setIsLoading(true);
    try {
      const result = await controllerFn(...args);
      if (result.ok) {
        setApiResponse(result.data);
        if (showSuccess && result.message) toast.success(result.message);
      } else if (result.error.isAuthError) {
        endSession(SESSION_EXPIRED);
      } else if (showError) {
        toast.error(result.error.message);
      }
      return result;
    } catch (err) {
      // Controllers built with controller() never throw; this covers plain functions passed in by mistake.
      const message = err instanceof Error && err.message ? err.message : "Something went wrong. Please try again.";
      if (showError) toast.error(message);
      return failure(message);
    } finally {
      setIsLoading(false);
      setIsApiHit(true);
    }
  }, [controllerFn]);

  return [isLoading, apiTrigger, apiResponse, isApiHit];
}
