const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:1000';

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const msg = Array.isArray(errorData.message) ? errorData.message[0] : errorData.message || 'Something went wrong';
    throw new Error(msg);
  }
  const json = await response.json();
  return (json && typeof json === 'object' && 'data' in json) ? json.data : json;
}

function getAuthHeader(): Record<string, string> {
  if (typeof window === 'undefined') return {};
  const token = localStorage.getItem('vendly_token');
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
