import { VENDLY_API_BASE_URL, getVendlyHeaders, qs, unwrap } from './config';
import type {
  VendlyProduct,
  ProductStatus,
  ProductListParams,
  AdminProductSummary,
  AdminProductWriteInput,
} from '@/types/operations';

export interface ProductListResponse {
  data: VendlyProduct[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  summary?: AdminProductSummary;
  categories?: string[];
}

export class VendlyProductService {
  private static headers() {
    return getVendlyHeaders();
  }

  private static authOnlyHeaders(): HeadersInit {
    const h = getVendlyHeaders() as Record<string, string>;
    const next: Record<string, string> = {};
    if (h.Authorization) next.Authorization = h.Authorization;
    return next;
  }

  static async list(params: ProductListParams = {}): Promise<ProductListResponse> {
    const cleanParams: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== null && v !== '' && v !== 'ALL') {
        cleanParams[k] = v;
      }
    }
    const res = await fetch(`${VENDLY_API_BASE_URL}/admin/products${qs(cleanParams)}`, {
      headers: this.headers(),
      cache: 'no-store',
    });
    return unwrap<ProductListResponse>(res);
  }

  static async getById(id: string): Promise<VendlyProduct> {
    const res = await fetch(`${VENDLY_API_BASE_URL}/admin/products/${id}`, {
      headers: this.headers(),
      cache: 'no-store',
    });
    return unwrap<VendlyProduct>(res);
  }

  static async create(
    payload: AdminProductWriteInput & {
      seller_id: string;
      title: string;
      price: string;
      category: string;
    },
  ): Promise<VendlyProduct> {
    const res = await fetch(`${VENDLY_API_BASE_URL}/admin/products`, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify(payload),
    });
    return unwrap<VendlyProduct>(res);
  }

  static async update(id: string, payload: AdminProductWriteInput): Promise<VendlyProduct> {
    const res = await fetch(`${VENDLY_API_BASE_URL}/admin/products/${id}`, {
      method: 'PUT',
      headers: this.headers(),
      body: JSON.stringify(payload),
    });
    return unwrap<VendlyProduct>(res);
  }

  static async uploadMedia(id: string, files: File[]): Promise<VendlyProduct> {
    const formData = new FormData();
    files.forEach((f) => formData.append('images', f));
    const res = await fetch(`${VENDLY_API_BASE_URL}/admin/products/${id}/media`, {
      method: 'POST',
      headers: this.authOnlyHeaders(),
      body: formData,
    });
    return unwrap<VendlyProduct>(res);
  }

  static async duplicate(id: string, sellerId?: string): Promise<VendlyProduct> {
    const res = await fetch(`${VENDLY_API_BASE_URL}/admin/products/${id}/duplicate`, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify(sellerId ? { seller_id: sellerId } : {}),
    });
    return unwrap<VendlyProduct>(res);
  }

  static async updateStock(
    id: string,
    quantity_available: number,
    reason?: string,
  ): Promise<VendlyProduct> {
    const res = await fetch(`${VENDLY_API_BASE_URL}/admin/products/${id}/stock`, {
      method: 'PATCH',
      headers: this.headers(),
      body: JSON.stringify({ quantity_available, reason }),
    });
    return unwrap<VendlyProduct>(res);
  }

  static async setStatus(
    id: string,
    status: ProductStatus,
    reason?: string,
  ): Promise<VendlyProduct> {
    const res = await fetch(`${VENDLY_API_BASE_URL}/admin/products/${id}/status`, {
      method: 'PATCH',
      headers: this.headers(),
      body: JSON.stringify({ status, reason }),
    });
    return unwrap<VendlyProduct>(res);
  }

  static async toggleFeatured(id: string, nextFeatured?: boolean): Promise<VendlyProduct> {
    const res = await fetch(`${VENDLY_API_BASE_URL}/admin/products/${id}/feature`, {
      method: 'PATCH',
      headers: this.headers(),
      body: JSON.stringify(typeof nextFeatured === 'boolean' ? { is_featured: nextFeatured } : {}),
    });
    return unwrap<VendlyProduct>(res);
  }

  static async remove(id: string, force = false): Promise<{ message: string }> {
    const query = force ? '?force=true' : '';
    const res = await fetch(`${VENDLY_API_BASE_URL}/admin/products/${id}${query}`, {
      method: 'DELETE',
      headers: this.headers(),
    });
    return unwrap<{ message: string }>(res);
  }

  static async bulk(payload: {
    ids: string[];
    action: 'delete' | 'status' | 'feature' | 'category';
    value?: unknown;
    force?: boolean;
    reason?: string;
  }): Promise<{ updated: number }> {
    const res = await fetch(`${VENDLY_API_BASE_URL}/admin/products/bulk`, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify(payload),
    });
    return unwrap<{ updated: number }>(res);
  }
}
