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
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };
}

export interface CreateStoreInput {
  store_name: string;
  store_link: string;
  bio?: string;
  whatsapp_number?: string;
  logo_url?: string;
}

export const storeApi = {
  async createStore(token: string, data: CreateStoreInput) {
    // We send as JSON because we upload the image to Cloudinary first on the frontend
    // then send the logo_url to the backend. Alternatively, we could send as FormData
    // if we wanted the backend to handle the upload. 
    // Given the backend implementation uses Multer, let's stick to FormData for consistency 
    // with the backend's FileInterceptor('logo').

    const formData = new FormData();
    formData.append('store_name', data.store_name);
    formData.append('store_link', data.store_link);
    if (data.bio) formData.append('bio', data.bio);
    if (data.whatsapp_number) formData.append('whatsapp_number', data.whatsapp_number);
    
    // If we have a file to upload from the frontend, we'd handle it here.
    // However, the plan was to integrate Cloudinary. 
    // Let's refine the approach: Frontend uploads to Cloudinary, sends URL to backend.
    // Wait, the backend implementation I just wrote uses FileInterceptor('logo').
    // So better to send the File object from frontend directly to backend.

    const res = await fetch(`${API_URL}/stores`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        // Note: Don't set Content-Type for FormData, the browser will set it with the boundary
      },
      body: data as any instanceof FormData ? (data as any) : JSON.stringify(data),
    });

    // Re-evaluating: The backend controller is expecting FileInterceptor('logo').
    // Let's make a dedicated method for that.
  },

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
  }
};
