import { api } from './index';

export type BrowseSort =
  | 'featured'
  | 'newest'
  | 'oldest'
  | 'price_asc'
  | 'price_desc'
  | 'popular'
  | 'discount_desc';

export type ServiceAreaFilter = 'SAME_CITY' | 'NEARBY_STATES' | 'NATIONWIDE';
export type DeliveryTimeFilter =
  | 'SAME_DAY'
  | 'NEXT_DAY'
  | 'TWO_TO_THREE_DAYS'
  | 'FOUR_TO_SEVEN_DAYS'
  | 'MORE_THAN_ONE_WEEK';

export interface BrowseProductsParams {
  search?: string;
  category?: string;
  subcategory?: string;
  brand?: string;
  min_price?: number;
  max_price?: number;
  condition?: string;
  has_video?: boolean;
  in_stock?: boolean;
  is_featured?: boolean;
  min_discount?: number;
  region?: string;
  city_id?: string;
  service_area?: ServiceAreaFilter;
  avg_delivery_time?: DeliveryTimeFilter;
  sort?: BrowseSort;
  page?: number;
  limit?: number;
}

export interface BrowseProduct {
  id: string;
  title: string;
  description?: string | null;
  price: string | number;
  original_price?: string | number | null;
  currency: string;
  condition: string;
  quantity_available: number;
  status: string;
  is_featured: boolean;
  views_count?: number;
  category: string;
  brand?: string | null;
  attributes?: Record<string, any> | null;
  image_urls: string[];
  video_url?: string | null;
  tags: string[];
  created_at: string;
  seller: {
    store_name: string;
    logo_url?: string | null;
    store_link: string;
  };
}

export interface BrowseProductsResponse {
  data: BrowseProduct[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}

export interface TopSellingCategory {
  rank: number;
  id: string | null;
  name: string;
  description?: string | null;
  image_url?: string | null;
  units_sold: number;
  order_count: number;
  product_count: number;
  views_total: number;
  subcategories: Array<{ name: string; count: number }>;
  products: BrowseProduct[];
}

export interface PersonalizedRecommendationsResponse {
  personalized: boolean;
  focus_label: string | null;
  focus_type: 'subcategory' | 'category' | 'brand' | null;
  headline: string;
  items: BrowseProduct[];
}

export interface CreateProductInput {
  title: string;
  description?: string;
  price: string;
  original_price?: string;
  currency?: string;
  condition: string;
  quantity_available?: string;
  status?: string;
  category: string;
  brand?: string;
  tags?: string[];
  attributes?: Record<string, any>;
  is_featured?: boolean;
}

export const productApi = {
  async createProduct(
    token: string,
    data: CreateProductInput,
    images: File[],
    video?: File | null,
  ) {
    const formData = new FormData();
    formData.append('title', data.title);
    if (data.description) formData.append('description', data.description);
    formData.append('price', data.price);
    if (data.original_price) formData.append('original_price', data.original_price);
    if (data.currency) formData.append('currency', data.currency);
    formData.append('condition', data.condition);
    if (data.quantity_available) formData.append('quantity_available', data.quantity_available);
    if (data.status) formData.append('status', data.status);
    formData.append('category', data.category);
    if (data.brand) formData.append('brand', data.brand);

    if (data.tags) {
      data.tags.forEach((tag) => formData.append('tags[]', tag));
    }

    if (data.attributes) {
      formData.append('attributes', JSON.stringify(data.attributes));
    }
    if (data.is_featured !== undefined) {
      formData.append('is_featured', String(data.is_featured));
    }

    images.forEach((image) => {
      formData.append('images', image);
    });

    if (video) {
      formData.append('video', video);
    }

    const res = await api.post<{ message: string; product: any }>('/products', formData, { token });
    return res.data;
  },

  async getProducts(limit = 100) {
    const res = await api.get<any[]>(`/products?page=1&limit=${limit}`);
    return res.data;
  },

  async searchProducts(query: string) {
    const res = await api.get<any[]>(`/products/search?q=${encodeURIComponent(query)}`);
    return res.data;
  },

  /**
   * Full-featured products browser query. Preserves the `{ data, meta }`
   * envelope returned by the API (unlike getProducts which collapses to an array).
   */
  async browseProducts(params: BrowseProductsParams): Promise<BrowseProductsResponse> {
    const qs = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) {
      if (v === undefined || v === null || v === '') continue;
      qs.set(k, typeof v === 'boolean' ? String(v) : String(v));
    }
    const res = await api.get<any>(`/products?${qs.toString()}`, { raw: true });
    const rawJson = res.data;
    const payload =
      rawJson &&
      typeof rawJson === 'object' &&
      !Array.isArray(rawJson.data) &&
      rawJson.data &&
      typeof rawJson.data === 'object'
        ? rawJson.data
        : rawJson;
    const items = Array.isArray(payload?.data)
      ? payload.data
      : Array.isArray(payload)
        ? payload
        : [];
    const metaSource = payload?.meta ?? rawJson?.meta;
    return {
      data: items as BrowseProduct[],
      meta: {
        total: Number(metaSource?.total ?? items.length),
        page: Number(metaSource?.page ?? params.page ?? 1),
        limit: Number(metaSource?.limit ?? params.limit ?? 24),
        totalPages: Number(
          metaSource?.totalPages ?? Math.max(1, Math.ceil(items.length / (params.limit ?? 24))),
        ),
      },
    };
  },

  async getProductById(id: string) {
    const res = await api.get<any>(`/products/${id}`);
    return res.data;
  },

  async getCategories() {
    const res =
      await api.get<{ id: string; name: string; image_url?: string | null; fields: any[] }[]>(
        '/products/categories',
      );
    return res.data;
  },

  async getTopSellingCategories(
    limit = 10,
    productsPerCategory = 10,
  ): Promise<TopSellingCategory[]> {
    const res = await api.get<TopSellingCategory[]>(
      `/products/top-selling-categories?limit=${limit}&products_per_category=${productsPerCategory}`,
    );
    return Array.isArray(res.data) ? res.data : [];
  },

  async getRecommendations(params: {
    categories?: string[];
    subcategories?: string[];
    brands?: string[];
    tags?: string[];
    exclude?: string[];
    minPrice?: number;
    maxPrice?: number;
    limit?: number;
  }): Promise<PersonalizedRecommendationsResponse> {
    const qs = new URLSearchParams();
    if (params.categories?.length) qs.set('categories', params.categories.join(','));
    if (params.subcategories?.length) qs.set('subcategories', params.subcategories.join(','));
    if (params.brands?.length) qs.set('brands', params.brands.join(','));
    if (params.tags?.length) qs.set('tags', params.tags.join(','));
    if (params.exclude?.length) qs.set('exclude', params.exclude.join(','));
    if (params.minPrice !== undefined) qs.set('min_price', String(params.minPrice));
    if (params.maxPrice !== undefined) qs.set('max_price', String(params.maxPrice));
    if (params.limit !== undefined) qs.set('limit', String(params.limit));
    const res = await api.get<PersonalizedRecommendationsResponse>(
      `/products/recommendations?${qs.toString()}`,
    );
    return res.data;
  },

  async getBrands(categoryName?: string, categoryId?: string) {
    const params = new URLSearchParams();
    if (categoryName) params.append('category', categoryName);
    if (categoryId) params.append('category_id', categoryId);

    const res = await api.get<
      { id: string; name: string; image_url?: string | null; category_id: string }[]
    >(`/brands?${params.toString()}`);
    return res.data;
  },

  async getProductsByStoreSlug(slug: string) {
    const res = await api.get<any[]>(`/products/store/${slug}`);
    return res.data;
  },

  async getSellerProducts(token: string) {
    const res = await api.get<any[]>('/products/seller/me', { token });
    return res.data;
  },

  async updateProduct(
    token: string,
    id: string,
    data: Partial<CreateProductInput>,
    images?: File[],
    video?: File | null,
    existing_images?: string[],
  ) {
    const formData = new FormData();
    if (data.title) formData.append('title', data.title);
    if (data.description) formData.append('description', data.description);
    if (data.price) formData.append('price', data.price);
    if (data.original_price !== undefined)
      formData.append('original_price', data.original_price || '');
    if (data.currency) formData.append('currency', data.currency);
    if (data.condition) formData.append('condition', data.condition);
    if (data.quantity_available) formData.append('quantity_available', data.quantity_available);
    if (data.status) formData.append('status', data.status);
    if (data.category) formData.append('category', data.category);
    if (data.brand !== undefined) formData.append('brand', data.brand || '');

    if (data.tags) {
      data.tags.forEach((tag) => formData.append('tags[]', tag));
    }

    if (data.attributes) {
      formData.append('attributes', JSON.stringify(data.attributes));
    }
    if (data.is_featured !== undefined) {
      formData.append('is_featured', String(data.is_featured));
    }

    if (existing_images) {
      existing_images.forEach((url) => formData.append('existing_images[]', url));
    }

    if (images) {
      images.forEach((image) => {
        formData.append('images', image);
      });
    }

    if (video) {
      formData.append('video', video);
    }

    const res = await api.put<{ message: string; product: any }>(`/products/${id}`, formData, {
      token,
    });
    return res.data;
  },

  async toggleHotSales(token: string, id: string, is_featured: boolean) {
    const res = await api.patch<{ message: string; product: { id: string; is_featured: boolean } }>(
      `/products/${id}/hot-sales`,
      { is_featured },
      { token },
    );
    return res.data;
  },

  async initializeHotSalesPayment(token: string, id: string) {
    const res = await api.post<{
      message: string;
      reference: string;
      amount: number;
      checkout_url: string | null;
      access_code: string | null;
    }>(`/products/${id}/hot-sales/initialize-payment`, undefined, { token });
    return res.data;
  },

  async verifyHotSalesPayment(token: string, reference: string, productId: string) {
    const res = await api.get<{
      verified: boolean;
      status: string;
      is_featured: boolean;
    }>(
      `/products/hot-sales/verify?reference=${encodeURIComponent(reference)}&product_id=${encodeURIComponent(productId)}`,
      { token },
    );
    return res.data;
  },

  async deleteProduct(token: string, id: string) {
    const res = await api.delete<{ message: string }>(`/products/${id}`, { token });
    return res.data;
  },

  async duplicateProduct(token: string, id: string) {
    const res = await api.post<{
      message: string;
      product: { id: string; title: string };
    }>(`/products/${id}/duplicate`, undefined, { token });
    return res.data;
  },

  /**
   * Lightweight status-only patch — uses the existing PUT endpoint but only
   * sends the `status` field so we don't have to round-trip the whole form.
   */
  async updateStatus(token: string, id: string, status: string) {
    const fd = new FormData();
    fd.append('status', status);
    const res = await api.put<{ message: string; product: any }>(`/products/${id}`, fd, { token });
    return res.data;
  },

  /** Same trick for stock — single-field PUT to skip the full form. */
  async updateStock(token: string, id: string, quantity_available: number) {
    const fd = new FormData();
    fd.append('quantity_available', String(quantity_available));
    const res = await api.put<{ message: string; product: any }>(`/products/${id}`, fd, { token });
    return res.data;
  },
};
