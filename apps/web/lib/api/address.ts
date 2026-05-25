const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:1000';

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const msg = Array.isArray(errorData.message)
      ? errorData.message[0]
      : errorData.message || 'Something went wrong';
    throw new Error(msg);
  }
  const json = await response.json();
  return json && typeof json === 'object' && 'data' in json ? json.data : json;
}

function authHeaders(token: string) {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };
}

export interface Address {
  id: string;
  label: string | null;
  name: string;
  phone: string;
  street: string;
  city: string;
  region: string | null;
  is_default: boolean;
}

export const addressApi = {
  async getAddresses(token: string) {
    const res = await fetch(`${API_URL}/address`, {
      method: 'GET',
      headers: authHeaders(token),
    });
    return handleResponse<Address[]>(res);
  },

  async createAddress(token: string, data: Omit<Address, 'id'>) {
    const res = await fetch(`${API_URL}/address`, {
      method: 'POST',
      headers: authHeaders(token),
      body: JSON.stringify(data),
    });
    return handleResponse<Address>(res);
  },

  async updateAddress(token: string, id: string, data: Partial<Omit<Address, 'id'>>) {
    const res = await fetch(`${API_URL}/address/${id}`, {
      method: 'PATCH',
      headers: authHeaders(token),
      body: JSON.stringify(data),
    });
    return handleResponse<Address>(res);
  },

  async deleteAddress(token: string, id: string) {
    const res = await fetch(`${API_URL}/address/${id}`, {
      method: 'DELETE',
      headers: authHeaders(token),
    });
    return handleResponse<{ success: boolean }>(res);
  },
};
