const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:1000';

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
    const raw = Array.isArray(errorData.message)
      ? errorData.message.join(' ')
      : errorData.message;

    const msg = raw && typeof raw === 'string'
      ? raw
      : friendlyStatusMessage(response.status);
    const err = new Error(msg);
    (err as any).status = response.status;
    throw err;
  }
  const json = await response.json();
  return (json && typeof json === 'object' && 'data' in json) ? json.data : json;
}

function friendlyStatusMessage(status: number): string {
  if (status === 0) return "Can't reach the server — check your internet connection.";
  if (status === 401) return 'Your session has expired. Please sign in again.';
  if (status === 403) return "You don't have permission to do that.";
  if (status === 404) return "We couldn't find what you were looking for.";
  if (status === 408 || status === 504) return "The request took too long. Try again.";
  if (status === 409) return 'That action conflicts with something already on file.';
  if (status === 413) return 'That file is too large to upload.';
  if (status === 429) return "You're going a bit fast — try again in a minute.";
  if (status >= 500) return 'Our server hit a snag. Please try again in a moment.';
  return 'Something went wrong. Please try again.';
}

function getAuthHeader(): Record<string, string> {
  if (typeof window === 'undefined') return {};
  const token = localStorage.getItem('verndly_token');
  return token ? { 'Authorization': `Bearer ${token}` } : {};
}

export const api = {
  get: async <T>(url: string) => {
    const response = await fetch(`${API_URL}${url}`, {
      headers: {
        ...getAuthHeader(),
      },
    });
    return { data: await handleResponse<T>(response) };
  },

  post: async <T>(url: string, body?: any) => {
    const response = await fetch(`${API_URL}${url}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader(),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    return { data: await handleResponse<T>(response) };
  },

  patch: async <T>(url: string, body?: any) => {
    const response = await fetch(`${API_URL}${url}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader(),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    return { data: await handleResponse<T>(response) };
  },

  delete: async <T>(url: string) => {
    const response = await fetch(`${API_URL}${url}`, {
      method: 'DELETE',
      headers: {
        ...getAuthHeader(),
      },
    });
    return { data: await handleResponse<T>(response) };
  },
};
