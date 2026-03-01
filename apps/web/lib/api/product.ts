const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:1000';

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const msg = Array.isArray(errorData.message) ? errorData.message[0] : errorData.message || 'Something went wrong';
    throw new Error(msg);
  }
  return response.json();
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
  category: string;
  tags?: string[];
}

export const productApi = {
  async createProduct(token: string, data: CreateProductInput, images: File[]) {
    const formData = new FormData();
    formData.append('title', data.title);
    if (data.description) formData.append('description', data.description);
    formData.append('price', data.price);
    formData.append('category', data.category);
    
    if (data.tags) {
      data.tags.forEach(tag => formData.append('tags[]', tag));
    }

    images.forEach(image => {
      formData.append('images', image);
    });

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

  async getProductById(id: string) {
    const res = await fetch(`${API_URL}/products/${id}`);
    return handleResponse<any>(res);
  },

  async getCategories() {
    const res = await fetch(`${API_URL}/products/categories`);
    return handleResponse<{ id: string; name: string }[]>(res);
  }
};
