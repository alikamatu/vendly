import { VENDLY_API_BASE_URL, getVendlyHeaders, unwrap } from './config';
import type { Category, CreateCategoryInput, UpdateCategoryInput } from '@/types/operations';

export class VendlyCategoryService {
  private static headers() {
    return getVendlyHeaders();
  }

  static async list(): Promise<Category[]> {
    const res = await fetch(`${VENDLY_API_BASE_URL}/admin/categories`, {
      headers: this.headers(),
      cache: 'no-store',
    });
    return unwrap<Category[]>(res);
  }

  static async get(id: string): Promise<Category> {
    const res = await fetch(`${VENDLY_API_BASE_URL}/admin/categories/${id}`, {
      headers: this.headers(),
      cache: 'no-store',
    });
    return unwrap<Category>(res);
  }

  static async create(dto: CreateCategoryInput): Promise<Category> {
    const res = await fetch(`${VENDLY_API_BASE_URL}/admin/categories`, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify(dto),
    });
    return unwrap<Category>(res);
  }

  static async update(id: string, dto: UpdateCategoryInput): Promise<Category> {
    const res = await fetch(`${VENDLY_API_BASE_URL}/admin/categories/${id}`, {
      method: 'PUT',
      headers: this.headers(),
      body: JSON.stringify(dto),
    });
    return unwrap<Category>(res);
  }

  static async delete(id: string): Promise<{ message: string }> {
    const res = await fetch(`${VENDLY_API_BASE_URL}/admin/categories/${id}`, {
      method: 'DELETE',
      headers: this.headers(),
    });
    return unwrap<{ message: string }>(res);
  }
}
