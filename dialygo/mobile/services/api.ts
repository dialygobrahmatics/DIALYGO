/** Single REST client for the Dialygo FastAPI backend. The app never touches a database. */
import { readToken } from './storage';

const BASE = process.env.EXPO_PUBLIC_API_URL;
const TIMEOUT_MS = 30000;

export class ApiError extends Error {
  status: number;
  payload: unknown;
  constructor(status: number, message: string, payload?: unknown) {
    super(message);
    this.status = status;
    this.payload = payload;
  }
  get isSessionExpired() {
    return this.status === 401;
  }
  get isNetwork() {
    return this.status === 0;
  }
}

function messageFrom(status: number, body: any): string {
  const detail = body?.detail;
  if (typeof detail === 'string') return detail;
  if (detail && typeof detail === 'object' && typeof detail.message === 'string') return detail.message;
  if (status >= 500) return 'Something went wrong at our end. Please try again shortly.';
  return 'We could not complete that request. Please try again.';
}

type RequestOptions = { method?: string; body?: unknown; form?: FormData; auth?: boolean };

export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, form, auth = true } = options;
  const headers: Record<string, string> = {};
  if (body) headers['Content-Type'] = 'application/json';
  if (auth) {
    const token = await readToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  let response: Response;
  try {
    response = await fetch(`${BASE}/api${path}`, {
      method,
      headers,
      body: form ?? (body ? JSON.stringify(body) : undefined),
      signal: controller.signal,
    });
  } catch (error: any) {
    clearTimeout(timer);
    const aborted = error?.name === 'AbortError';
    throw new ApiError(
      0,
      aborted
        ? 'The request took too long. Check your connection and try again.'
        : 'No internet connection. Check your network and try again.',
    );
  }
  clearTimeout(timer);

  const text = await response.text();
  let payload: any = null;
  try {
    payload = text ? JSON.parse(text) : null;
  } catch {
    payload = null;
  }
  if (!response.ok) throw new ApiError(response.status, messageFrom(response.status, payload), payload);
  return payload as T;
}
