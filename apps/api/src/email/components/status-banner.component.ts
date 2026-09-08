import { escapeHtml } from './email-shell.component';

export interface StatusBannerConfig {
  pillLabel: string;
  pillBg: string;
  pillFg: string;
  pillBorder: string;
  headline: string;
  subtext: string;
  accentColor: string;
}

export const getStatusConfig = (status: string, reason?: string | null): StatusBannerConfig => {
  const norm = (status || '').trim().toUpperCase();

  switch (norm) {
    case 'CONFIRMED':
      return {
        pillLabel: 'Order Confirmed',
        pillBg: '#ecfdf5',
        pillFg: '#047857',
        pillBorder: '#a7f3d0',
        headline: 'Your order has been confirmed!',
        subtext:
          'The store has verified your order and started preparing your items.',
        accentColor: '#10b981',
      };

    case 'PROCESSING':
    case 'PROCESSED':
      return {
        pillLabel: 'In Preparation',
        pillBg: '#eff6ff',
        pillFg: '#1d4ed8',
        pillBorder: '#bfdbfe',
        headline: 'Your order is being prepared',
        subtext:
          'The store is currently packaging your items. We will notify you once they are on the way.',
        accentColor: '#3b82f6',
      };

    case 'ON THE WAY':
    case 'SHIPPED':
      return {
        pillLabel: 'Dispatched & On The Way',
        pillBg: '#f5f3ff',
        pillFg: '#6d28d9',
        pillBorder: '#ddd6fe',
        headline: 'Your order is on the way!',
        subtext:
          'Your package has been dispatched for delivery. Please keep your phone reachable for the courier.',
        accentColor: '#8b5cf6',
      };

    case 'AVAILABLE FOR PICKUP':
      return {
        pillLabel: 'Ready for Pickup',
        pillBg: '#fffbeb',
        pillFg: '#b45309',
        pillBorder: '#fde68a',
        headline: 'Your order is ready for pickup!',
        subtext:
          'You can now visit the store or designated pickup location to collect your package.',
        accentColor: '#f59e0b',
      };

    case 'DELIVERED':
    case 'COMPLETED':
      return {
        pillLabel: 'Delivered',
        pillBg: '#ecfdf5',
        pillFg: '#047857',
        pillBorder: '#a7f3d0',
        headline: 'Your order has been delivered!',
        subtext:
          'We hope you love your purchase. If you need any assistance, reach out directly to the seller or our support team.',
        accentColor: '#10b981',
      };

    case 'CANCELLED':
      return {
        pillLabel: 'Order Cancelled',
        pillBg: '#fef2f2',
        pillFg: '#b91c1c',
        pillBorder: '#fecaca',
        headline: 'Order Cancelled',
        subtext: reason
          ? `This order was cancelled: "${reason}"`
          : 'This order has been cancelled. Any pre-authorized charges will be refunded according to store policy.',
        accentColor: '#ef4444',
      };

    case 'REFUNDED':
      return {
        pillLabel: 'Refunded',
        pillBg: '#fff7ed',
        pillFg: '#c2410c',
        pillBorder: '#ffedd5',
        headline: 'Refund processed',
        subtext:
          'A refund has been processed for this order. It should reflect on your payment account within 3–7 business days.',
        accentColor: '#f97316',
      };

    case 'PAID':
      return {
        pillLabel: 'Payment Confirmed',
        pillBg: '#ecfdf5',
        pillFg: '#047857',
        pillBorder: '#a7f3d0',
        headline: 'Payment received!',
        subtext:
          'Your payment was confirmed. The seller has been notified to fulfill your order.',
        accentColor: '#10b981',
      };

    case 'PENDING':
    case 'AWAITING_PAYMENT':
    default:
      return {
        pillLabel: norm || 'Order Received',
        pillBg: '#f8fafc',
        pillFg: '#475569',
        pillBorder: '#cbd5e1',
        headline: 'Order status update',
        subtext: `Your order status is currently: ${norm || 'PENDING'}.`,
        accentColor: '#64748b',
      };
  }
};

export const renderStatusBanner = (status: string, reason?: string | null): string => {
  const cfg = getStatusConfig(status, reason);

  return `
  <div style="margin-bottom: 24px;">
    <div style="margin-bottom: 12px;">
      <span style="display: inline-block; padding: 4px 12px; background: ${cfg.pillBg}; color: ${cfg.pillFg}; border: 1px solid ${cfg.pillBorder}; border-radius: 9999px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em;">
        ${escapeHtml(cfg.pillLabel)}
      </span>
    </div>
    <h1 style="margin: 0 0 8px; font-size: 22px; font-weight: 700; color: #0f172a; letter-spacing: -0.02em; line-height: 1.25;">
      ${escapeHtml(cfg.headline)}
    </h1>
    <p style="margin: 0; font-size: 13.5px; line-height: 1.6; color: #475569;">
      ${escapeHtml(cfg.subtext)}
    </p>
  </div>`;
};
