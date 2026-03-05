const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:1000';

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const msg = Array.isArray(errorData.message) ? errorData.message[0] : errorData.message || 'Something went wrong';
    throw new Error(msg);
  }
  return response.json();
}

export interface CreateStoreInput {
  store_name: string;
  store_link: string;
  bio?: string;
  whatsapp_number?: string;
  logo_url?: string;
}

export const storeApi = {
  async createStoreWithFile(token: string, data: CreateStoreInput, logoFile?: File) {
    const formData = new FormData();
    formData.append('store_name', data.store_name);
    formData.append('store_link', data.store_link);
    if (data.bio) formData.append('bio', data.bio);
    if (data.whatsapp_number) formData.append('whatsapp_number', data.whatsapp_number);
    if (logoFile) formData.append('logo', logoFile);

    const res = await fetch(`${API_URL}/stores`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    });
    return handleResponse<{ message: string; store: any }>(res);
  },

  async updateStore(token: string, data: any, logoFile?: File) {
    const formData = new FormData();
    Object.keys(data).forEach(key => {
      if (data[key] !== undefined) formData.append(key, data[key]);
    });
    if (logoFile) formData.append('logo', logoFile);

    const res = await fetch(`${API_URL}/stores`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    });
    return handleResponse<{ message: string; store: any }>(res);
  },

  async getStoreStats(token: string) {
    const res = await fetch(`${API_URL}/stores/stats`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });
    return handleResponse<{ stats: any[]; recentOrders: any[] }>(res);
  },

  async getStoreBySlug(slug: string) {
    const res = await fetch(`${API_URL}/stores/link/${slug}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    return handleResponse<any>(res);
  }
};
