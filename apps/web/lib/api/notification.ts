import { api } from './index';

export type NotificationType =
  | 'ORDER_PLACED'
  | 'ORDER_STATUS_CHANGED'
  | 'ORDER_CANCELLED'
  | 'ORDER_DELIVERED'
  | 'PAYMENT_RECEIVED'
  | 'PAYOUT_PROCESSED'
  | 'NEW_REVIEW'
  | 'REVIEW_FLAGGED'
  | 'RETURN_REQUESTED'
  | 'RETURN_UPDATED'
  | 'PRODUCT_APPROVED'
  | 'PRODUCT_REJECTED'
  | 'STORE_APPROVED'
  | 'STORE_REJECTED'
  | 'ADMIN_BROADCAST'
  | 'SYSTEM';

export interface NotificationItem {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  link: string | null;
  data: Record<string, unknown> | null;
  is_read: boolean;
  read_at: string | null;
  created_at: string;
}

export interface NotificationPage {
  items: NotificationItem[];
  nextCursor: string | null;
}

export const notificationApi = {
  list: async (opts: { unreadOnly?: boolean; cursor?: string; take?: number } = {}) => {
    const params = new URLSearchParams();
    if (opts.unreadOnly) params.set('unreadOnly', 'true');
    if (opts.cursor) params.set('cursor', opts.cursor);
    if (opts.take) params.set('take', String(opts.take));
    const qs = params.toString();
    const res = await api.get<NotificationPage>(`/notifications${qs ? `?${qs}` : ''}`);
    return res.data;
  },

  unreadCount: async (): Promise<number> => {
    const res = await api.get<{ count: number }>('/notifications/unread-count');
    return res.data?.count ?? 0;
  },

  markRead: async (id: string) => {
    const res = await api.patch<NotificationItem>(`/notifications/${id}/read`);
    return res.data;
  },

  markAllRead: async () => {
    const res = await api.patch<{ updated: number }>('/notifications/read-all');
    return res.data;
  },

  remove: async (id: string) => {
    const res = await api.delete<{ deleted: boolean }>(`/notifications/${id}`);
    return res.data;
  },
};
