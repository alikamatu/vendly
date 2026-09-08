/**
 * Reusable email shell component.
 * Provides Outlook/Apple Mail/Gmail compatible structure, light & dark theme styling,
 * brand header, and compliant footer.
 */

export const BRAND = {
  name: 'Verndly',
  tagline: 'Commerce engineered for independent businesses',
  logo: 'https://res.cloudinary.com/du30sqscy/image/upload/w_112,h_112,c_limit,q_auto,f_png/logos/verndly-logo.png',
  supportEmail: 'support@verndly.com',
  securityEmail: 'security@verndly.com',
  whatsapp: '+233 24 000 0000',
  primary: '#0f172a',
  accent: '#ef4444',
  text: '#0f172a',
  muted: '#64748b',
  border: '#e2e8f0',
  surface: '#f8fafc',
  background: '#f1f5f9',
};

export interface EmailLinks {
  baseUrl: string;
}

export const escapeHtml = (s: unknown): string =>
  String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

export const formatMoney = (amount: number | string, currency = 'GHS'): string => {
  const n = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (!Number.isFinite(n)) return `${currency} 0.00`;
  const symbol = currency === 'GHS' ? 'GH₵ ' : currency + ' ';
  return `${symbol}${n.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

export const formatDateTime = (d: string | Date): string => {
  const date = typeof d === 'string' ? new Date(d) : d;
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export interface ShellOptions {
  title: string;
  preheader?: string;
  category?: string;
  content: string;
  footerNote?: string;
  links?: EmailLinks;
}

export const emailShell = ({
  title,
  preheader,
  category,
  content,
  footerNote,
  links = { baseUrl: 'https://verndly.com' },
}: ShellOptions): string => `
<!DOCTYPE html>
<html lang="en" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="light dark">
  <meta name="supported-color-schemes" content="light dark">
  <meta name="x-apple-disable-message-reformatting">
  <title>${escapeHtml(title)}</title>
  <!--[if mso]>
  <style type="text/css">
    body, table, td, p, a, span { font-family: 'Segoe UI', Arial, sans-serif !important; }
  </style>
  <![endif]-->
  <style>
    :root {
      color-scheme: light dark;
      supported-color-schemes: light dark;
    }
    @media (prefers-color-scheme: dark) {
      body, .email-body {
        background-color: #090a0f !important;
        color: #f1f5f9 !important;
      }
      .email-container {
        background-color: #12141a !important;
        border-color: #232732 !important;
        box-shadow: 0 4px 28px rgba(0, 0, 0, 0.55) !important;
      }
      .email-header {
        background-color: #12141a !important;
        border-bottom-color: #232732 !important;
      }
      .email-brand-text {
        color: #ffffff !important;
      }
      .email-category-pill {
        background-color: #1c202a !important;
        color: #94a3b8 !important;
        border-color: #2d3342 !important;
      }
      .email-card {
        background-color: #181b23 !important;
        border-color: #272c38 !important;
        color: #f1f5f9 !important;
      }
      .email-card-row {
        border-bottom-color: #232732 !important;
      }
      .email-h1, .email-title {
        color: #ffffff !important;
      }
      .email-p {
        color: #cbd5e1 !important;
      }
      .email-p strong {
        color: #f8fafc !important;
      }
      .email-muted {
        color: #94a3b8 !important;
      }
      .email-border {
        border-color: #232732 !important;
      }
      .email-divider {
        background-color: #232732 !important;
      }
      .email-footer {
        background-color: #0d0f14 !important;
        border-top-color: #232732 !important;
      }
      .email-footer-link {
        color: #cbd5e1 !important;
      }
      .email-table-header {
        color: #94a3b8 !important;
        border-bottom-color: #232732 !important;
      }
      .email-table-cell {
        border-bottom-color: #232732 !important;
        color: #f1f5f9 !important;
      }
      .email-item-bg {
        background-color: #1c202a !important;
      }
    }
    [data-ogsc] body, [data-ogsc] .email-body { background-color: #090a0f !important; color: #f1f5f9 !important; }
    [data-ogsc] .email-container { background-color: #12141a !important; border-color: #232732 !important; }
    [data-ogsc] .email-card { background-color: #181b23 !important; border-color: #272c38 !important; }
    [data-ogsc] .email-h1 { color: #ffffff !important; }
    [data-ogsc] .email-p { color: #cbd5e1 !important; }
    [data-ogsc] .email-muted { color: #94a3b8 !important; }
  </style>
</head>
<body class="email-body" style="margin: 0; padding: 0; background: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #0f172a; -webkit-font-smoothing: antialiased;">
  ${preheader ? `<div style="display: none; max-height: 0; overflow: hidden; mso-hide: all;">${escapeHtml(preheader)}</div>` : ''}
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" class="email-body" style="background: #f1f5f9; table-layout: fixed;">
    <tr>
      <td align="center" style="padding: 32px 14px;">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" class="email-container" style="max-width: 600px; width: 100%; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 16px rgba(15, 23, 42, 0.04);">

          <!-- Branded Header -->
          <tr>
            <td class="email-header" style="padding: 22px 32px; border-bottom: 1px solid #e2e8f0; background: #ffffff;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td align="left" style="vertical-align: middle;">
                    <a href="${escapeHtml(links.baseUrl)}" style="text-decoration: none; display: inline-block;">
                      <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                        <tr>
                          <td width="30" height="30" style="vertical-align: middle; padding-right: 12px;">
                            <img src="${BRAND.logo}" alt="Verndly" width="30" height="30" border="0" style="display: block; width: 30px !important; height: 30px !important; border-radius: 8px; border: 0;">
                          </td>
                          <td style="vertical-align: middle;">
                            <span class="email-brand-text" style="font-size: 18px; font-weight: 700; color: #0f172a; letter-spacing: -0.03em;">Verndly</span>
                          </td>
                        </tr>
                      </table>
                    </a>
                  </td>
                  <td align="right" style="vertical-align: middle;">
                    <span class="email-category-pill" style="display: inline-block; padding: 4px 12px; font-size: 11px; font-weight: 600; color: #64748b; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 9999px; letter-spacing: 0.03em; text-transform: uppercase;">
                      ${escapeHtml(category || 'Order Service')}
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Main Content -->
          <tr>
            <td style="padding: 34px 32px 28px;">
              ${content}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td class="email-footer" style="padding: 24px 32px 30px; background: #f8fafc; border-top: 1px solid #e2e8f0;">
              ${
                footerNote
                  ? `<p class="email-muted" style="font-size: 12px; line-height: 1.6; color: #64748b; margin: 0 0 14px;">${footerNote}</p>`
                  : ''
              }
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td class="email-muted" style="font-size: 11.5px; line-height: 1.6; color: #64748b; padding-bottom: 12px;">
                    This is an automated order notification from Verndly Commerce. You can manage your orders and account settings at <a href="${escapeHtml(links.baseUrl)}/orders" style="color: #ef4444; text-decoration: none; font-weight: 600;">verndly.com</a>.
                  </td>
                </tr>
                <tr>
                  <td style="font-size: 11.5px; color: #64748b; padding-bottom: 12px;">
                    <a href="${escapeHtml(links.baseUrl)}/privacy" class="email-footer-link" style="color: #64748b; text-decoration: underline;">Privacy</a>
                    &nbsp;·&nbsp;
                    <a href="${escapeHtml(links.baseUrl)}/terms" class="email-footer-link" style="color: #64748b; text-decoration: underline;">Terms</a>
                    &nbsp;·&nbsp;
                    <a href="mailto:${BRAND.supportEmail}" class="email-footer-link" style="color: #64748b; text-decoration: underline;">Support</a>
                    &nbsp;·&nbsp;
                    <a href="https://wa.me/233240000000" class="email-footer-link" style="color: #64748b; text-decoration: underline;">WhatsApp Help</a>
                  </td>
                </tr>
                <tr>
                  <td class="email-muted" style="font-size: 11px; color: #94a3b8; line-height: 1.5;">
                    © ${new Date().getFullYear()} Verndly Technologies Inc. Accra, Ghana. All rights reserved.
                  </td>
                </tr>
              </table>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
