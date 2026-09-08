import { escapeHtml } from './email-shell.component';

export interface ActionButtonProps {
  primaryLabel?: string;
  primaryHref?: string;
  secondaryLabel?: string;
  secondaryHref?: string;
  whatsAppNumber?: string;
  whatsAppMessage?: string;
}

export const renderActionButtons = (props: ActionButtonProps): string => {
  const buttons: string[] = [];

  if (props.primaryLabel && props.primaryHref) {
    buttons.push(`
    <td align="left" style="padding-right: 12px; padding-bottom: 10px;">
      <a href="${escapeHtml(props.primaryHref)}"
         style="display: inline-block; padding: 12px 24px; background: #0f172a; color: #ffffff; font-size: 13px; font-weight: 600; text-decoration: none; border-radius: 8px; letter-spacing: -0.01em;">
        ${escapeHtml(props.primaryLabel)} →
      </a>
    </td>`);
  }

  if (props.whatsAppNumber) {
    const cleanNum = props.whatsAppNumber.replace(/[^\d]/g, '');
    const waUrl = `https://wa.me/${cleanNum}${props.whatsAppMessage ? `?text=${encodeURIComponent(props.whatsAppMessage)}` : ''}`;
    buttons.push(`
    <td align="left" style="padding-right: 12px; padding-bottom: 10px;">
      <a href="${escapeHtml(waUrl)}"
         style="display: inline-block; padding: 12px 20px; background: #25d366; color: #ffffff; font-size: 13px; font-weight: 600; text-decoration: none; border-radius: 8px;">
        💬 Chat on WhatsApp
      </a>
    </td>`);
  } else if (props.secondaryLabel && props.secondaryHref) {
    buttons.push(`
    <td align="left" style="padding-right: 12px; padding-bottom: 10px;">
      <a href="${escapeHtml(props.secondaryHref)}"
         style="display: inline-block; padding: 11px 20px; background: #ffffff; color: #0f172a; border: 1px solid #cbd5e1; font-size: 13px; font-weight: 500; text-decoration: none; border-radius: 8px;">
        ${escapeHtml(props.secondaryLabel)}
      </a>
    </td>`);
  }

  if (buttons.length === 0) return '';

  return `
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin: 22px 0 10px;">
    <tr>
      ${buttons.join('')}
    </tr>
  </table>`;
};
