const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:1000';

export type BrowseSort =
  | 'newest'
  | 'oldest'
  | 'price_asc'
  | 'price_desc'
  | 'popular'
  | 'discount_desc';

export type ServiceAreaFilter = "SAME_CITY" | "NEARBY_STATES" | "NATIONWIDE";
export type DeliveryTimeFilter =
  | "SAME_DAY"
  | "NEXT_DAY"
  | "TWO_TO_THREE_DAYS"
  | "FOUR_TO_SEVEN_DAYS"
  | "MORE_THAN_ONE_WEEK";

export interface BrowseProductsParams {
  search?: string;
  category?: string;
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

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const msg = Array.isArray(errorData.message) ? errorData.message[0] : errorData.message || 'Something went wrong';
    throw new Error(msg);
  }
  const json = await response.json();
  // If the response is wrapped by the ApiResponseInterceptor, return the data part
  return (json && typeof json === 'object' && 'data' in json) ? json.data : json;
}

function authHeaders(token: string) {
  return {
    Authorization: `Bearer ${token}`,
  };
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
  async createProduct(token: string, data: CreateProductInput, images: File[], video?: File | null) {
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
      data.tags.forEach(tag => formData.append('tags[]', tag));
    }

    if (data.attributes) {
      formData.append('attributes', JSON.stringify(data.attributes));
    }
    if (data.is_featured !== undefined) {
      formData.append('is_featured', String(data.is_featured));
    }

    images.forEach(image => {
      formData.append('images', image);
    });

    if (video) {
      formData.append('video', video);
    }

    const res = await fetch(`${API_URL}/products`, {
      method: 'POST',
      headers: authHeaders(token),
      body: formData,
    });

    return handleResponse<{ message: string; product: any }>(res);
  },

  async getProducts() {
    const res = await fetch(`${API_URL}/products`);
    return handleResponse<any[]>(res);
  },

  async searchProducts(query: string) {
    const res = await fetch(`${API_URL}/products/search?q=${encodeURIComponent(query)}`);
    return handleResponse<any[]>(res);
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
    const res = await fetch(`${API_URL}/products?${qs.toString()}`);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      const msg = Array.isArray(data?.message) ? data.message[0] : data?.message || 'Failed to load';
      throw new Error(msg);
    }
    const json = await res.json();
    // Envelope is { data: [...], meta: { total, page, limit, totalPages } }
    return {
      data: (json?.data ?? []) as BrowseProduct[],
      meta: {
        total: Number(json?.meta?.total ?? 0),
        page: Number(json?.meta?.page ?? 1),
        limit: Number(json?.meta?.limit ?? 20),
        totalPages: Number(json?.meta?.totalPages ?? 1),
      },
    };
  },

  async getProductById(id: string) {
    const res = await fetch(`${API_URL}/products/${id}`);
    return handleResponse<any>(res);
  },

  async getCategories() {
    const res = await fetch(`${API_URL}/products/categories`);
    return handleResponse<{ id: string; name: string; image_url?: string | null; fields: any[] }[]>(res);
  },
  
  async getBrands(categoryName?: string, categoryId?: string) {
    const params = new URLSearchParams();
    if (categoryName) params.append('category', categoryName);
    if (categoryId) params.append('category_id', categoryId);
    
    const res = await fetch(`${API_URL}/brands?${params.toString()}`);
    return handleResponse<{ id: string; name: string; image_url?: string | null; category_id: string }[]>(res);
  },

  async getProductsByStoreSlug(slug: string) {
    const res = await fetch(`${API_URL}/products/store/${slug}`);
    return handleResponse<any[]>(res);
  },

  async getSellerProducts(token: string) {
    const res = await fetch(`${API_URL}/products/seller/me`, {
      headers: authHeaders(token),
    });
    return handleResponse<any[]>(res);
  },

  async updateProduct(
    token: string, 
    id: string, 
    data: Partial<CreateProductInput>, 
    images?: File[], 
    video?: File | null,
    existing_images?: string[]
  ) {
    const formData = new FormData();
    if (data.title) formData.append('title', data.title);
    if (data.description) formData.append('description', data.description);
    if (data.price) formData.append('price', data.price);
    if (data.original_price !== undefined) formData.append('original_price', data.original_price || '');
    if (data.currency) formData.append('currency', data.currency);
    if (data.condition) formData.append('condition', data.condition);
    if (data.quantity_available) formData.append('quantity_available', data.quantity_available);
    if (data.status) formData.append('status', data.status);
    if (data.category) formData.append('category', data.category);
    if (data.brand !== undefined) formData.append('brand', data.brand || '');
    
    if (data.tags) {
      data.tags.forEach(tag => formData.append('tags[]', tag));
    }

    if (data.attributes) {
      formData.append('attributes', JSON.stringify(data.attributes));
    }
    if (data.is_featured !== undefined) {
      formData.append('is_featured', String(data.is_featured));
    }

    if (existing_images) {
      existing_images.forEach(url => formData.append('existing_images[]', url));
    }

    if (images) {
      images.forEach(image => {
        formData.append('images', image);
      });
    }

    if (video) {
        formData.append('video', video);
    }

    const res = await fetch(`${API_URL}/products/${id}`, {
      method: 'PUT',
      headers: authHeaders(token),
      body: formData,
    });

    return handleResponse<{ message: string; product: any }>(res);
  },

  async toggleHotSales(token: string, id: string, is_featured: boolean) {
    const res = await fetch(`${API_URL}/products/${id}/hot-sales`, {
      method: 'PATCH',
      headers: {
        ...authHeaders(token),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ is_featured }),
    });

    return handleResponse<{ message: string; product: { id: string; is_featured: boolean } }>(res);
  },

  async initializeHotSalesPayment(token: string, id: string) {
    const res = await fetch(`${API_URL}/products/${id}/hot-sales/initialize-payment`, {
      method: 'POST',
      headers: authHeaders(token),
    });

    return handleResponse<{
      message: string;
      reference: string;
      amount: number;
      checkout_url: string | null;
      access_code: string | null;
    }>(res);
  },

  async verifyHotSalesPayment(
    token: string,
    reference: string,
    productId: string,
  ) {
    const res = await fetch(
      `${API_URL}/products/hot-sales/verify?reference=${encodeURIComponent(reference)}&product_id=${encodeURIComponent(productId)}`,
      {
        headers: authHeaders(token),
      },
    );

    return handleResponse<{
      verified: boolean;
      status: string;
      is_featured: boolean;
    }>(res);
  },

  async initializePromotionPayment(
    token: string,
    id: string,
    category: "BOOST" | "PLAN",
  ) {
    const res = await fetch(`${API_URL}/products/${id}/promotions/initialize-payment`, {
      method: "POST",
      headers: {
        ...authHeaders(token),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ category }),
    });

    return handleResponse<{
      message: string;
      reference: string;
      amount: number;
      category: "BOOST" | "PLAN";
      checkout_url: string | null;
      access_code: string | null;
    }>(res);
  },

  async verifyPromotionPayment(token: string, reference: string, productId: string) {
    const res = await fetch(
      `${API_URL}/products/promotions/verify?reference=${encodeURIComponent(reference)}&product_id=${encodeURIComponent(productId)}`,
      {
        headers: authHeaders(token),
      },
    );

    return handleResponse<{
      verified: boolean;
      status: string;
      category: "BOOST" | "PLAN";
      is_featured: boolean;
    }>(res);
  },

  async getPromotionPaymentsHistory(token: string) {
    const res = await fetch(`${API_URL}/products/promotions/history`, {
      headers: authHeaders(token),
    });
    return handleResponse<any[]>(res);
  },

  async deleteProduct(token: string, id: string) {
    const res = await fetch(`${API_URL}/products/${id}`, {
      method: 'DELETE',
      headers: authHeaders(token),
    });

    return handleResponse<{ message: string }>(res);
  },

  async duplicateProduct(token: string, id: string) {
    const res = await fetch(`${API_URL}/products/${id}/duplicate`, {
      method: 'POST',
      headers: authHeaders(token),
    });
    return handleResponse<{
      message: string;
      product: { id: string; title: string };
    }>(res);
  },

  /**
   * Lightweight status-only patch — uses the existing PUT endpoint but only
   * sends the `status` field so we don't have to round-trip the whole form.
   */
  async updateStatus(token: string, id: string, status: string) {
    const fd = new FormData();
    fd.append('status', status);
    const res = await fetch(`${API_URL}/products/${id}`, {
      method: 'PUT',
      headers: authHeaders(token),
      body: fd,
    });
    return handleResponse<{ message: string; product: any }>(res);
  },

  /** Same trick for stock — single-field PUT to skip the full form. */
  async updateStock(token: string, id: string, quantity_available: number) {
    const fd = new FormData();
    fd.append('quantity_available', String(quantity_available));
    const res = await fetch(`${API_URL}/products/${id}`, {
      method: 'PUT',
      headers: authHeaders(token),
      body: fd,
    });
    return handleResponse<{ message: string; product: any }>(res);
  },
};
