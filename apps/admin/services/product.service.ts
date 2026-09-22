import { VENDLY_API_BASE_URL, getVendlyHeaders, qs, unwrap } from './config';
import type {
  VendlyProduct,
  ProductStatus,
  ProductListParams,
  Category,
  Brand,
} from '@/types/operations';

export interface ProductListResponse {
  data: VendlyProduct[];
  total: number;
  page: number;
  limit: number;
}

export class VendlyProductService {
  private static headers() {
    return getVendlyHeaders();
  }

  static async list(params: ProductListParams = {}): Promise<ProductListResponse> {
    const res = await fetch(
      `${VENDLY_API_BASE_URL}/admin/products${qs(params as Record<string, unknown>)}`,
      {
        headers: this.headers(),
        cache: 'no-store',
      },
    );
    return unwrap<ProductListResponse>(res);
  }

  static async get(id: string): Promise<VendlyProduct> {
    const res = await fetch(`${VENDLY_API_BASE_URL}/admin/products/${id}`, {
      headers: this.headers(),
      cache: 'no-store',
    });
    return unwrap<VendlyProduct>(res);
  }

  static async setStatus(id: string, status: ProductStatus): Promise<VendlyProduct> {
    const res = await fetch(`${VENDLY_API_BASE_URL}/admin/products/${id}/status`, {
      method: 'PATCH',
      headers: this.headers(),
      body: JSON.stringify({ status }),
    });
    return unwrap<VendlyProduct>(res);
  }

  static async toggleFeatured(id: string): Promise<VendlyProduct> {
    const res = await fetch(`${VENDLY_API_BASE_URL}/admin/products/${id}/featured`, {
      method: 'PATCH',
      headers: this.headers(),
    });
    return unwrap<VendlyProduct>(res);
  }

  static async getCategories(): Promise<Category[]> {
    const res = await fetch(`${VENDLY_API_BASE_URL}/admin/categories`, {
      headers: this.headers(),
      cache: 'no-store',
    });
    return unwrap<Category[]>(res);
  }

  static async getBrands(): Promise<Brand[]> {
    const res = await fetch(`${VENDLY_API_BASE_URL}/admin/brands`, {
      headers: this.headers(),
      cache: 'no-store',
    });
    return unwrap<Brand[]>(res);
  }
}
