import { VENDLY_API_BASE_URL, getVendlyHeaders, qs, unwrap } from './config';
import type { Review } from '@/types/operations';

export interface ReviewListResponse {
  data: Review[];
  total: number;
}

export type ReviewModerationAction = 'hide' | 'show' | 'delete' | 'dismiss_flags';

export class VendlyReviewsService {
  private static headers() {
    return getVendlyHeaders();
  }

  static async list(params: Record<string, unknown> = {}): Promise<ReviewListResponse> {
    const res = await fetch(`${VENDLY_API_BASE_URL}/admin/reviews${qs(params)}`, {
      headers: this.headers(),
      cache: 'no-store',
    });
    return unwrap<ReviewListResponse>(res);
  }

  static async moderate(
    id: string,
    action: ReviewModerationAction,
  ): Promise<{ success: boolean; message?: string }> {
    const res = await fetch(`${VENDLY_API_BASE_URL}/admin/reviews/${id}/moderate`, {
      method: 'PATCH',
      headers: this.headers(),
      body: JSON.stringify({ action }),
    });
    return unwrap<{ success: boolean; message?: string }>(res);
  }
}
