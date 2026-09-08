import { escapeHtml } from './email-shell.component';

export interface DeliveryDetailsProps {
  customerName?: string;
  customerPhone?: string;
  deliveryMethod?: string;
  deliveryLocation?: string | null;
  deliveryNotes?: string | null;
  isVendorView?: boolean;
}

export const renderDeliveryDetailsCard = (props: DeliveryDetailsProps): string => {
  const isPickup =
    props.deliveryMethod &&
    props.deliveryMethod.trim().toUpperCase().includes('PICKUP');

  const cleanPhone = props.customerPhone
    ? props.customerPhone.replace(/[^\d+]/g, '')
    : '';

  return `
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" class="email-card"
    style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; margin: 18px 0;">
    <tr>
      <td style="padding: 16px 20px;">
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px;">
          <span style="font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.06em;">
            ${isPickup ? 'Pickup Information' : 'Delivery Destination'}
          </span>
          <span style="display: inline-block; padding: 2px 8px; border-radius: 9999px; background: ${isPickup ? '#eff6ff' : '#f0fdf4'}; color: ${isPickup ? '#1d4ed8' : '#15803d'}; font-size: 10.5px; font-weight: 700; text-transform: uppercase;">
            ${isPickup ? 'Store Pickup' : 'Dispatch / Delivery'}
          </span>
        </div>

        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
          ${
            props.customerName
              ? `
          <tr>
            <td style="padding: 4px 0; font-size: 13.5px; font-weight: 600; color: #0f172a;">
              ${escapeHtml(props.customerName)}
            </td>
          </tr>`
              : ''
          }
          ${
            props.customerPhone
              ? `
          <tr>
            <td style="padding: 3px 0; font-size: 13px; color: #475569;">
              <a href="tel:${escapeHtml(cleanPhone)}" style="color: #475569; text-decoration: none;">📞 ${escapeHtml(props.customerPhone)}</a>
              ${
                props.isVendorView && cleanPhone
                  ? `&nbsp;·&nbsp;<a href="https://wa.me/${cleanPhone.replace('+', '')}" style="color: #059669; font-weight: 600; text-decoration: none;">💬 WhatsApp</a>`
                  : ''
              }
            </td>
          </tr>`
              : ''
          }
          ${
            props.deliveryLocation
              ? `
          <tr>
            <td style="padding: 4px 0; font-size: 13px; color: #334155; line-height: 1.45;">
              📍 ${escapeHtml(props.deliveryLocation)}
            </td>
          </tr>`
              : ''
          }
          ${
            props.deliveryNotes
              ? `
          <tr>
            <td style="padding: 8px 0 0; font-size: 12px; color: #64748b; font-style: italic; border-top: 1px dashed #cbd5e1; margin-top: 8px;">
              Note: "${escapeHtml(props.deliveryNotes)}"
            </td>
          </tr>`
              : ''
          }
        </table>
      </td>
    </tr>
  </table>`;
};
