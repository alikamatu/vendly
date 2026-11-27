import { api } from './index';

export interface CreateStoreInput {
  store_name: string;
  store_link: string;
  bio?: string;
  whatsapp_number?: string;
  logo_url?: string;
  business_hours?: string;
  delivery_policies?: string;
}

export const storeApi = {
  async createStoreWithFile(token: string, data: CreateStoreInput, logoFile?: File) {
    const formData = new FormData();
    formData.append('store_name', data.store_name);
    formData.append('store_link', data.store_link);
    if (data.bio) formData.append('bio', data.bio);
    if (data.whatsapp_number) formData.append('whatsapp_number', data.whatsapp_number);
    if (data.business_hours) formData.append('business_hours', data.business_hours);
    if (data.delivery_policies) formData.append('delivery_policies', data.delivery_policies);
    if (logoFile) formData.append('logo', logoFile);

    const res = await api.post<{ message: string; store: any }>('/stores', formData, { token });
    return res.data;
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

    const res = await api.patch<{ message: string; store: any }>('/stores', formData, { token });
    return res.data;
  },

  async resolvePayoutAccount(token: string, bankCode: string, accountNumber: string) {
    const qs = new URLSearchParams({
      bank_code: bankCode,
      account_number: accountNumber,
    });
    const res = await api.get<{
      verified: boolean;
      account_name: string | null;
      account_number: string;
      bank_code: string;
      warning?: string;
    }>(`/payments/resolve-account?${qs.toString()}`, { token });
    return res.data;
  },

  async requestPayoutChangeVerification(
    token: string,
    payload: { bank_name?: string; bank_code: string; account_number: string },
  ) {
    const res = await api.post<{
      sent: boolean;
      masked_email: string;
      expires_in_seconds: number;
      totp_available: boolean;
      resolved_account_name: string | null;
      message: string;
    }>('/stores/payout-details/request-verification', payload, { token });
    return res.data;
  },

  async confirmPayoutChange(
    token: string,
    payload: {
      code: string;
      method?: 'EMAIL_OTP' | 'TOTP';
      bank_name?: string;
      bank_code?: string;
      account_number?: string;
    },
  ) {
    const res = await api.post<{
      message: string;
      bank_name: string;
      bank_code: string;
      account_number: string;
      paystack_subaccount_code: string | null;
      subaccount_status: string;
      subaccount_warning?: string | null;
    }>('/stores/payout-details/confirm', payload, { token });
    return res.data;
  },

  async getStoreStats(token: string) {
    const res = await api.get<{ stats: any[]; recentOrders: any[]; financials?: any }>(
      '/stores/stats',
      { token },
    );
    return res.data;
  },

  async getStoreBySlug(slug: string) {
    const res = await api.get<any>(`/stores/link/${slug}`);
    return res.data;
  },

  async getTopProVendors(limit = 6): Promise<TopProVendor[]> {
    const res = await api.get<TopProVendor[]>(`/stores/top-pro?limit=${limit}`);
    return res.data;
  },

  async browseStores(params: BrowseStoresParams): Promise<BrowseStoresResponse> {
    const qs = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) {
      if (v === undefined || v === null || v === '') continue;
      qs.set(k, String(v));
    }
    const res = await api.get<BrowseStoresResponse>(`/stores?${qs.toString()}`);
    return res.data;
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
