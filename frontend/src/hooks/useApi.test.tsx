import { act } from "react";
import { createRoot } from "react-dom/client";
import { toast } from "@/components/ui/sonner";
import { ApiError, notifyUnauthorized, tokenStore } from "@/api/http";
import { controller } from "@/controllers/controller";
import type { ApiResult, Controller, UseApiOptions, UseApiReturn } from "@/types";
import useApi from "./useApi";

jest.mock("@/components/ui/sonner", () => ({ toast: { success: jest.fn(), error: jest.fn() } }));
jest.mock("@/api/http", () => ({ ...jest.requireActual("@/api/http"), notifyUnauthorized: jest.fn() }));
const mockExpireSession = notifyUnauthorized as jest.Mock;

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const jwt = (expOffsetSeconds: number) =>
  `h.${btoa(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + expOffsetSeconds }))}.s`;

// Renders the hook and exposes its latest return value.
type Api = UseApiReturn<unknown[], unknown>;
function setup(controllerFn: Controller<unknown[], unknown>, options?: UseApiOptions) {
  const out = { current: null as unknown as Api };
  const Probe = () => { out.current = useApi(controllerFn, options); return null; };
  const root = createRoot(document.createElement("div"));
  act(() => root.render(<Probe />));
  return out;
}

beforeEach(() => { jest.clearAllMocks(); localStorage.clear(); });

test("public controller: hits the API, toasts the success message, exposes state", async () => {
  const api = jest.fn().mockResolvedValue({ id: 1 });
  const out = setup(controller(api, { requiresAuth: false, successMessage: "Done." }));
  expect(out.current[3]).toBe(false); // isApiHit

  let result!: ApiResult<unknown>;
  await act(async () => { result = await out.current[1]("a", "b"); });

  expect(api).toHaveBeenCalledWith("a", "b");
  expect(result).toMatchObject({ ok: true, data: { id: 1 } });
  expect(out.current[0]).toBe(false); // isLoading
  expect(out.current[2]).toEqual({ id: 1 }); // apiResponse
  expect(out.current[3]).toBe(true);
  expect(toast.success).toHaveBeenCalledWith("Done.");
});

test("isLoading is true while the request is in flight", async () => {
  let release: (value: unknown) => void = () => undefined;
  const api = jest.fn(() => new Promise((resolve) => { release = resolve; }));
  const out = setup(controller(api, { requiresAuth: false }));
  let pending: Promise<unknown> = Promise.resolve();
  act(() => { pending = out.current[1](); });
  expect(out.current[0]).toBe(true);
  await act(async () => { release({}); await pending; });
  expect(out.current[0]).toBe(false);
});

test.each([
  ["no token", () => undefined],
  ["expired token", () => tokenStore.set(jwt(-60))],
  ["malformed token", () => tokenStore.set("not-a-jwt")],
])("guard blocks a protected call with %s and ends the session", async (_name, arrange) => {
  arrange();
  const api = jest.fn();
  const out = setup(controller(api));
  let result!: ApiResult<unknown>;
  await act(async () => { result = await out.current[1](); });

  expect(api).not.toHaveBeenCalled();
  expect(mockExpireSession).toHaveBeenCalledTimes(1);
  expect(toast.error).toHaveBeenCalledTimes(1);
  expect(!result.ok && result.error.isAuthError).toBe(true);
});

test("valid token lets a protected call through", async () => {
  tokenStore.set(jwt(3600));
  const api = jest.fn().mockResolvedValue({ ok: 1 });
  const out = setup(controller(api));
  await act(async () => { await out.current[1](); });
  expect(api).toHaveBeenCalledTimes(1);
  expect(mockExpireSession).not.toHaveBeenCalled();
});

test("a 401 from the API ends the session and toasts", async () => {
  tokenStore.set(jwt(3600));
  const out = setup(controller(jest.fn().mockRejectedValue(new ApiError("nope", 401))));
  await act(async () => { await out.current[1](); });
  expect(mockExpireSession).toHaveBeenCalledTimes(1);
  expect(toast.error).toHaveBeenCalledWith("Your session has expired. Please sign in again.");
});

test("other API errors toast the server message and keep the session", async () => {
  const out = setup(controller(jest.fn().mockRejectedValue(new ApiError("That verification code is incorrect.", 400)), { requiresAuth: false }));
  let result!: ApiResult<unknown>;
  await act(async () => { result = await out.current[1](); });
  expect(toast.error).toHaveBeenCalledWith("That verification code is incorrect.");
  expect(mockExpireSession).not.toHaveBeenCalled();
  expect(result.ok).toBe(false);
});

test("showError / showSuccess options silence toasts", async () => {
  const fail = setup(controller(jest.fn().mockRejectedValue(new ApiError("x", 500)), { requiresAuth: false }), { showError: false });
  await act(async () => { await fail.current[1](); });
  const ok = setup(controller(jest.fn().mockResolvedValue({}), { requiresAuth: false, successMessage: "Yay" }), { showSuccess: false });
  await act(async () => { await ok.current[1](); });
  expect(toast.error).not.toHaveBeenCalled();
  expect(toast.success).not.toHaveBeenCalled();
});

test("non-wrapped function that throws is caught by the hook", async () => {
  const out = setup(jest.fn().mockRejectedValue(new Error("boom")) as unknown as Controller<unknown[], unknown>);
  tokenStore.set(jwt(3600));
  let result!: ApiResult<unknown>;
  await act(async () => { result = await out.current[1](); });
  expect(result.ok).toBe(false);
  expect(toast.error).toHaveBeenCalledWith("boom");
  expect(out.current[3]).toBe(true);
});
