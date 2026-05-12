const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:1000';

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
  currency?: string;
  condition: string;
  quantity_available?: string;
  status?: string;
  category: string;
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
    if (data.currency) formData.append('currency', data.currency);
    formData.append('condition', data.condition);
    if (data.quantity_available) formData.append('quantity_available', data.quantity_available);
    if (data.status) formData.append('status', data.status);
    formData.append('category', data.category);
    
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

  async getProductById(id: string) {
    const res = await fetch(`${API_URL}/products/${id}`);
    return handleResponse<any>(res);
  },

  async getCategories() {
    const res = await fetch(`${API_URL}/products/categories`);
    return handleResponse<{ id: string; name: string; fields: any[] }[]>(res);
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
    if (data.currency) formData.append('currency', data.currency);
    if (data.condition) formData.append('condition', data.condition);
    if (data.quantity_available) formData.append('quantity_available', data.quantity_available);
    if (data.status) formData.append('status', data.status);
    if (data.category) formData.append('category', data.category);
    
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
  }
};
