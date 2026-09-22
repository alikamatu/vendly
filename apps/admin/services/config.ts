/**
 * Vendly Admin External API Configuration
 *
 * Connects directly to the NestJS API (locally http://localhost:1000 or NEXT_PUBLIC_API_URL).
 * Coordinates tokens with the admin AuthContext and localStorage.
 */

export function getVendlyApiUrl(): string {
  const url =
    process.env.NEXT_PUBLIC_API_URL ||
    process.env.NEXT_PUBLIC_VENDLY_API_URL ||
    process.env.VENDLY_API_URL ||
    'http://localhost:1000';

  if (!url || url === 'undefined' || url === 'null' || url.trim() === '') {
    return 'http://localhost:1000';
  }

  return url.trim().replace(/\/+$/, '');
}

export const VENDLY_API_BASE_URL = getVendlyApiUrl();

export const TOKEN_KEYS = ['admin_token', 'vendly_admin_token'] as const;

export function getVendlyToken(): string {
  if (typeof window !== 'undefined') {
    for (const key of TOKEN_KEYS) {
      const stored = localStorage.getItem(key);
      if (stored) return stored;
    }
  }
  return process.env.NEXT_PUBLIC_VENDLY_ADMIN_TOKEN || process.env.VENDLY_ADMIN_TOKEN || '';
}

export function setVendlyToken(token: string) {
  if (typeof window === 'undefined') return;
  localStorage.setItem('admin_token', token);
  localStorage.setItem('vendly_admin_token', token);
}

export function clearVendlyToken() {
  if (typeof window === 'undefined') return;
  for (const key of TOKEN_KEYS) {
    localStorage.removeItem(key);
  }
}

export function getVendlyHeaders(isMultipart = false): Record<string, string> {
  const token = getVendlyToken();
  const headers: Record<string, string> = {};

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  if (!isMultipart) {
    headers['Content-Type'] = 'application/json';
  }

  return headers;
}

export function qs(params: Record<string, unknown>): string {
  const entries = Object.entries(params).filter(
    ([, v]) => v !== undefined && v !== null && v !== '',
  );
  if (!entries.length) return '';
  return (
    '?' +
    entries.map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`).join('&')
  );
}

export async function unwrap<T>(res: Response): Promise<T> {
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message = json?.message || json?.error || `Request failed (${res.status})`;
    throw new Error(Array.isArray(message) ? message.join(', ') : message);
  }
  if (json && typeof json === 'object' && 'data' in json) {
    // If response was lifted into { data: [...items], meta: { total, ... } }, merge so both data and meta are available
    if (
      Array.isArray(json.data) &&
      json.meta &&
      typeof json.meta === 'object' &&
      Object.keys(json.meta).length > 0
    ) {
      return {
        data: json.data,
        ...json.meta,
      } as T;
    }
    return json.data as T;
  }
  return json as T;
}
