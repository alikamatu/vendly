/**
 * Vendly Admin API Client
 *
 * Handles all communication with the Vendly NestJS backend.
 * Token management via localStorage for client-side JWT auth.
 */

const TOKEN_KEYS = ['vendly_admin_token', 'admin_token'] as const;

export function getApiUrl(): string {
  const url = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:1000';
  return url.trim().replace(/\/+$/, '');
}

export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  for (const key of TOKEN_KEYS) {
    const token = localStorage.getItem(key);
    if (token) return token;
  }
  return null;
}

export function setToken(token: string): void {
  if (typeof window === 'undefined') return;
  for (const key of TOKEN_KEYS) {
    localStorage.setItem(key, token);
  }
}

export function clearToken(): void {
  if (typeof window === 'undefined') return;
  for (const key of TOKEN_KEYS) {
    localStorage.removeItem(key);
  }
}

export function getHeaders(isMultipart = false): Record<string, string> {
  const headers: Record<string, string> = {};
  const token = getToken();

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  if (!isMultipart) {
    headers['Content-Type'] = 'application/json';
  }

  return headers;
}

export interface ApiError {
  message: string;
  statusCode: number;
}

export class ApiRequestError extends Error {
  statusCode: number;

  constructor(message: string, statusCode: number) {
    super(message);
    this.name = 'ApiRequestError';
    this.statusCode = statusCode;
  }
}

/**
 * Wrapper around fetch for API calls with automatic error handling.
 * Unwraps NestJS ApiResponseInterceptor response envelope ({ data, meta }).
 * Auto-clears token and redirects on 401 when on protected routes.
 */
export async function apiFetch<T = unknown>(path: string, options: RequestInit = {}): Promise<T> {
  const url = `${getApiUrl()}${path}`;

  const res = await fetch(url, {
    ...options,
    headers: {
      ...getHeaders(),
      ...((options.headers as Record<string, string>) || {}),
    },
  });

  const json = await res.json().catch(() => ({}));

  // Handle 401 — token expired or unauthorized
  if (res.status === 401) {
    if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/auth')) {
      clearToken();
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination
      window.location.href = '/auth/login';
    }
    const rawMsg = json?.message || json?.error || 'Session expired. Please log in again.';
    const message = Array.isArray(rawMsg) ? rawMsg.join(', ') : rawMsg;
    throw new ApiRequestError(message, 401);
  }

  if (!res.ok) {
    const rawMsg = json?.message || json?.error || `Request failed with status ${res.status}`;
    const message = Array.isArray(rawMsg) ? rawMsg.join(', ') : rawMsg;
    throw new ApiRequestError(message, res.status);
  }

  // Handle NestJS ApiResponseInterceptor response wrapper ({ data: ..., meta: ... })
  if (json && typeof json === 'object' && 'data' in json && json.data !== undefined) {
    return json.data as T;
  }

  return json as T;
}
