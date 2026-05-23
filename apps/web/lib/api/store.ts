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
    Object.keys(data).forEach((key) => {
      const val = data[key];
      if (val === undefined || val === null) return;
      if (typeof val === 'object' && !(val instanceof File)) {
        formData.append(key, JSON.stringify(val));
      } else {
        formData.append(key, String(val));
      }
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
  },

  async getTopProVendors(limit = 6): Promise<TopProVendor[]> {
    const res = await fetch(`${API_URL}/stores/top-pro?limit=${limit}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });
    return handleResponse<TopProVendor[]>(res);
  },

  async browseStores(params: BrowseStoresParams): Promise<BrowseStoresResponse> {
    const qs = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) {
      if (v === undefined || v === null || v === '') continue;
      qs.set(k, String(v));
    }
    const res = await fetch(`${API_URL}/stores?${qs.toString()}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });
    return handleResponse<BrowseStoresResponse>(res);
  },
};

export interface BrowseStoresParams {
  search?: string;
  location?: string;
  is_pro?: boolean;
  sort?: 'newest' | 'products' | 'alphabetical' | 'default';
  page?: number;
  limit?: number;
}

export interface ShowcaseProduct {
  id: string;
  title: string;
  price: number;
  image_url: string | null;
}

export interface BrowseStore {
  id: string;
  store_name: string;
  store_link: string;
  logo_url: string | null;
  bio: string | null;
  location: string | null;
  area: string | null;
  products_count: number;
  is_pro: boolean;
  is_verified: boolean;
  products: ShowcaseProduct[];
}

export interface BrowseStoresResponse {
  stores: BrowseStore[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface TopProVendor {
  id: string;
  store_name: string;
  store_link: string;
  logo_url: string | null;
  bio: string | null;
  location: string | null;
  products_count: number;
  is_pro: boolean;
}
