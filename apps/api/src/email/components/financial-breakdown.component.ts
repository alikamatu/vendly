import { formatMoney } from './email-shell.component';

export interface FinancialBreakdownProps {
  subtotal: number | string;
  shipping?: number | string;
  total: number | string;
  currency?: string;
  totalLabel?: string;
}

export const renderFinancialBreakdown = (props: FinancialBreakdownProps): string => {
  const currency = props.currency || 'GHS';

  return `
  <div style="margin: 16px 0 20px; padding: 14px 18px; border-radius: 12px; background: #f8fafc; border: 1px solid #e2e8f0;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
      ${
        props.subtotal != null
          ? `
      <tr>
        <td style="padding: 4px 0; font-size: 13px; color: #64748b;">Subtotal</td>
        <td align="right" style="padding: 4px 0; font-size: 13px; font-weight: 500; color: #0f172a;">
          ${formatMoney(props.subtotal, currency)}
        </td>
      </tr>`
          : ''
      }
      ${
        props.shipping != null && Number(props.shipping) > 0
          ? `
      <tr>
        <td style="padding: 4px 0; font-size: 13px; color: #64748b;">Delivery Fee</td>
        <td align="right" style="padding: 4px 0; font-size: 13px; font-weight: 500; color: #0f172a;">
          ${formatMoney(props.shipping, currency)}
        </td>
      </tr>`
          : ''
      }
      <tr>
        <td colspan="2" style="padding: 6px 0;">
          <div style="height: 1px; background: #e2e8f0;"></div>
        </td>
      </tr>
      <tr>
        <td style="padding: 6px 0; font-size: 14.5px; font-weight: 700; color: #0f172a;">
          ${props.totalLabel || 'Total Amount'}
        </td>
        <td align="right" style="padding: 6px 0; font-size: 18px; font-weight: 800; color: #0f172a; letter-spacing: -0.02em;">
          ${formatMoney(props.total, currency)}
        </td>
      </tr>
    </table>
  </div>`;
};
