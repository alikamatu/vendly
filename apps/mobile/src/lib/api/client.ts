import { API_URL } from '../config';

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

/**
 * Same wording as apps/web/lib/api/index.ts so users see consistent
 * messages across web and mobile.
 */
function friendlyStatusMessage(status: number): string {
  if (status === 0) return "Can't reach the server — check your internet connection.";
  if (status === 401) return 'Your session has expired. Please sign in again.';
  if (status === 403) return "You don't have permission to do that.";
  if (status === 404) return "We couldn't find what you were looking for.";
  if (status === 408 || status === 504) return 'The request took too long. Try again.';
  if (status === 409) return 'That action conflicts with something already on file.';
  if (status === 413) return 'That file is too large to upload.';
  if (status === 429) return "You're going a bit fast — try again in a minute.";
  if (status >= 500) return 'Our server hit a snag. Please try again in a moment.';
  return 'Something went wrong. Please try again.';
}

// The auth provider registers these so every request picks up the current
// token, and a 401 anywhere signs the user out.
let tokenGetter: () => string | null = () => null;
let unauthorizedHandler: () => void = () => {};

export function configureApiClient(opts: {
  getToken: () => string | null;
  onUnauthorized: () => void;
}) {
  tokenGetter = opts.getToken;
  unauthorizedHandler = opts.onUnauthorized;
}

type Method = 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';

interface RequestOptions {
  body?: unknown;
  /** Override the token (e.g. right after login, before state updates). */
  token?: string | null;
  /** Skip auth header entirely. */
  anonymous?: boolean;
  /** Keep the `{ data, meta }` envelope instead of unwrapping `data`. */
  raw?: boolean;
  query?: Record<string, string | number | boolean | undefined | null>;
}

function buildUrl(path: string, query?: RequestOptions['query']) {
  if (!query) return `${API_URL}${path}`;
  const qs = Object.entries(query)
    .filter(([, v]) => v !== undefined && v !== null && v !== '')
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
    .join('&');
  return qs ? `${API_URL}${path}?${qs}` : `${API_URL}${path}`;
}

async function request<T>(method: Method, path: string, opts: RequestOptions = {}): Promise<T> {
  const headers: Record<string, string> = { Accept: 'application/json' };
  const token = opts.anonymous ? null : (opts.token ?? tokenGetter());
  if (token) headers.Authorization = `Bearer ${token}`;

  let body: BodyInit | undefined;
  if (opts.body instanceof FormData) {
    body = opts.body;
  } else if (opts.body !== undefined) {
    headers['Content-Type'] = 'application/json';
    body = JSON.stringify(opts.body);
  }

  let response: Response;
  try {
    response = await fetch(buildUrl(path, opts.query), { method, headers, body });
  } catch {
    throw new ApiError(friendlyStatusMessage(0), 0);
  }

  if (!response.ok) {
    let errorData: any = {};
    try {
      errorData = await response.json();
    } catch {
      // body wasn't JSON
    }
    const raw = Array.isArray(errorData.message) ? errorData.message.join(' ') : errorData.message;
    const msg =
      typeof raw === 'string' && raw.length ? raw : friendlyStatusMessage(response.status);
    if (response.status === 401 && token) unauthorizedHandler();
    throw new ApiError(msg, response.status);
  }

  if (response.status === 204) return undefined as T;
  const json = await response.json();
  if (opts.raw) return json as T;
  return (json && typeof json === 'object' && 'data' in json ? json.data : json) as T;
}

export const api = {
  get: <T>(path: string, opts?: RequestOptions) => request<T>('GET', path, opts),
  post: <T>(path: string, body?: unknown, opts?: RequestOptions) =>
    request<T>('POST', path, { ...opts, body }),
  patch: <T>(path: string, body?: unknown, opts?: RequestOptions) =>
    request<T>('PATCH', path, { ...opts, body }),
  put: <T>(path: string, body?: unknown, opts?: RequestOptions) =>
    request<T>('PUT', path, { ...opts, body }),
  delete: <T>(path: string, opts?: RequestOptions) => request<T>('DELETE', path, opts),
};
