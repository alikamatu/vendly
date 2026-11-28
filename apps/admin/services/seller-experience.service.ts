import { VENDLY_API_BASE_URL, getVendlyHeaders, unwrap } from './config';

export type SellerExperienceStatus = 'PENDING' | 'PUBLISHED' | 'REJECTED';

export interface SellerExperienceReview {
  id: string;
  rating: number;
  body: string;
  status: SellerExperienceStatus;
  created_at: string;
  reviewed_at: string | null;
  store_name: string;
  store_link: string;
  logo_url: string | null;
}

export class VendlySellerExperienceService {
  static async list(): Promise<SellerExperienceReview[]> {
    const res = await fetch(`${VENDLY_API_BASE_URL}/admin/seller-experience`, {
      headers: getVendlyHeaders(),
      cache: 'no-store',
    });
    const data = await unwrap<SellerExperienceReview[]>(res);
    return Array.isArray(data) ? data : [];
  }

  static async moderate(id: string, status: 'PUBLISHED' | 'REJECTED') {
    const res = await fetch(`${VENDLY_API_BASE_URL}/admin/seller-experience/${id}`, {
      method: 'PATCH',
      headers: getVendlyHeaders(),
      body: JSON.stringify({ status }),
    });
    return unwrap<{ id: string; status: SellerExperienceStatus }>(res);
  }
}
