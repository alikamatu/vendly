import { escapeHtml, formatDateTime } from './email-shell.component';

export interface OrderSummaryProps {
  orderNumber: string;
  date: string | Date;
  storeName?: string;
  storeLink?: string;
  paymentMethod?: string;
  paymentReference?: string;
  isPaid?: boolean;
}

export const renderOrderSummaryCard = (props: OrderSummaryProps): string => {
  const paymentBadge = props.isPaid
    ? `<span style="display: inline-block; padding: 2px 8px; border-radius: 9999px; background: #ecfdf5; color: #047857; font-size: 11px; font-weight: 600;">PAID ONLINE</span>`
    : props.paymentMethod && props.paymentMethod.toLowerCase().includes('delivery')
      ? `<span style="display: inline-block; padding: 2px 8px; border-radius: 9999px; background: #fffbeb; color: #b45309; font-size: 11px; font-weight: 600;">PAY ON DELIVERY</span>`
      : props.paymentMethod
        ? `<span style="display: inline-block; padding: 2px 8px; border-radius: 9999px; background: #f1f5f9; color: #475569; font-size: 11px; font-weight: 600;">${escapeHtml(props.paymentMethod)}</span>`
        : '';

  return `
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" class="email-card"
    style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; margin: 18px 0;">
    <tr>
      <td style="padding: 16px 20px;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
          <tr class="email-card-row">
            <td style="padding: 6px 0; font-size: 11.5px; font-weight: 600; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em; width: 35%;">Order ID</td>
            <td style="padding: 6px 0; font-size: 13.5px; font-weight: 700; color: #0f172a; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; text-align: right;">
              #${escapeHtml(props.orderNumber)}
            </td>
          </tr>
          <tr class="email-card-row">
            <td style="padding: 6px 0; font-size: 11.5px; font-weight: 600; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em;">Placed On</td>
            <td style="padding: 6px 0; font-size: 13px; font-weight: 500; color: #0f172a; text-align: right;">
              ${escapeHtml(formatDateTime(props.date))}
            </td>
          </tr>
          ${
            props.storeName
              ? `
          <tr class="email-card-row">
            <td style="padding: 6px 0; font-size: 11.5px; font-weight: 600; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em;">Store</td>
            <td style="padding: 6px 0; font-size: 13px; font-weight: 600; color: #ef4444; text-align: right;">
              ${escapeHtml(props.storeName)}
            </td>
          </tr>`
              : ''
          }
          ${
            props.paymentMethod || props.isPaid
              ? `
          <tr class="email-card-row">
            <td style="padding: 6px 0; font-size: 11.5px; font-weight: 600; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em;">Payment</td>
            <td style="padding: 6px 0; text-align: right;">
              ${paymentBadge}
            </td>
          </tr>`
              : ''
          }
          ${
            props.paymentReference
              ? `
          <tr class="email-card-row">
            <td style="padding: 6px 0; font-size: 11.5px; font-weight: 600; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em;">Reference</td>
            <td style="padding: 6px 0; font-size: 11.5px; font-family: ui-monospace, monospace; color: #64748b; text-align: right;">
              ${escapeHtml(props.paymentReference)}
            </td>
          </tr>`
              : ''
          }
        </table>
      </td>
    </tr>
  </table>`;
};
