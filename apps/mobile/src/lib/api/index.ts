import { api } from './client';
import type {
  Address,
  Brand,
  BrowseProductsParams,
  BrowseStoresParams,
  BrowseStoresResponse,
  Category,
  CreateOrderResult,
  Favorite,
  LoginResponse,
  NotificationItem,
  NotificationPage,
  Order,
  Paginated,
  Product,
  ProductDetail,
  Review,
  ReviewList,
  ReviewSummary,
  StoreDetail,
  TopProVendor,
  User,
} from './types';

export * from './types';
export { ApiError, configureApiClient } from './client';

export const authApi = {
  login: (
    email: string,
    password: string,
    opts: { totp_code?: string; totp_backup_code?: string } = {},
  ) => api.post<LoginResponse>('/auth/login', { email, password, ...opts }, { anonymous: true }),

  resendSmsCode: (email: string, password: string) =>
    api.post<{ sent: boolean; phone_hint: string }>(
      '/auth/2fa/sms/resend',
      { email, password },
      { anonymous: true },
    ),

  register: (data: {
    full_name: string;
    email: string;
    password: string;
    phone: string;
    accept_terms: true;
    marketing_opt_in?: boolean;
  }) =>
    api.post<{ message: string }>(
      '/auth/register',
      { ...data, account_type: 'BUYER' },
      { anonymous: true },
    ),

  forgotPassword: (email: string) =>
    api.post<{ message: string }>('/auth/forgot-password', { email }, { anonymous: true }),

  resendVerification: (email: string) =>
    api.post<{ message: string }>('/auth/resend-verification', { email }, { anonymous: true }),

  me: (token?: string) => api.get<User>('/auth/me', token ? { token } : undefined),

  logout: () => api.post<{ message: string }>('/auth/logout'),

  updateProfile: (data: { full_name?: string; phone?: string; school?: string }) =>
    api.patch<{ message: string; user: User }>('/auth/profile', data),
};

export const productApi = {
  getAll: () => api.get<Product[]>('/products', { anonymous: true }),

  browse: async (params: BrowseProductsParams): Promise<Paginated<Product>> => {
    const query: Record<string, unknown> = {
      ...params,
      in_stock: params.in_stock ?? params.inStock,
      min_price: params.min_price ?? params.minPrice,
      max_price: params.max_price ?? params.maxPrice,
      min_discount: params.min_discount ?? (params.hasDiscount ? 1 : undefined),
    };
    const res = await api.get<{
      data?: Product[];
      meta?: { total?: number; page?: number; limit?: number; totalPages?: number };
    }>('/products', { query: query as any, raw: true, anonymous: true });

    const data = Array.isArray(res?.data) ? res.data : Array.isArray(res) ? (res as Product[]) : [];
    return {
      data,
      meta: {
        total: Number(res?.meta?.total ?? data.length),
        page: Number(res?.meta?.page ?? params.page ?? 1),
        limit: Number(res?.meta?.limit ?? params.limit ?? 20),
        totalPages: Number(res?.meta?.totalPages ?? 1),
      },
    };
  },

  list: async (params: BrowseProductsParams): Promise<Paginated<Product>> =>
    productApi.browse(params),

  byId: (id: string) => api.get<ProductDetail>(`/products/${id}`, { anonymous: true }),

  byStoreSlug: (slug: string) =>
    api.get<Product[]>(`/products/store/${encodeURIComponent(slug)}`, { anonymous: true }),

  categories: async (): Promise<Category[]> => {
    const raw = await api.get<any[]>('/products/categories', { anonymous: true });
    return (Array.isArray(raw) ? raw : []).map((c) => ({
      ...c,
      id: c.id ?? c.name ?? c.category,
      name: c.name ?? c.category ?? '',
      category: c.category ?? c.name ?? '',
      count: Number(c.count ?? c.products_count ?? 1),
    }));
  },

  brands: async (categoryOrLimit?: string | number): Promise<Brand[]> => {
    const categoryName = typeof categoryOrLimit === 'string' ? categoryOrLimit : undefined;
    const raw = await api.get<any[]>('/brands', {
      query: categoryName ? { category: categoryName } : undefined,
      anonymous: true,
    });
    const mapped = (Array.isArray(raw) ? raw : []).map((b) => ({
      ...b,
      id: b.id ?? b.name ?? b.brand,
      name: b.name ?? b.brand ?? '',
      brand: b.brand ?? b.name ?? '',
      count: Number(b.count ?? b.products_count ?? 1),
    }));
    return typeof categoryOrLimit === 'number' ? mapped.slice(0, categoryOrLimit) : mapped;
  },
};

export const storeApi = {
  bySlug: (slug: string) =>
    api.get<StoreDetail>(`/stores/link/${encodeURIComponent(slug)}`, { anonymous: true }),

  getByLink: async (slug: string): Promise<StoreDetail> => {
    const [store, products] = await Promise.all([
      storeApi.bySlug(slug),
      productApi.byStoreSlug(slug).catch(() => []),
    ]);
    return { ...store, products };
  },

  topPro: (limit = 6) =>
    api.get<TopProVendor[]>('/stores/top-pro', { query: { limit }, anonymous: true }),

  browse: (params: BrowseStoresParams) =>
    api.get<BrowseStoresResponse>('/stores', { query: { ...params }, anonymous: true }),
};

export const reviewApi = {
  listForProduct: async (
    productId: string,
    paramsOrPage: { limit?: number; sort?: string } | number = {},
    maybeLimit?: number,
  ): Promise<ReviewList> => {
    const params = typeof paramsOrPage === 'number' ? { limit: maybeLimit ?? 5 } : paramsOrPage;
    const res = await api.get<any>(`/reviews/product/${productId}`, {
      query: params,
      anonymous: true,
    });
    const items: Review[] = (res?.items ?? res?.reviews ?? []).map((r: any) => ({
      ...r,
      comment: r.comment ?? r.body ?? null,
      reviewer_name: r.reviewer_name ?? r.buyer?.full_name ?? 'Verified Buyer',
      is_verified_purchase: r.is_verified_purchase ?? r.verified_purchase ?? false,
    }));
    return {
      items,
      reviews: items,
      total: Number(res?.total ?? items.length),
      nextCursor: res?.nextCursor ?? null,
    };
  },

  summaryForProduct: async (productId: string): Promise<ReviewSummary> => {
    const res = await api.get<any>(`/reviews/product/${productId}/summary`, { anonymous: true });
    const count = Number(res?.count ?? res?.totalReviews ?? 0);
    const average = Number(res?.average ?? res?.averageRating ?? 0);
    return {
      count,
      average,
      totalReviews: count,
      averageRating: average,
      distribution: res?.distribution ?? { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
    };
  },

  listForStore: async (
    storeLink: string,
    params: { limit?: number; sort?: string } = {},
  ): Promise<ReviewList> => {
    const res = await api.get<any>(`/reviews/store/${encodeURIComponent(storeLink)}`, {
      query: params,
      anonymous: true,
    });
    const items: Review[] = (res?.items ?? res?.reviews ?? []).map((r: any) => ({
      ...r,
      comment: r.comment ?? r.body ?? null,
      reviewer_name: r.reviewer_name ?? r.buyer?.full_name ?? 'Verified Buyer',
      is_verified_purchase: r.is_verified_purchase ?? r.verified_purchase ?? false,
    }));
    return {
      items,
      reviews: items,
      total: Number(res?.total ?? items.length),
      nextCursor: res?.nextCursor ?? null,
    };
  },

  summaryForStore: async (storeLink: string): Promise<ReviewSummary> => {
    const res = await api.get<any>(`/reviews/store/${encodeURIComponent(storeLink)}/summary`, {
      anonymous: true,
    });
    const count = Number(res?.count ?? res?.totalReviews ?? 0);
    const average = Number(res?.average ?? res?.averageRating ?? 0);
    return {
      count,
      average,
      totalReviews: count,
      averageRating: average,
      distribution: res?.distribution ?? { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
    };
  },

  create: (body: { order_item_id: string; rating: number; title?: string; body?: string }) =>
    api.post<Review>('/reviews', body),
};

export const notificationApi = {
  list: async (
    opts: {
      unreadOnly?: boolean;
      cursor?: string;
      take?: number;
      page?: number;
      limit?: number;
    } = {},
  ): Promise<NotificationPage> => {
    const res = await api.get<any>('/notifications', {
      query: {
        unreadOnly: opts.unreadOnly,
        cursor: opts.cursor,
        take: opts.take ?? opts.limit,
      },
    });
    const rawItems: any[] = res?.items ?? res?.data ?? [];
    const items: NotificationItem[] = rawItems.map((n) => ({
      ...n,
      body: n.body ?? n.message ?? '',
      message: n.message ?? n.body ?? '',
    }));
    return {
      items,
      data: items,
      nextCursor: res?.nextCursor ?? null,
    };
  },

  unreadCount: async (): Promise<number & { count: number }> => {
    const res = await api.get<{ count: number }>('/notifications/unread-count');
    const n = Number(res?.count ?? 0);
    return Object.assign(n, { count: n }) as number & { count: number };
  },

  markRead: (id: string) => api.patch<NotificationItem>(`/notifications/${id}/read`),

  markAllRead: () => api.patch<{ updated: number }>('/notifications/read-all'),

  remove: (id: string) => api.delete<{ deleted: boolean }>(`/notifications/${id}`),
};

export const orderApi = {
  create: (
    storeLink: string,
    items: { productId: string; variantId?: string | null; quantity: number }[],
    details: {
      customerName: string;
      customerPhone: string;
      deliveryMethod: 'PICKUP' | 'DELIVERY';
      deliveryLocation: string;
      deliveryNotes?: string;
      paymentMethod: 'PAYSTACK' | 'CASH_ON_DELIVERY';
    },
  ) => api.post<CreateOrderResult>('/orders', { storeLink, items, ...details }),

  mine: () => api.get<Order[]>('/orders/buyer'),

  byId: (id: string) => api.get<Order>(`/orders/buyer/${id}`),

  verifyPayment: (reference: string, orderId: string) =>
    api.get<{ verified: boolean; payment_status: string; order_status: string }>(
      '/orders/verify/payment',
      { query: { reference, order_id: orderId } },
    ),

  retryPayment: (orderId: string) =>
    api.post<{ authorization_url: string; reference: string; access_code?: string }>(
      `/orders/${orderId}/retry-payment`,
    ),

  cancel: (orderId: string, reason?: string) =>
    api.post<{ message: string; status: string }>(`/orders/${orderId}/cancel`, {
      reason: reason ?? '',
    }),
};

export const favoriteApi = {
  list: () => api.get<Favorite[]>('/favorites'),
  ids: () => api.get<string[]>('/favorites/ids'),
  toggle: (productId: string) => api.post<unknown>(`/favorites/${productId}`),
};

export const addressApi = {
  list: () => api.get<Address[]>('/address'),
  create: (data: Omit<Address, 'id'>) => api.post<Address>('/address', data),
  update: (id: string, data: Partial<Omit<Address, 'id'>>) =>
    api.patch<Address>(`/address/${id}`, data),
  remove: (id: string) => api.delete<{ success: boolean }>(`/address/${id}`),
};
