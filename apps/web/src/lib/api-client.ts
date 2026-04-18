/**
 * Thin fetch wrapper for the SKEP Forum API.
 *
 * Contract (SKEP-INTEGRATION.md): every response is wrapped in
 *   success: `{ success: true, data, meta }`
 *   error:   `{ success: false, error: { code, message, details? }, meta }`
 *
 * This client unwraps `data` on success and throws `ApiError` on failure so
 * callers can stay contract-aware without branching per response.
 */

export interface ApiErrorBody {
  code: string;
  message: string;
  details?: unknown;
}

export interface EnvelopeMeta {
  requestId: string;
  timestamp: string;
}

interface SuccessEnvelope<T> {
  success: true;
  data: T;
  meta: EnvelopeMeta;
}

interface ErrorEnvelope {
  success: false;
  error: ApiErrorBody;
  meta: EnvelopeMeta;
}

type AnyEnvelope<T> = SuccessEnvelope<T> | ErrorEnvelope;

export class ApiError extends Error {
  readonly code: string;
  readonly statusCode: number;
  readonly details?: unknown;
  readonly requestId: string | undefined;

  constructor(body: ApiErrorBody, statusCode: number, requestId?: string) {
    super(body.message);
    this.code = body.code;
    this.statusCode = statusCode;
    this.details = body.details;
    this.requestId = requestId;
    this.name = 'ApiError';
  }
}

export interface ApiClientOptions {
  getAuthToken: () => string | null;
  baseUrl?: string;
}

function resolveBaseUrl(override?: string): string {
  const fromEnv = process.env.NEXT_PUBLIC_API_BASE_URL;
  const base = override ?? fromEnv ?? 'http://localhost:3001';
  return `${base.replace(/\/$/, '')}/api/v1`;
}

export function createApiClient(options: ApiClientOptions): {
  get: <T>(path: string, init?: RequestInit) => Promise<T>;
  post: <T>(path: string, body?: unknown, init?: RequestInit) => Promise<T>;
  patch: <T>(path: string, body?: unknown, init?: RequestInit) => Promise<T>;
  del: <T>(path: string, init?: RequestInit) => Promise<T>;
} {
  const base = resolveBaseUrl(options.baseUrl);

  async function request<T>(
    method: 'GET' | 'POST' | 'PATCH' | 'DELETE',
    path: string,
    body?: unknown,
    init?: RequestInit,
  ): Promise<T> {
    const token = options.getAuthToken();
    const headers = new Headers(init?.headers);
    headers.set('Accept', 'application/json');
    if (body !== undefined) headers.set('Content-Type', 'application/json');
    if (token) headers.set('Authorization', `Bearer ${token}`);

    const res = await fetch(`${base}${path}`, {
      ...init,
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      credentials: 'include',
    });

    if (res.status === 204) return undefined as T;

    const raw = (await res.json().catch(() => null)) as AnyEnvelope<T> | null;

    if (!raw || typeof raw !== 'object' || !('success' in raw)) {
      throw new ApiError(
        { code: 'NETWORK_ERROR', message: res.statusText || 'Malformed response' },
        res.status,
      );
    }

    if (raw.success) return raw.data;

    throw new ApiError(raw.error, res.status, raw.meta?.requestId);
  }

  return {
    get: <T>(path: string, init?: RequestInit) => request<T>('GET', path, undefined, init),
    post: <T>(path: string, body?: unknown, init?: RequestInit) =>
      request<T>('POST', path, body, init),
    patch: <T>(path: string, body?: unknown, init?: RequestInit) =>
      request<T>('PATCH', path, body, init),
    del: <T>(path: string, init?: RequestInit) => request<T>('DELETE', path, undefined, init),
  };
}
