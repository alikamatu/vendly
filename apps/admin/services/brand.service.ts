import { VENDLY_API_BASE_URL, getVendlyHeaders, qs, unwrap } from './config';
import type { Brand, CreateBrandInput, UpdateBrandInput } from '@/types/operations';

export class VendlyBrandService {
  private static headers() {
    return getVendlyHeaders();
  }

  static async list(params: { category_id?: string; category?: string } = {}): Promise<Brand[]> {
    const res = await fetch(
      `${VENDLY_API_BASE_URL}/admin/brands${qs(params as Record<string, unknown>)}`,
      {
        headers: this.headers(),
        cache: 'no-store',
      },
    );
    return unwrap<Brand[]>(res);
  }

  static async get(id: string): Promise<Brand> {
    const res = await fetch(`${VENDLY_API_BASE_URL}/admin/brands/${id}`, {
      headers: this.headers(),
      cache: 'no-store',
    });
    return unwrap<Brand>(res);
  }

  static async create(dto: CreateBrandInput): Promise<Brand> {
    const res = await fetch(`${VENDLY_API_BASE_URL}/admin/brands`, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify(dto),
    });
    return unwrap<Brand>(res);
  }

  static async update(id: string, dto: UpdateBrandInput): Promise<Brand> {
    const res = await fetch(`${VENDLY_API_BASE_URL}/admin/brands/${id}`, {
      method: 'PUT',
      headers: this.headers(),
      body: JSON.stringify(dto),
    });
    return unwrap<Brand>(res);
  }

  static async delete(id: string): Promise<{ message?: string } | Brand> {
    const res = await fetch(`${VENDLY_API_BASE_URL}/admin/brands/${id}`, {
      method: 'DELETE',
      headers: this.headers(),
    });
    return unwrap<{ message?: string } | Brand>(res);
  }
}
