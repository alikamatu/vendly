import { escapeHtml, formatMoney } from './email-shell.component';

export interface OrderItemDisplay {
  title: string;
  quantity: number;
  price: number | string;
  image_url?: string | null;
  variantDescription?: string | null;
}

export const renderOrderItemsComponent = (
  items: OrderItemDisplay[],
  currency = 'GHS',
): string => {
  if (!items || items.length === 0) {
    return `
      <div style="padding: 16px 0; text-align: center; color: #64748b; font-size: 13px;">
        No items listed.
      </div>`;
  }

  const defaultPlaceholder =
    'https://res.cloudinary.com/du30sqscy/image/upload/w_120,h_120,c_fill,q_auto,f_png/placeholder_product.png';

  return `
  <div style="margin: 20px 0 10px;">
    <p style="margin: 0 0 10px; font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.06em;">
      Ordered Items (${items.reduce((acc, it) => acc + (it.quantity || 1), 0)})
    </p>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="border-collapse: collapse;">
      <tbody>
        ${items
          .map((item, idx) => {
            const lineTotal = Number(item.price) * (item.quantity || 1);
            const imgSrc = item.image_url && item.image_url.trim().length > 0 ? item.image_url : defaultPlaceholder;
            const isLast = idx === items.length - 1;

            return `
        <tr>
          <td style="padding: 12px 0; vertical-align: top; border-bottom: ${isLast ? 'none' : '1px solid #e2e8f0'}; width: 56px;">
            <div style="width: 52px; height: 52px; border-radius: 10px; overflow: hidden; border: 1px solid #e2e8f0; background: #f8fafc;">
              <img src="${escapeHtml(imgSrc)}"
                   alt="${escapeHtml(item.title)}"
                   width="52"
                   height="52"
                   style="display: block; width: 52px; height: 52px; object-fit: cover; border-radius: 9px; border: 0;" />
            </div>
          </td>
          <td style="padding: 12px 14px; vertical-align: middle; border-bottom: ${isLast ? 'none' : '1px solid #e2e8f0'};">
            <div style="font-size: 13.5px; font-weight: 600; color: #0f172a; line-height: 1.35; margin-bottom: 3px;">
              ${escapeHtml(item.title)}
            </div>
            ${
              item.variantDescription
                ? `<div style="font-size: 11.5px; color: #64748b; line-height: 1.3; margin-bottom: 2px;">${escapeHtml(item.variantDescription)}</div>`
                : ''
            }
            <div style="font-size: 12px; color: #64748b;">
              Qty: <strong style="color: #0f172a; font-weight: 600;">${item.quantity}</strong>
              &nbsp;×&nbsp;
              ${formatMoney(item.price, currency)}
            </div>
          </td>
          <td align="right" style="padding: 12px 0; vertical-align: middle; border-bottom: ${isLast ? 'none' : '1px solid #e2e8f0'}; width: 90px; white-space: nowrap;">
            <div style="font-size: 14px; font-weight: 700; color: #0f172a; letter-spacing: -0.01em;">
              ${formatMoney(lineTotal, currency)}
            </div>
          </td>
        </tr>`;
          })
          .join('')}
      </tbody>
    </table>
  </div>`;
};
