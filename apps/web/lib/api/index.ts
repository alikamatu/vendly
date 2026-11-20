export const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:1000';

/**
 * Translates HTTP / network failures into messages a non-technical user can
 * act on. The API now returns human-language messages for known cases (via
 * class-validator + service-level wording), so usually we just surface
 * `errorData.message`. This function handles the noisier edges: network
 * outages, 5xx, rate limiting, and anything that didn't come back as JSON.
 */
async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    let errorData: any = {};
    try {
      errorData = await response.json();
    } catch {
      // Body wasn't JSON — keep going with empty.
    }
    const raw = Array.isArray(errorData.message) ? errorData.message.join(' ') : errorData.message;

    const msg = raw && typeof raw === 'string' ? raw : friendlyStatusMessage(response.status);
    const err = new Error(msg);
    (err as any).status = response.status;
    throw err;
  }
  const json = await response.json();
  return json && typeof json === 'object' && 'data' in json ? json.data : json;
}

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

type RequestOpts = {
  token?: string;
  cache?: RequestCache;
  raw?: boolean;
};

function getAuthHeader(token?: string): Record<string, string> {
  const value =
    token ?? (typeof window === 'undefined' ? null : localStorage.getItem('vendly_token'));
  return value ? { Authorization: `Bearer ${value}` } : {};
}

function isFormData(body: unknown): body is FormData {
  return typeof FormData !== 'undefined' && body instanceof FormData;
}

async function request<T>(
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
  url: string,
  body?: unknown,
  opts?: RequestOpts,
): Promise<{ data: T }> {
  const form = isFormData(body);
  const jsonMethod = method === 'POST' || method === 'PUT' || method === 'PATCH';
  const response = await fetch(`${API_URL}${url}`, {
    ...(method === 'GET' ? {} : { method }),
    headers: {
      ...(jsonMethod && !form ? { 'Content-Type': 'application/json' } : {}),
      ...getAuthHeader(opts?.token),
    },
    ...(jsonMethod ? { body: form ? body : body ? JSON.stringify(body) : undefined } : {}),
    ...(opts?.cache ? { cache: opts.cache } : {}),
  });

  if (opts?.raw && response.ok) {
    return { data: (await response.json()) as T };
  }
  return { data: await handleResponse<T>(response) };
}

export const api = {
  get: async <T>(url: string, opts?: RequestOpts) => request<T>('GET', url, undefined, opts),

  post: async <T>(url: string, body?: any, opts?: RequestOpts) =>
    request<T>('POST', url, body, opts),

  put: async <T>(url: string, body?: any, opts?: RequestOpts) => request<T>('PUT', url, body, opts),

  patch: async <T>(url: string, body?: any, opts?: RequestOpts) =>
    request<T>('PATCH', url, body, opts),

  delete: async <T>(url: string, opts?: RequestOpts) => request<T>('DELETE', url, undefined, opts),
};
