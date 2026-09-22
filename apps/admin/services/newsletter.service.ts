import { VENDLY_API_BASE_URL, getVendlyHeaders, qs, unwrap } from './config';
import type { NewsletterSubscriber, NewsletterStats } from '@/types/operations';

export interface NewsletterListResponse {
  data: NewsletterSubscriber[];
  total: number;
  page: number;
  limit: number;
}

export class VendlyNewsletterService {
  private static headers() {
    return getVendlyHeaders();
  }

  static async getSubscribers(
    params: {
      page?: number;
      limit?: number;
      search?: string;
      status?: 'ALL' | 'ACTIVE' | 'INACTIVE';
    } = {},
  ): Promise<NewsletterListResponse> {
    const res = await fetch(
      `${VENDLY_API_BASE_URL}/admin/newsletter/subscribers${qs(params as Record<string, unknown>)}`,
      {
        headers: this.headers(),
        cache: 'no-store',
      },
    );
    return unwrap<NewsletterListResponse>(res);
  }

  static async getStats(): Promise<NewsletterStats> {
    const res = await fetch(`${VENDLY_API_BASE_URL}/admin/newsletter/stats`, {
      headers: this.headers(),
      cache: 'no-store',
    });
    return unwrap<NewsletterStats>(res);
  }

  static async addSubscriber(email: string): Promise<NewsletterSubscriber> {
    const res = await fetch(`${VENDLY_API_BASE_URL}/admin/newsletter/subscribers`, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify({ email }),
    });
    return unwrap<NewsletterSubscriber>(res);
  }

  static async toggleStatus(id: string): Promise<NewsletterSubscriber> {
    const res = await fetch(`${VENDLY_API_BASE_URL}/admin/newsletter/subscribers/${id}/toggle`, {
      method: 'PATCH',
      headers: this.headers(),
    });
    return unwrap<NewsletterSubscriber>(res);
  }

  static async delete(id: string): Promise<{ message: string }> {
    const res = await fetch(`${VENDLY_API_BASE_URL}/admin/newsletter/subscribers/${id}`, {
      method: 'DELETE',
      headers: this.headers(),
    });
    return unwrap<{ message: string }>(res);
  }
}
