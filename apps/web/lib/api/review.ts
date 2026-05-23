import { api } from './index';

export type ReviewStatus = 'PUBLISHED' | 'HIDDEN' | 'FLAGGED';
export type ReviewFlagReason = 'SPAM' | 'OFFENSIVE' | 'IRRELEVANT' | 'FAKE' | 'OTHER';
export type ReviewSort = 'newest' | 'oldest' | 'highest' | 'lowest' | 'helpful';

export interface ReviewBuyer {
  id: string;
  full_name: string;
}
export interface ReviewProductLite {
  id: string;
  title: string;
  image_urls: string[];
}

export interface Review {
  id: string;
  product_id: string;
  seller_id: string;
  buyer_id: string;
  order_item_id: string;
  rating: number;
  title: string | null;
  body: string | null;
  status: ReviewStatus;
  verified_purchase: boolean;
  helpful_count: number;
  seller_reply: string | null;
  seller_replied_at: string | null;
  edited_at: string | null;
  created_at: string;
  updated_at: string;
  buyer?: ReviewBuyer;
  product?: ReviewProductLite;
}

export interface ReviewList {
  items: Review[];
  total: number;
  nextCursor: number | null;
}

export interface ReviewSummary {
  count: number;
  average: number;
  distribution: { 1: number; 2: number; 3: number; 4: number; 5: number };
}

export interface ListParams {
  limit?: number;
  cursor?: number;
  sort?: ReviewSort;
  rating?: number;
}

function qs(params: ListParams) {
  const u = new URLSearchParams();
  if (params.limit != null) u.set('limit', String(params.limit));
  if (params.cursor != null) u.set('cursor', String(params.cursor));
  if (params.sort) u.set('sort', params.sort);
  if (params.rating != null) u.set('rating', String(params.rating));
  const s = u.toString();
  return s ? `?${s}` : '';
}

export const reviews = {
  // Reads
  listForProduct(productId: string, params: ListParams = {}) {
    return api.get<ReviewList>(`/reviews/product/${productId}${qs(params)}`);
  },
  summaryForProduct(productId: string) {
    return api.get<ReviewSummary>(`/reviews/product/${productId}/summary`);
  },
  listForStore(storeLink: string, params: ListParams = {}) {
    return api.get<
      ReviewList & {
        seller: { id: string; rating_avg: number; rating_count: number; store_name: string };
      }
    >(`/reviews/store/${storeLink}${qs(params)}`);
  },
  summaryForStore(storeLink: string) {
    return api.get<ReviewSummary>(`/reviews/store/${storeLink}/summary`);
  },

  // Buyer
  myEligible() {
    return api.get<
      Array<{
        id: string;
        product_id: string;
        product: {
          id: string;
          title: string;
          image_urls: string[];
          seller: { store_name: string; store_link: string };
        };
        order: { id: string; created_at: string; status: string };
      }>
    >(`/reviews/me/eligible`);
  },
  myWritten() {
    return api.get<Review[]>(`/reviews/me/written`);
  },
  create(body: { order_item_id: string; rating: number; title?: string; body?: string }) {
    return api.post<Review>(`/reviews`, body);
  },
  update(id: string, body: { rating?: number; title?: string; body?: string }) {
    return api.patch<Review>(`/reviews/${id}`, body);
  },
  remove(id: string) {
    return api.delete<{ ok: boolean }>(`/reviews/${id}`);
  },

  // Seller
  reply(id: string, reply: string) {
    return api.post<Review>(`/reviews/${id}/reply`, { reply });
  },
  removeReply(id: string) {
    return api.delete<Review>(`/reviews/${id}/reply`);
  },

  // Flag
  flag(id: string, reason: ReviewFlagReason, notes?: string) {
    return api.post<{ ok: boolean; flagCount: number }>(`/reviews/${id}/flag`, { reason, notes });
  },
};
