/**
 * Verndly transactional email templates.
 *
 * Conventions:
 * - Inline styles only (most email clients strip <style>).
 * - Table-based layout for Outlook compatibility.
 * - Each template returns a complete HTML string.
 * - Every export accepts a typed data object and a `links` object with the
 *   storefront URL — templates avoid hard-coding domains so dev/prod can
 *   point at the right place via FRONTEND_URL.
 */

import {
  emailShell,
  renderOrderItemsComponent,
  renderOrderSummaryCard,
  renderDeliveryDetailsCard,
  renderFinancialBreakdown,
  renderStatusBanner,
  renderActionButtons,
  getStatusConfig,
  OrderItemDisplay,
} from './components';

export * from './components';

// ─── Brand tokens ────────────────────────────────────────────────────────────

const BRAND = {
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
  /** e.g. https://verndly.com — no trailing slash */
  baseUrl: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const escape = (s: unknown): string =>
  String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

const money = (amount: number | string, currency = 'GHS'): string => {
  const n = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (!Number.isFinite(n)) return `${currency} 0.00`;
  const symbol = currency === 'GHS' ? '₵' : currency + ' ';
  return `${symbol}${n.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

const formatDate = (d: string | Date): string => {
  const date = typeof d === 'string' ? new Date(d) : d;
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
};

const formatDateTime = (d: string | Date): string => {
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

// ─── Building blocks ─────────────────────────────────────────────────────────

const button = (label: string, href: string, color = BRAND.primary): string => `
<table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin: 26px 0 22px;">
  <tr>
    <td align="left" style="border-radius: 6px; background: ${color};" class="email-btn-primary">
      <a href="${escape(href)}"
        class="email-btn-primary"
        style="display: inline-block; padding: 13px 28px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 13.5px; font-weight: 600; color: #ffffff; text-decoration: none; border-radius: 6px; letter-spacing: -0.01em;">
        ${escape(label)}
      </a>
    </td>
  </tr>
</table>`;

const secondaryButton = (label: string, href: string): string => `
<a href="${escape(href)}"
  class="email-btn-secondary"
  style="display: inline-block; padding: 11px 22px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 13px; font-weight: 500; color: #0f172a; text-decoration: none; border: 1px solid #cbd5e1; border-radius: 6px; margin-top: 8px;">
  ${escape(label)}
</a>`;

const card = (inner: string, accent?: string): string => `
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0"
  class="email-card"
  style="background: #f8fafc; border: 1px solid #e2e8f0;
  ${accent ? `border-left: 3px solid ${accent};` : ''}
  border-radius: 8px; margin: 22px 0;">
  <tr><td style="padding: 18px 20px;">${inner}</td></tr>
</table>`;

const callout = (inner: string, variant: 'info' | 'warning' | 'error' | 'neutral' = 'info'): string => {
  const borders = {
    info: '#0284c7',
    warning: '#ea580c',
    error: '#dc2626',
    neutral: '#94a3b8',
  };
  return `
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0"
  class="email-card"
  style="background: #f8fafc; border: 1px solid #e2e8f0; border-left: 4px solid ${borders[variant]}; border-radius: 8px; margin: 22px 0;">
  <tr><td style="padding: 16px 18px;">${inner}</td></tr>
</table>`;
};

const fallbackUrlBox = (url: string, instruction = 'If you are having trouble selecting the button above, copy and paste the following URL into your web browser:'): string => `
<div style="margin: 22px 0 0;">
  <p class="email-muted" style="margin: 0 0 8px; font-size: 12px; line-height: 1.6; color: #64748b;">
    ${escape(instruction)}
  </p>
  <div class="email-code-box" style="background: #f1f5f9; border: 1px solid #e2e8f0; border-radius: 6px; padding: 12px 14px; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; font-size: 11.5px; line-height: 1.6; color: #0f172a; word-break: break-all;">
    <a href="${escape(url)}" style="color: inherit; text-decoration: none;">${escape(url)}</a>
  </div>
</div>`;

const kvRow = (label: string, value: string): string => `
<tr class="email-card-row">
  <td class="email-muted" style="padding: 8px 0; font-size: 11.5px; font-weight: 600; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em; width: 38%; vertical-align: top;">${escape(label)}</td>
  <td class="email-p" style="padding: 8px 0; font-size: 13.5px; font-weight: 500; color: #0f172a; text-align: right; vertical-align: top;">${value}</td>
</tr>`;

const divider = (): string => `
<div class="email-divider" style="height: 1px; background: #e2e8f0; margin: 24px 0;"></div>`;

const statusPill = (
  label: string,
  variant: 'success' | 'pending' | 'warning' | 'error' | 'info' = 'info',
): string => {
  const palette = {
    success: { bg: '#ecfdf5', fg: '#047857', border: '#a7f3d0' },
    pending: { bg: '#fffbeb', fg: '#b45309', border: '#fde68a' },
    warning: { bg: '#fff7ed', fg: '#c2410c', border: '#ffedd5' },
    error: { bg: '#fef2f2', fg: '#b91c1c', border: '#fecaca' },
    info: { bg: '#f0fdf4', fg: '#15803d', border: '#bbf7d0' },
  }[variant];
  return `<span class="email-status-pill" style="display: inline-block; padding: 4px 10px; background: ${palette.bg}; color: ${palette.fg}; border: 1px solid ${palette.border}; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; border-radius: 9999px;">${escape(label)}</span>`;
};

const orderItemsTable = (
  items: Array<{ title: string; quantity: number; price: number | string; image_url?: string | null }>,
  currency = 'GHS',
): string => `
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin: 8px 0 24px;">
  <thead>
    <tr>
      <th align="left" class="email-table-header" style="font-size: 11px; font-weight: 600; color: #64748b; text-transform: uppercase; letter-spacing: 0.06em; padding: 8px 0; border-bottom: 1px solid #e2e8f0;">Item</th>
      <th align="center" class="email-table-header" style="font-size: 11px; font-weight: 600; color: #64748b; text-transform: uppercase; letter-spacing: 0.06em; padding: 8px 0; border-bottom: 1px solid #e2e8f0;">Qty</th>
      <th align="right" class="email-table-header" style="font-size: 11px; font-weight: 600; color: #64748b; text-transform: uppercase; letter-spacing: 0.06em; padding: 8px 0; border-bottom: 1px solid #e2e8f0;">Price</th>
    </tr>
  </thead>
  <tbody>
    ${items
      .map(
        (it) => `
    <tr>
      <td class="email-table-cell" style="padding: 14px 0; border-bottom: 1px solid #e2e8f0; font-size: 13.5px; color: #0f172a;">
        ${
          it.image_url
            ? `<table role="presentation" cellspacing="0" cellpadding="0" border="0"><tr>
                 <td style="padding-right: 12px;"><img src="${escape(it.image_url)}" width="44" height="44" alt="" style="border-radius: 6px; display: block; object-fit: cover;"></td>
                 <td class="email-p" style="font-size: 13.5px; color: #0f172a;">${escape(it.title)}</td>
               </tr></table>`
            : escape(it.title)
        }
      </td>
      <td align="center" class="email-table-cell" style="padding: 14px 0; border-bottom: 1px solid #e2e8f0; font-size: 13.5px; color: #0f172a;">${it.quantity}</td>
      <td align="right" class="email-table-cell" style="padding: 14px 0; border-bottom: 1px solid #e2e8f0; font-size: 13.5px; color: #0f172a; font-weight: 500;">${money(Number(it.price) * it.quantity, currency)}</td>
    </tr>`,
      )
      .join('')}
  </tbody>
</table>`;

const totalRow = (label: string, value: string, emphasis = false): string => `
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
  <tr>
    <td class="${emphasis ? 'email-title' : 'email-muted'}" style="font-size: ${emphasis ? '14.5px' : '13px'}; font-weight: ${emphasis ? '600' : '400'}; color: ${emphasis ? '#0f172a' : '#64748b'}; padding: 6px 0;">${escape(label)}</td>
    <td align="right" class="email-title" style="font-size: ${emphasis ? '17px' : '13px'}; font-weight: ${emphasis ? '700' : '500'}; color: #0f172a; padding: 6px 0;">${value}</td>
  </tr>
</table>`;

// ─── Shell ───────────────────────────────────────────────────────────────────

interface ShellOptions {
  title: string;
  preheader?: string;
  category?: string;
  content: string;
  footerNote?: string;
}

const shell = ({ title, preheader, category, content, footerNote }: ShellOptions): string => `
<!DOCTYPE html>
<html lang="en" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="light dark">
  <meta name="supported-color-schemes" content="light dark">
  <meta name="x-apple-disable-message-reformatting">
  <title>${escape(title)}</title>
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
      .email-code-box {
        background-color: #0d0f14 !important;
        border-color: #272c38 !important;
        color: #e2e8f0 !important;
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
      .email-btn-primary {
        background-color: #ffffff !important;
        color: #090a0f !important;
      }
      .email-btn-secondary {
        background-color: #181b23 !important;
        border-color: #2d3342 !important;
        color: #f1f5f9 !important;
      }
      .email-table-header {
        color: #94a3b8 !important;
        border-bottom-color: #232732 !important;
      }
      .email-table-cell {
        border-bottom-color: #232732 !important;
        color: #f1f5f9 !important;
      }
    }
    /* Outlook.com / Webmail targeting */
    [data-ogsc] body, [data-ogsc] .email-body { background-color: #090a0f !important; color: #f1f5f9 !important; }
    [data-ogsc] .email-container { background-color: #12141a !important; border-color: #232732 !important; }
    [data-ogsc] .email-header { background-color: #12141a !important; border-bottom-color: #232732 !important; }
    [data-ogsc] .email-card { background-color: #181b23 !important; border-color: #272c38 !important; }
    [data-ogsc] .email-h1 { color: #ffffff !important; }
    [data-ogsc] .email-p { color: #cbd5e1 !important; }
    [data-ogsc] .email-muted { color: #94a3b8 !important; }
    [data-ogsc] .email-footer { background-color: #0d0f14 !important; border-top-color: #232732 !important; }
    [data-ogsc] .email-code-box { background-color: #0d0f14 !important; border-color: #272c38 !important; }
  </style>
</head>
<body class="email-body" style="margin: 0; padding: 0; background: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #0f172a; -webkit-font-smoothing: antialiased;">
  ${preheader ? `<div style="display: none; max-height: 0; overflow: hidden; mso-hide: all;">${escape(preheader)}</div>` : ''}
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" class="email-body" style="background: #f1f5f9; table-layout: fixed;">
    <tr>
      <td align="center" style="padding: 36px 16px;">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" class="email-container" style="max-width: 600px; width: 100%; background: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);">

          <!-- Header -->
          <tr>
            <td class="email-header" style="padding: 22px 32px; border-bottom: 1px solid #e2e8f0; background: #ffffff;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td align="left" style="vertical-align: middle;">
                    <a href="https://verndly.com" style="text-decoration: none; display: inline-block;">
                      <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                        <tr>
                          <td width="28" height="28" style="vertical-align: middle; padding-right: 10px; width: 28px; height: 28px; max-width: 28px; max-height: 28px;">
                            <img src="${BRAND.logo}" alt="Verndly" width="28" height="28" border="0" style="display: block; width: 28px !important; max-width: 28px !important; height: 28px !important; max-height: 28px !important; border: 0; outline: none; text-decoration: none; -ms-interpolation-mode: bicubic;">
                          </td>
                          <td style="vertical-align: middle;">
                            <span class="email-brand-text" style="font-size: 17px; font-weight: 600; color: #0f172a; letter-spacing: -0.02em;">Verndly</span>
                          </td>
                        </tr>
                      </table>
                    </a>
                  </td>
                  <td align="right" style="vertical-align: middle;">
                    <span class="email-category-pill" style="display: inline-block; padding: 4px 10px; font-size: 11px; font-weight: 500; color: #64748b; background: #f1f5f9; border: 1px solid #e2e8f0; border-radius: 9999px; letter-spacing: 0.02em;">
                      ${escape(category || BRAND.tagline)}
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Main Content -->
          <tr>
            <td style="padding: 36px 32px 28px;">
              ${content}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td class="email-footer" style="padding: 26px 32px 32px; background: #f8fafc; border-top: 1px solid #e2e8f0;">
              ${
                footerNote
                  ? `<p class="email-muted" style="font-size: 12px; line-height: 1.6; color: #64748b; margin: 0 0 14px;">${footerNote}</p>`
                  : ''
              }
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td class="email-muted" style="font-size: 11px; line-height: 1.65; color: #64748b; padding-bottom: 12px;">
                    This is a mandatory security and service communication regarding your Verndly account. Verndly will never ask for your password, PIN, or multi-factor authentication code via email.
                  </td>
                </tr>
                <tr>
                  <td style="font-size: 11.5px; color: #64748b; padding-bottom: 14px;">
                    <a href="https://verndly.com/privacy" class="email-footer-link" style="color: #64748b; text-decoration: underline;">Privacy Statement</a>
                    &nbsp;·&nbsp;
                    <a href="https://verndly.com/terms" class="email-footer-link" style="color: #64748b; text-decoration: underline;">Terms of Service</a>
                    &nbsp;·&nbsp;
                    <a href="mailto:${BRAND.supportEmail}" class="email-footer-link" style="color: #64748b; text-decoration: underline;">Support</a>
                    &nbsp;·&nbsp;
                    <a href="mailto:${BRAND.securityEmail}" class="email-footer-link" style="color: #64748b; text-decoration: underline;">Security</a>
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

// ─── Heading + paragraph helpers used inside content blocks ──────────────────

const H1 = (text: string) =>
  `<h1 class="email-h1" style="margin: 0 0 14px; font-size: 21px; font-weight: 600; color: #0f172a; letter-spacing: -0.02em; line-height: 1.3;">${escape(text)}</h1>`;

const P = (text: string) =>
  `<p class="email-p" style="margin: 0 0 16px; font-size: 13.5px; line-height: 1.68; color: #334155;">${text}</p>`;

const eyebrow = (text: string) =>
  `<p class="email-muted" style="margin: 0 0 10px; font-size: 11px; font-weight: 600; color: #ef4444; text-transform: uppercase; letter-spacing: 0.08em;">${escape(text)}</p>`;

// ═══════════════════════════════════════════════════════════════════════════
//   TEMPLATES
// ═══════════════════════════════════════════════════════════════════════════

// 1. Welcome (buyer & new user)
export const getWelcomeEmail = (
  name: string,
  links: EmailLinks = { baseUrl: 'https://verndly.com' },
) =>
  shell({
    title: `Welcome to Verndly, ${name}`,
    preheader: 'Your Verndly account is active. Explore verified independent businesses and merchant tools.',
    category: 'Account Confirmation',
    content: `
      <div style="margin-bottom: 18px;">${statusPill('Account Active', 'success')}</div>
      ${eyebrow('Verndly Commerce • Getting Started')}
      ${H1(`Welcome to Verndly, ${escape(name.split(' ')[0] || name)}.`)}
      ${P(`Your account has been successfully created and verified. Verndly is the dedicated commerce engine empowering verified independent brands, young entrepreneurs, and modern businesses across Ghana.`)}
      
      ${button('Explore marketplace', `${links.baseUrl}/products`)}

      ${card(`
        <div style="padding: 4px 0;">
          <h3 class="email-title" style="margin: 0 0 14px; font-size: 14px; font-weight: 600; color: #0f172a; letter-spacing: -0.01em;">
            What you can do with your Verndly account
          </h3>
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
            <tr>
              <td style="padding: 8px 0; vertical-align: top; width: 24px;">
                <span style="display: inline-block; width: 6px; height: 6px; border-radius: 50%; background: #ef4444; margin-top: 6px;"></span>
              </td>
              <td style="padding: 8px 0; vertical-align: top;">
                <strong class="email-title" style="font-size: 13.5px; color: #0f172a;">Curated Marketplace & Buyer Protection</strong>
                <p class="email-muted" style="margin: 3px 0 0; font-size: 12.5px; line-height: 1.6; color: #64748b;">
                  Shop directly from independently verified merchants with end-to-end order tracking and a 7-day return guarantee.
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding: 8px 0; vertical-align: top; width: 24px;">
                <span style="display: inline-block; width: 6px; height: 6px; border-radius: 50%; background: #ef4444; margin-top: 6px;"></span>
              </td>
              <td style="padding: 8px 0; vertical-align: top;">
                <strong class="email-title" style="font-size: 13.5px; color: #0f172a;">Integrated Ghana MoMo & Card Payments</strong>
                <p class="email-muted" style="margin: 3px 0 0; font-size: 12.5px; line-height: 1.6; color: #64748b;">
                  Instant checkout rails powered by Paystack supporting MTN Mobile Money, Telecel Cash, AT Money, and Visa/Mastercard.
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding: 8px 0; vertical-align: top; width: 24px;">
                <span style="display: inline-block; width: 6px; height: 6px; border-radius: 50%; background: #ef4444; margin-top: 6px;"></span>
              </td>
              <td style="padding: 8px 0; vertical-align: top;">
                <strong class="email-title" style="font-size: 13.5px; color: #0f172a;">Launch Your Own Storefront</strong>
                <p class="email-muted" style="margin: 3px 0 0; font-size: 12.5px; line-height: 1.6; color: #64748b;">
                  Whenever you are ready to sell, open your custom branded storefront at <a href="${links.baseUrl}/create-store" style="color: #0284c7; text-decoration: none;">verndly.com/create-store</a> with zero upfront setup fees.
                </p>
              </td>
            </tr>
          </table>
        </div>
      `)}

      <div style="margin-top: 24px; padding-top: 20px; border-top: 1px solid #e2e8f0;" class="email-border">
        <p class="email-muted" style="margin: 0 0 10px; font-size: 11.5px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.06em; color: #64748b;">
          Quick Account Navigation
        </p>
        <p class="email-p" style="margin: 0; font-size: 13px; line-height: 1.8; color: #475569;">
          · Manage your profile: <a href="${links.baseUrl}/dashboard/settings/profile" style="color: #0284c7; text-decoration: none;">Account Settings</a><br>
          · Configure security & 2FA: <a href="${links.baseUrl}/dashboard/settings/security" style="color: #0284c7; text-decoration: none;">Security Center</a><br>
          · View your order history: <a href="${links.baseUrl}/orders" style="color: #0284c7; text-decoration: none;">My Orders</a>
        </p>
      </div>
    `,
    footerNote: 'Thank you for choosing Verndly as your digital commerce platform.',
  });

// 2. Email verification
export const getVerificationEmail = (url: string) =>
  shell({
    title: 'Verify your email address — Verndly Security',
    preheader: 'Please confirm your email address to complete your Verndly account registration.',
    category: 'Identity Verification',
    content: `
      ${eyebrow('Verndly Security • Identity Verification')}
      ${H1('Verify your email address')}
      ${P(`We received a request to register or verify this email address for a Verndly account. To confirm your ownership of this address and activate your account credentials, please select the button below.`)}
      
      ${button('Verify email address', url)}

      ${card(`
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
          ${kvRow('Request type', 'Email address verification')}
          ${kvRow('Validity window', '24 hours')}
          ${kvRow('Service', 'Verndly Commerce Platform')}
          ${kvRow('Security standard', 'TLS 1.3 / Cryptographic HMAC token')}
        </table>
      `)}

      ${fallbackUrlBox(url, 'If you are having trouble selecting the button above, copy and paste this verification URL into your web browser:')}

      ${callout(`
        <p class="email-p" style="margin: 0; font-size: 12.5px; line-height: 1.65; color: #475569;">
          <strong>Did not request this verification?</strong><br>
          If you did not initiate this request, someone may have entered your email address by mistake. You can safely disregard this message. No account credentials will be activated without completing this verification step.
        </p>
      `, 'neutral')}
    `,
    footerNote: 'This security verification email was automatically generated by the Verndly Identity Service.',
  });

// 3. Password reset request
export const getPasswordResetEmail = (url: string) =>
  shell({
    title: 'Reset your password — Verndly Security',
    preheader: 'A password reset was requested for your Verndly account credentials.',
    category: 'Security Alert',
    content: `
      ${eyebrow('Verndly Security • Account Recovery')}
      ${H1('Reset your account password')}
      ${P(`We received an authorization request to reset the password associated with your Verndly account. If you initiated this request, select the button below to establish new credentials.`)}
      
      ${button('Reset password', url)}

      ${card(`
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
          ${kvRow('Request type', 'Account password reset')}
          ${kvRow('Link validity', '60 minutes')}
          ${kvRow('Service', 'Verndly Identity & Access Management')}
          ${kvRow('Security policy', 'Single-use link. Automatically invalidated upon update')}
        </table>
      `)}

      ${fallbackUrlBox(url, 'If the button above does not load, copy and paste the following link directly into your browser navigation bar:')}

      ${callout(`
        <p class="email-p" style="margin: 0; font-size: 12.5px; line-height: 1.65; color: #475569;">
          <strong style="color: #0f172a;">Important security advisory:</strong><br>
          If you did not request a password reset, your credentials have not been modified and your account remains secure. If you suspect unauthorized access attempts, we recommend reviewing your recent account activity or contacting our Trust & Safety team immediately at <a href="mailto:${BRAND.securityEmail}" style="color: #0284c7; text-decoration: none;">${BRAND.securityEmail}</a>.
        </p>
      `, 'warning')}
    `,
    footerNote: 'This is a time-sensitive security notification regarding your Verndly credentials.',
  });

// 4. Password changed confirmation
export const getPasswordChangedEmail = (name: string) => {
  const formattedDate = formatDateTime(new Date());
  return shell({
    title: 'Security Alert: Password updated — Verndly Security',
    preheader: 'The password for your Verndly account was recently updated.',
    category: 'Security Notification',
    content: `
      <div style="margin-bottom: 18px;">${statusPill('Security Update', 'info')}</div>
      ${eyebrow('Verndly Security • Credential Update')}
      ${H1('Your password was recently changed')}
      ${P(`Hello ${escape(name.split(' ')[0] || name)},`)}
      ${P(`This notification confirms that the password for your Verndly account was successfully updated.`)}

      ${card(`
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
          ${kvRow('Security event', 'Password credential update')}
          ${kvRow('Timestamp', `${escape(formattedDate)} UTC`)}
          ${kvRow('Account', escape(name))}
          ${kvRow('Status', '<span style="color: #059669; font-weight: 600;">Successful</span>')}
          ${kvRow('Active sessions', 'Updated across all client devices')}
        </table>
      `)}

      ${P(`<strong>If you initiated this change:</strong><br>No further action is required. Your updated password is now in effect across your storefront management dashboard, order tracking, and account settings.`)}

      ${callout(`
        <p class="email-p" style="margin: 0 0 10px; font-size: 13px; line-height: 1.6; color: #991b1b;">
          <strong>Did you not make this change?</strong>
        </p>
        <p class="email-p" style="margin: 0 0 12px; font-size: 12.5px; line-height: 1.65; color: #475569;">
          If you did not authorize this password update, your account may have been compromised. We strongly recommend taking immediate action:
        </p>
        <ol style="margin: 0; padding-left: 20px; font-size: 12.5px; line-height: 1.75; color: #475569;">
          <li>Reset your password immediately at <a href="https://verndly.com/forgot-password" style="color: #0284c7; text-decoration: underline;">verndly.com/forgot-password</a>.</li>
          <li>Contact the Verndly Security Team immediately at <a href="mailto:${BRAND.securityEmail}" style="color: #0284c7; text-decoration: underline;">${BRAND.securityEmail}</a> so we can protect your storefront, buyer orders, and settlement payouts.</li>
        </ol>
      `, 'error')}
    `,
    footerNote: 'Security notifications are mandatory service communications and cannot be unsubscribed from.',
  });
};

// ─── Order lifecycle ─────────────────────────────────────────────────────────

export type OrderEmailItem = OrderItemDisplay;

export interface OrderEmailData {
  orderNumber: string;
  date: string | Date;
  customerName: string;
  customerEmail?: string;
  customerPhone?: string;
  deliveryMethod?: 'PICKUP' | 'DELIVERY' | string;
  deliveryLocation?: string | null;
  deliveryNotes?: string | null;
  storeName: string;
  storeLink?: string;
  items: OrderEmailItem[];
  subtotal: number | string;
  shipping?: number | string;
  total: number | string;
  currency?: string;
  paymentMethod?: string;
  paymentReference?: string;
  isPaid?: boolean;
}

export interface OrderStatusEmailData {
  orderNumber: string;
  date?: string | Date;
  customerName: string;
  customerPhone?: string;
  storeName: string;
  storeLink?: string;
  status:
    | 'PENDING'
    | 'AWAITING_PAYMENT'
    | 'PAID'
    | 'CONFIRMED'
    | 'PROCESSING'
    | 'PROCESSED'
    | 'ON THE WAY'
    | 'SHIPPED'
    | 'AVAILABLE FOR PICKUP'
    | 'DELIVERED'
    | 'COMPLETED'
    | 'CANCELLED'
    | 'REFUNDED'
    | string;
  items?: OrderEmailItem[];
  subtotal?: number | string;
  shipping?: number | string;
  total: number | string;
  currency?: string;
  deliveryMethod?: string;
  deliveryLocation?: string | null;
  deliveryNotes?: string | null;
  reason?: string | null;
  cancelledBy?: 'buyer' | 'seller' | 'admin';
}

// 5. Order confirmation (buyer)
export const getOrderConfirmationEmail = (
  o: OrderEmailData,
  links: EmailLinks = { baseUrl: 'https://verndly.com' },
) => {
  const isPickup =
    o.deliveryMethod && o.deliveryMethod.trim().toUpperCase().includes('PICKUP');
  const isPaid = Boolean(
    o.isPaid ||
      (o.paymentMethod &&
        !o.paymentMethod.toLowerCase().includes('delivery') &&
        !o.paymentMethod.toLowerCase().includes('cash')),
  );

  const paymentStateText = isPaid
    ? 'We’ve received your payment and notified the store to start preparing your items.'
    : 'Your order has been placed with Pay on Delivery. Please prepare the exact cash or mobile money upon receiving your items.';

  const content = `
    ${renderStatusBanner(isPaid ? 'PAID' : 'CONFIRMED')}
    <p class="email-p" style="margin: 0 0 16px; font-size: 14px; line-height: 1.65; color: #334155;">
      Hi <strong>${escape(o.customerName.split(' ')[0] || o.customerName)}</strong>, thank you for your order with <strong>${escape(o.storeName)}</strong>! ${paymentStateText}
    </p>

    ${renderOrderSummaryCard({
      orderNumber: o.orderNumber,
      date: o.date,
      storeName: o.storeName,
      storeLink: o.storeLink,
      paymentMethod: o.paymentMethod || (isPaid ? 'Paystack' : 'Cash on Delivery'),
      paymentReference: o.paymentReference,
      isPaid,
    })}

    ${renderOrderItemsComponent(o.items, o.currency)}

    ${renderFinancialBreakdown({
      subtotal: o.subtotal,
      shipping: o.shipping,
      total: o.total,
      currency: o.currency,
      totalLabel: isPaid ? 'Total Paid' : 'Total Due upon Delivery',
    })}

    ${renderDeliveryDetailsCard({
      customerName: o.customerName,
      customerPhone: o.customerPhone,
      deliveryMethod: o.deliveryMethod,
      deliveryLocation: o.deliveryLocation,
      deliveryNotes: o.deliveryNotes,
    })}

    ${renderActionButtons({
      primaryLabel: 'Track Your Order',
      primaryHref: `${links.baseUrl}/orders`,
      secondaryLabel: o.storeLink ? `Visit ${o.storeName}` : 'Browse More Products',
      secondaryHref: o.storeLink ? `${links.baseUrl}/s/${o.storeLink}` : `${links.baseUrl}/products`,
    })}
  `;

  return emailShell({
    title: `Order #${o.orderNumber} confirmed — ${o.storeName}`,
    preheader: `Thanks for your order with ${o.storeName}. We'll keep you posted every step of the way.`,
    category: 'Order Confirmation',
    content,
    links,
    footerNote: 'Keep this email for your records. You can track this order anytime from your Verndly account.',
  });
};

// 5b. Payment Receipt (buyer)
export const getPaymentReceiptEmail = (
  o: OrderEmailData & { orderId?: string; transactionId?: string },
  links: EmailLinks = { baseUrl: 'https://verndly.com' },
) => {
  const content = `
    <div style="margin-bottom: 20px;">
      <span style="display: inline-block; padding: 5px 14px; background: #ecfdf5; color: #047857; border: 1px solid #a7f3d0; border-radius: 9999px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em;">
        Official Payment Receipt
      </span>
    </div>

    <h1 style="margin: 0 0 10px; font-size: 22px; font-weight: 700; color: #0f172a; letter-spacing: -0.02em; line-height: 1.25;">
      Payment Received — Order #${escape(o.orderNumber)}
    </h1>
    <p class="email-p" style="margin: 0 0 20px; font-size: 14px; line-height: 1.65; color: #334155;">
      Hi <strong>${escape(o.customerName.split(' ')[0] || o.customerName)}</strong>, your payment to <strong>${escape(o.storeName)}</strong> has been processed and verified via Paystack. Your items are now being prepared for fulfillment.
    </p>

    ${renderOrderSummaryCard({
      orderNumber: o.orderNumber,
      date: o.date,
      storeName: o.storeName,
      storeLink: o.storeLink,
      paymentMethod: o.paymentMethod || 'Paystack (Card / MoMo)',
      paymentReference: o.paymentReference,
      isPaid: true,
    })}

    ${renderOrderItemsComponent(o.items, o.currency)}

    ${renderFinancialBreakdown({
      subtotal: o.subtotal,
      shipping: o.shipping,
      total: o.total,
      currency: o.currency,
      totalLabel: 'Total Paid (Verified)',
    })}

    ${renderDeliveryDetailsCard({
      customerName: o.customerName,
      customerPhone: o.customerPhone,
      deliveryMethod: o.deliveryMethod,
      deliveryLocation: o.deliveryLocation,
      deliveryNotes: o.deliveryNotes,
    })}

    ${renderActionButtons({
      primaryLabel: 'View & Download PDF Receipt',
      primaryHref: `${links.baseUrl}/orders/${o.orderId || ''}?receipt=1`,
      secondaryLabel: o.storeLink ? `Visit ${o.storeName}` : 'Return to Store',
      secondaryHref: o.storeLink ? `${links.baseUrl}/s/${o.storeLink}` : `${links.baseUrl}/orders`,
    })}
  `;

  return emailShell({
    title: `Payment Receipt: Order #${o.orderNumber} — ${o.storeName}`,
    preheader: `Your payment of ${o.currency || 'GH¢'} ${Number(o.total || 0).toFixed(2)} to ${o.storeName} was successful.`,
    category: 'Payment Receipt',
    content,
    links,
    footerNote: `This official receipt is issued by Verndly on behalf of ${o.storeName}. Retain this for your tax and personal records.`,
  });
};

// 6. New order alert (seller)
export const getSellerOrderAlertEmail = (
  o: OrderEmailData,
  links: EmailLinks = { baseUrl: 'https://verndly.com' },
) => {
  const isPickup =
    o.deliveryMethod && o.deliveryMethod.trim().toUpperCase().includes('PICKUP');
  const isPaid = Boolean(
    o.isPaid ||
      (o.paymentMethod &&
        !o.paymentMethod.toLowerCase().includes('delivery') &&
        !o.paymentMethod.toLowerCase().includes('cash')),
  );
  const cleanPhone = o.customerPhone ? o.customerPhone.replace(/[^\d]/g, '') : '';
  const firstName = o.customerName.split(' ')[0] || o.customerName;

  const content = `
    <div style="margin-bottom: 20px;">
      <span style="display: inline-block; padding: 4px 12px; background: #ecfdf5; color: #047857; border: 1px solid #a7f3d0; border-radius: 9999px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em;">
        New Sale Alert
      </span>
    </div>
    <h1 style="margin: 0 0 10px; font-size: 22px; font-weight: 700; color: #0f172a; letter-spacing: -0.02em; line-height: 1.25;">
      You've made a sale!
    </h1>
    <p class="email-p" style="margin: 0 0 16px; font-size: 14px; line-height: 1.65; color: #334155;">
      <strong>${escape(o.customerName)}</strong> just placed order <strong>#${escape(o.orderNumber)}</strong> with your store. Get the package ready for <strong>${isPickup ? 'customer pickup' : 'courier dispatch'}</strong> and update the order status in your dashboard.
    </p>

    ${renderOrderSummaryCard({
      orderNumber: o.orderNumber,
      date: o.date,
      storeName: o.storeName,
      paymentMethod: o.paymentMethod || (isPaid ? 'Paid Online' : 'Cash on Delivery'),
      paymentReference: o.paymentReference,
      isPaid,
    })}

    ${renderDeliveryDetailsCard({
      customerName: o.customerName,
      customerPhone: o.customerPhone,
      deliveryMethod: o.deliveryMethod,
      deliveryLocation: o.deliveryLocation,
      deliveryNotes: o.deliveryNotes,
      isVendorView: true,
    })}

    ${renderOrderItemsComponent(o.items, o.currency)}

    ${renderFinancialBreakdown({
      subtotal: o.subtotal,
      shipping: o.shipping,
      total: o.total,
      currency: o.currency,
      totalLabel: 'Store Order Value',
    })}

    ${renderActionButtons({
      primaryLabel: 'Process Order in Dashboard',
      primaryHref: `${links.baseUrl}/dashboard/orders`,
      whatsAppNumber: cleanPhone,
      whatsAppMessage: `Hello ${firstName}, thank you for your order #${o.orderNumber} with ${o.storeName} on Verndly! We are preparing your items now.`,
    })}
  `;

  return emailShell({
    title: `New sale: Order #${o.orderNumber} from ${o.customerName}`,
    preheader: `${o.customerName} placed order #${o.orderNumber} with your store. Open your dashboard to view and process.`,
    category: 'New Sale Alert',
    content,
    links,
    footerNote: 'Tip: Updating your order status promptly keeps buyers happy and builds trust for your store.',
  });
};

// 7. Order status change (buyer-facing)
export const getOrderStatusEmail = (
  o: OrderStatusEmailData,
  links: EmailLinks = { baseUrl: 'https://verndly.com' },
) => {
  const normStatus = (o.status || '').trim().toUpperCase();
  const cfg = getStatusConfig(normStatus, o.reason);

  const content = `
    ${renderStatusBanner(normStatus, o.reason)}

    ${
      o.reason
        ? `
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0"
      style="background: #fff7ed; border-left: 4px solid #f97316; border-radius: 8px; margin: 16px 0;">
      <tr>
        <td style="padding: 14px 16px; font-size: 13px; line-height: 1.55; color: #9a3412;">
          <strong>Message regarding this update:</strong><br>
          ${escape(o.reason)}
        </td>
      </tr>
    </table>`
        : ''
    }

    ${renderOrderSummaryCard({
      orderNumber: o.orderNumber,
      date: o.date || new Date(),
      storeName: o.storeName,
      storeLink: o.storeLink,
    })}

    ${
      o.items && o.items.length > 0
        ? renderOrderItemsComponent(o.items, o.currency)
        : ''
    }

    ${
      o.total != null
        ? renderFinancialBreakdown({
            subtotal: o.subtotal ?? o.total,
            shipping: o.shipping,
            total: o.total,
            currency: o.currency,
          })
        : ''
    }

    ${
      o.deliveryLocation || o.deliveryMethod
        ? renderDeliveryDetailsCard({
            customerName: o.customerName,
            customerPhone: o.customerPhone,
            deliveryMethod: o.deliveryMethod,
            deliveryLocation: o.deliveryLocation,
            deliveryNotes: o.deliveryNotes,
          })
        : ''
    }

    ${renderActionButtons({
      primaryLabel: 'View Order Details',
      primaryHref: `${links.baseUrl}/orders`,
      secondaryLabel: o.storeLink ? `Visit ${o.storeName}` : 'Browse Marketplace',
      secondaryHref: o.storeLink ? `${links.baseUrl}/s/${o.storeLink}` : `${links.baseUrl}/products`,
    })}
  `;

  return emailShell({
    title: `${cfg.headline} — Order #${o.orderNumber}`,
    preheader: cfg.subtext,
    category: 'Order Status Update',
    content,
    links,
    footerNote: 'You can check your order progress or report any issues from your Verndly dashboard.',
  });
};

// 7b. Order status change (seller-facing, e.g. cancellation)
export const getSellerOrderStatusEmail = (
  o: OrderStatusEmailData,
  links: EmailLinks = { baseUrl: 'https://verndly.com' },
) => {
  const normStatus = (o.status || '').trim().toUpperCase();
  const isCancelled = normStatus === 'CANCELLED';

  const headline = isCancelled
    ? `Order #${o.orderNumber} was cancelled by ${o.cancelledBy === 'buyer' ? 'customer' : 'admin'}`
    : `Order #${o.orderNumber} status changed to ${normStatus}`;

  const subtext = isCancelled
    ? o.reason
      ? `Cancellation reason: "${o.reason}".`
      : 'The customer cancelled this order before it was dispatched.'
    : `The status of order #${o.orderNumber} was updated to ${normStatus}.`;

  const content = `
    <div style="margin-bottom: 20px;">
      <span style="display: inline-block; padding: 4px 12px; background: ${isCancelled ? '#fef2f2' : '#eff6ff'}; color: ${isCancelled ? '#b91c1c' : '#1d4ed8'}; border: 1px solid ${isCancelled ? '#fecaca' : '#bfdbfe'}; border-radius: 9999px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em;">
        ${isCancelled ? 'Order Cancelled' : `Order ${normStatus}`}
      </span>
    </div>
    <h1 style="margin: 0 0 10px; font-size: 22px; font-weight: 700; color: #0f172a; letter-spacing: -0.02em; line-height: 1.25;">
      ${escape(headline)}
    </h1>
    <p class="email-p" style="margin: 0 0 16px; font-size: 14px; line-height: 1.65; color: #475569;">
      ${escape(subtext)}
    </p>

    ${
      isCancelled
        ? `
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0"
      style="background: #f8fafc; border-left: 4px solid #64748b; border-radius: 8px; margin: 16px 0;">
      <tr>
        <td style="padding: 14px 16px; font-size: 12.5px; line-height: 1.55; color: #475569;">
          <strong>Inventory notice:</strong> For Pay on Delivery orders, product quantities have been automatically restored to your active inventory.
        </td>
      </tr>
    </table>`
        : ''
    }

    ${renderOrderSummaryCard({
      orderNumber: o.orderNumber,
      date: o.date || new Date(),
      storeName: o.storeName,
    })}

    ${
      o.items && o.items.length > 0
        ? renderOrderItemsComponent(o.items, o.currency)
        : ''
    }

    ${
      o.total != null
        ? renderFinancialBreakdown({
            subtotal: o.subtotal ?? o.total,
            shipping: o.shipping,
            total: o.total,
            currency: o.currency,
            totalLabel: 'Store Total',
          })
        : ''
    }

    ${renderActionButtons({
      primaryLabel: 'Open Orders Dashboard',
      primaryHref: `${links.baseUrl}/dashboard/orders`,
    })}
  `;

  return emailShell({
    title: `${headline} — Verndly Store Alert`,
    preheader: subtext,
    category: 'Store Order Alert',
    content,
    links,
    footerNote: 'Manage your store orders, payouts, and customer communications from your Verndly dashboard.',
  });
};

// ─── Seller lifecycle ────────────────────────────────────────────────────────

// 8. Seller verification approved → welcome to selling
export const getSellerApprovedEmail = (
  name: string,
  storeLink: string,
  links: EmailLinks = { baseUrl: 'https://verndly.com' },
) =>
  shell({
    title: "You're approved to sell on Verndly",
    preheader: 'Your store is live. Time to add your first product.',
    content: `
      <div style="margin-bottom:16px;">${statusPill('Approved', 'success')}</div>
      ${eyebrow('Verification approved')}
      ${H1(`You're a verified seller, ${escape(name.split(' ')[0] || name)}.`)}
      ${P(`Welcome to Verndly. Your store is live at <a href="${links.baseUrl}/s/${escape(storeLink)}" style="color:${BRAND.primary};">${links.baseUrl.replace(/^https?:\/\//, '')}/s/${escape(storeLink)}</a>.`)}
      ${button('Open your dashboard', `${links.baseUrl}/dashboard`)}
      ${divider()}
      <p style="margin:0 0 8px; font-size:13px; color:${BRAND.muted};">First moves:</p>
      <ul style="margin:0 0 16px; padding-left:18px; color:#3f3f46; font-size:13.5px; line-height:1.8;">
        <li><strong>Add your first product</strong> — clear photos, an honest description, a fair price</li>
        <li><strong>Polish your storefront</strong> — upload a logo, set your service area and delivery times</li>
        <li><strong>Configure payouts</strong> — link your bank or mobile money in Settings</li>
        <li><strong>Consider Pro</strong> — GH₵57/month unlocks featured placement and stock alerts</li>
      </ul>
      <p style="margin:0; font-size:13px; color:${BRAND.muted};">Pro tip: sellers who upload at least 3 products in week one make their first sale 4× faster.</p>
    `,
  });

// 9. Seller verification rejected
export const getSellerRejectedEmail = (
  name: string,
  reason?: string,
  links: EmailLinks = { baseUrl: 'https://verndly.com' },
) =>
  shell({
    title: 'Your seller application needs another look',
    preheader: 'We couldn\'t approve your application this time.',
    content: `
      <div style="margin-bottom:16px;">${statusPill('Not approved', 'error')}</div>
      ${eyebrow('Verification update')}
      ${H1(`We need a bit more from you, ${escape(name.split(' ')[0] || name)}.`)}
      ${P(`Thanks for applying to sell on Verndly. Unfortunately we weren't able to approve your application this round.`)}
      ${reason ? card(`<p style="margin:0; font-size:13px;"><strong>Reviewer note:</strong> ${escape(reason)}</p>`, '#dc2626') : ''}
      ${P(`You're welcome to reapply once you've addressed the points above. Take your time — a strong application moves faster on the next round.`)}
      ${button('Resubmit your application', `${links.baseUrl}/seller-verification`)}
      ${secondaryButton('Talk to support', `mailto:${BRAND.supportEmail}`)}
    `,
  });

// 10. Pro subscription activated / extended
export interface ProActivatedData {
  name: string;
  proExpiresAt: string | Date;
  amountPaid: number | string;
  reference?: string;
  isExtension?: boolean;
}

export const getProActivatedEmail = (
  d: ProActivatedData,
  links: EmailLinks = { baseUrl: 'https://verndly.com' },
) =>
  shell({
    title: d.isExtension ? 'Verndly Pro extended' : 'Welcome to Verndly Pro',
    preheader: `Pro perks unlock right now. Your membership runs through ${formatDate(d.proExpiresAt)}.`,
    content: `
      <div style="margin-bottom:16px;">${statusPill('Pro active', 'success')}</div>
      ${eyebrow(d.isExtension ? 'Membership extended' : 'Welcome to Pro')}
      ${H1(d.isExtension ? `Pro is extended through ${formatDate(d.proExpiresAt)}.` : `Welcome to Verndly Pro, ${escape(d.name.split(' ')[0] || d.name)}.`)}
      ${P(`Your Pro perks are live right now. Use them to ship more, sell faster, and stand out in search.`)}
      ${card(`
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
          ${kvRow('Plan', 'Verndly Pro')}
          ${kvRow('Amount', money(d.amountPaid))}
          ${d.reference ? kvRow('Reference', `<span style="font-family: ui-monospace, monospace; font-size:12px;">${escape(d.reference)}</span>`) : ''}
          ${kvRow('Active until', escape(formatDate(d.proExpiresAt)))}
        </table>
      `)}
      <p style="margin:0 0 12px; font-size:13px; color:${BRAND.muted};">What's included:</p>
      <ul style="margin:0 0 20px; padding-left:18px; color:#3f3f46; font-size:13.5px; line-height:1.8;">
        <li><strong>Featured placement</strong> in category lists and the homepage Pro rail</li>
        <li><strong>Storefront QR code</strong> — printable, downloadable</li>
        <li><strong>Stock + sales analytics</strong> with full history</li>
        <li><strong>Priority support</strong> response within 4 hours</li>
      </ul>
      ${button('Open your dashboard', `${links.baseUrl}/dashboard`)}
    `,
    footerNote: 'Need a receipt or VAT invoice? Reply to this email and we\'ll send one.',
  });

// 11. Pro subscription expiring soon (3 days)
export const getProExpiringEmail = (
  name: string,
  expiresAt: string | Date,
  links: EmailLinks = { baseUrl: 'https://verndly.com' },
) =>
  shell({
    title: 'Your Verndly Pro membership expires soon',
    preheader: `Renew before ${formatDate(expiresAt)} to keep your Pro perks active.`,
    content: `
      <div style="margin-bottom:16px;">${statusPill('Expiring soon', 'warning')}</div>
      ${eyebrow('Renew Pro')}
      ${H1(`Your Pro membership expires ${formatDate(expiresAt)}.`)}
      ${P(`Hi ${escape(name.split(' ')[0] || name)} — your Verndly Pro membership ends in a few days. Renew now to keep featured placement, stock alerts, and your QR code active without a gap.`)}
      ${button('Renew for GH₵57', `${links.baseUrl}/dashboard/settings`)}
      ${secondaryButton('Compare plans', `${links.baseUrl}/help`)}
    `,
  });

// 12. Payout Receipt (seller)
export interface PayoutEmailData {
  storeName: string;
  sellerName?: string;
  amount: number | string;
  currency?: string;
  reference: string;
  providerRef?: string;
  bankName?: string;
  accountNumber?: string;
  accountLastFour?: string;
  mode?: 'AUTO' | 'MANUAL' | string;
  grossAmount?: number | string;
  platformFee?: number | string;
  orderNumber?: string;
  orderId?: string;
  storeLink?: string;
  processedAt: string | Date;
}

export const getPayoutSentEmail = (
  d: PayoutEmailData,
  links: EmailLinks = { baseUrl: 'https://verndly.com' },
) => {
  const curr = d.currency || 'GHS';
  const formattedAmount = money(d.amount, curr);
  const formattedDate = formatDateTime(d.processedAt || new Date());
  const destinationText = d.bankName
    ? `${d.bankName} ${d.accountLastFour ? `(•••• ${d.accountLastFour})` : ''}`
    : d.accountLastFour
      ? `Account ending in •••• ${d.accountLastFour}`
      : 'Linked Payout Account';

  const channelText =
    d.mode === 'AUTO'
      ? 'Automated Split Transfer (Paystack)'
      : 'Direct Settlement Disbursement';

  const grossNum = d.grossAmount ? Number(d.grossAmount) : null;
  const feeNum =
    d.platformFee != null
      ? Number(d.platformFee)
      : grossNum != null
        ? Number((grossNum * 0.04).toFixed(2))
        : null;

  const content = `
    <div style="margin-bottom: 20px;">
      <span style="display: inline-block; padding: 5px 14px; background: #ecfdf5; color: #047857; border: 1px solid #a7f3d0; border-radius: 9999px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em;">
        Official Settlement Receipt
      </span>
    </div>

    <h1 style="margin: 0 0 10px; font-size: 22px; font-weight: 700; color: #0f172a; letter-spacing: -0.02em; line-height: 1.25;">
      Disbursement Confirmed — ${formattedAmount}
    </h1>
    <p class="email-p" style="margin: 0 0 20px; font-size: 14px; line-height: 1.65; color: #334155;">
      Hello <strong>${escape(d.sellerName || d.storeName)}</strong>, your payout for <strong>${escape(d.storeName)}</strong> has been processed successfully and transferred to your account.
    </p>

    <!-- Receipt Details Card -->
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0"
      style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; margin: 20px 0 24px;">
      <tr>
        <td style="padding: 18px 20px;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
            <tr>
              <td style="padding: 6px 0; font-size: 12px; font-weight: 600; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em; width: 40%;">
                Receipt ID
              </td>
              <td align="right" style="padding: 6px 0; font-size: 13px; font-weight: 600; font-family: ui-monospace, monospace; color: #0f172a;">
                REC-${escape(d.reference.replace(/[^A-Za-z0-9]/g, '').slice(-10).toUpperCase())}
              </td>
            </tr>
            <tr>
              <td style="padding: 6px 0; font-size: 12px; font-weight: 600; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em;">
                Payout Reference
              </td>
              <td align="right" style="padding: 6px 0; font-size: 12.5px; font-family: ui-monospace, monospace; color: #0f172a;">
                ${escape(d.reference)}
              </td>
            </tr>
            ${
              d.providerRef
                ? `
            <tr>
              <td style="padding: 6px 0; font-size: 12px; font-weight: 600; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em;">
                Transfer Code
              </td>
              <td align="right" style="padding: 6px 0; font-size: 12.5px; font-family: ui-monospace, monospace; color: #0f172a;">
                ${escape(d.providerRef)}
              </td>
            </tr>`
                : ''
            }
            <tr>
              <td style="padding: 6px 0; font-size: 12px; font-weight: 600; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em;">
                Disbursed At
              </td>
              <td align="right" style="padding: 6px 0; font-size: 13px; font-weight: 500; color: #0f172a;">
                ${escape(formattedDate)}
              </td>
            </tr>
            <tr>
              <td style="padding: 6px 0; font-size: 12px; font-weight: 600; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em;">
                Destination
              </td>
              <td align="right" style="padding: 6px 0; font-size: 13px; font-weight: 600; color: #0f172a;">
                ${escape(destinationText)}
              </td>
            </tr>
            <tr>
              <td style="padding: 6px 0; font-size: 12px; font-weight: 600; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em;">
                Settlement Channel
              </td>
              <td align="right" style="padding: 6px 0; font-size: 12.5px; font-weight: 500; color: #0f172a;">
                ${escape(channelText)}
              </td>
            </tr>
            ${
              d.orderNumber
                ? `
            <tr>
              <td style="padding: 6px 0; font-size: 12px; font-weight: 600; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em;">
                Associated Order
              </td>
              <td align="right" style="padding: 6px 0; font-size: 13px; font-weight: 600; color: #0f172a;">
                ${escape(d.orderNumber)}
              </td>
            </tr>`
                : ''
            }
          </table>
        </td>
      </tr>
    </table>

    <!-- Financial Breakdown Box -->
    <div style="margin: 20px 0 24px; padding: 16px 20px; border-radius: 12px; background: #ffffff; border: 1px solid #e2e8f0;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
        ${
          grossNum != null
            ? `
        <tr>
          <td style="padding: 6px 0; font-size: 13px; color: #64748b;">Gross Order Volume</td>
          <td align="right" style="padding: 6px 0; font-size: 13px; font-weight: 500; color: #0f172a;">
            ${money(grossNum, curr)}
          </td>
        </tr>
        <tr>
          <td style="padding: 6px 0; font-size: 13px; color: #64748b;">Verndly Platform Commission (4%)</td>
          <td align="right" style="padding: 6px 0; font-size: 13px; font-weight: 500; color: #ef4444;">
            - ${money(feeNum ?? 0, curr)}
          </td>
        </tr>
        <tr>
          <td colspan="2" style="padding: 8px 0;">
            <div style="height: 1px; background: #e2e8f0;"></div>
          </td>
        </tr>`
            : ''
        }
        <tr>
          <td style="padding: 8px 0; font-size: 14.5px; font-weight: 700; color: #0f172a;">
            Net Disbursed (96%)
          </td>
          <td align="right" style="padding: 8px 0; font-size: 20px; font-weight: 800; color: #047857; letter-spacing: -0.02em;">
            ${formattedAmount}
          </td>
        </tr>
      </table>
    </div>

    <!-- Settlement Notice -->
    <div style="margin: 20px 0 24px; padding: 14px 18px; border-radius: 10px; background: #f8fafc; border: 1px solid #e2e8f0; font-size: 12.5px; color: #475569; line-height: 1.6;">
      <strong>Settlement Notice:</strong> Mobile Money transfers are typically credited immediately. Interbank transfers may require 1 to 2 business days to clear depending on your financial institution's processing schedule.
    </div>

    ${renderActionButtons({
      primaryLabel: 'View in Seller Dashboard',
      primaryHref: `${links.baseUrl}/dashboard/transactions`,
      secondaryLabel: d.storeLink ? `Visit ${d.storeName}` : 'Seller Dashboard',
      secondaryHref: d.storeLink ? `${links.baseUrl}/s/${d.storeLink}` : `${links.baseUrl}/dashboard`,
    })}
  `;

  return emailShell({
    title: `Payout Receipt: ${formattedAmount} — ${d.storeName}`,
    preheader: `Your payout of ${formattedAmount} for ${d.storeName} has been processed and transferred.`,
    category: 'Payout Receipt',
    content,
    links,
    footerNote: `This official payout receipt confirms the disbursement of funds from Verndly to your linked account. Retain this record for your business accounting and reconciliation.`,
  });
};

export const getPayoutReceiptEmail = getPayoutSentEmail;

// 13. Low-stock alert (seller)
export const getLowStockEmail = (
  storeName: string,
  product: { id: string; title: string; quantity: number; image_url?: string | null },
  links: EmailLinks = { baseUrl: 'https://verndly.com' },
) =>
  shell({
    title: `Low stock — ${product.title}`,
    preheader: `Only ${product.quantity} left of ${product.title}. Restock to keep selling.`,
    content: `
      <div style="margin-bottom:16px;">${statusPill('Low stock', 'warning')}</div>
      ${eyebrow('Inventory alert')}
      ${H1(`Only ${product.quantity} left of "${escape(product.title)}".`)}
      ${P(`Your bestseller is running low. Top up the stock count to avoid losing sales when it goes to zero.`)}
      ${card(`
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
          ${kvRow('Store', escape(storeName))}
          ${kvRow('Product', escape(product.title))}
          ${kvRow('Stock remaining', `<span style="color:#c2410c;">${product.quantity}</span>`)}
        </table>
      `)}
      ${button('Update stock', `${links.baseUrl}/dashboard/products/edit/${product.id}`)}
    `,
  });

// 14. Account suspended / warning
export const getAccountSuspendedEmail = (name: string, reason: string) =>
  shell({
    title: 'Notice of account restriction — Verndly Trust & Safety',
    preheader: 'Your Verndly account has been temporarily restricted pending compliance review.',
    category: 'Account Notice',
    content: `
      <div style="margin-bottom: 18px;">${statusPill('Account Restricted', 'error')}</div>
      ${eyebrow('Verndly Trust & Safety • Enforcement Notice')}
      ${H1('Notice of account restriction')}
      ${P(`Hello ${escape(name.split(' ')[0] || name)},`)}
      ${P(`In accordance with the Verndly Terms of Service and Merchant Trust Policies, your Verndly account access has been temporarily restricted pending review.`)}

      ${card(`
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
          ${kvRow('Account status', '<span style="color: #dc2626; font-weight: 600;">Temporarily Restricted</span>')}
          ${kvRow('Review basis', escape(reason))}
          ${kvRow('Effective date', `${formatDate(new Date())}`)}
          ${kvRow('Impact', 'Storefront visibility, checkout, and payouts paused')}
        </table>
      `, '#dc2626')}

      ${P(`While this restriction is active, you will not be able to publish new products, accept incoming customer orders, or modify settlement payout settings.`)}

      ${callout(`
        <p class="email-p" style="margin: 0 0 8px; font-size: 13px; font-weight: 600; color: #0f172a;">
          Appeals and resolution process
        </p>
        <p class="email-p" style="margin: 0; font-size: 12.5px; line-height: 1.65; color: #475569;">
          If you believe this determination was made in error or if you have resolved the underlying issue, you may submit an appeal for reconsideration. Please reply directly to this notification or contact our compliance team at <a href="mailto:${BRAND.supportEmail}" style="color: #0284c7; text-decoration: none;">${BRAND.supportEmail}</a> with your merchant credentials. Cases are typically evaluated within 2 business days.
        </p>
      `, 'neutral')}

      ${secondaryButton('Contact Trust & Safety', `mailto:${BRAND.supportEmail}`)}
    `,
    footerNote: 'This is an official administrative notice from the Verndly Trust & Safety Team.',
  });

// 15. Contact Form Admin Alert
export const getContactFormAdminAlertEmail = (
  d: { name: string; email: string; subject: string; message: string },
) =>
  shell({
    title: `New Contact Request: ${d.subject}`,
    preheader: `Message from ${d.name} (${d.email})`,
    content: `
      <div style="margin-bottom:16px;">${statusPill('New message', 'info')}</div>
      ${eyebrow('Contact Form')}
      ${H1(`New message from ${escape(d.name)}`)}
      ${card(`
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
          ${kvRow('Name', escape(d.name))}
          ${kvRow('Email', escape(d.email))}
          ${kvRow('Subject', escape(d.subject))}
        </table>
      `)}
      <div style="padding: 16px; background: ${BRAND.background}; border-radius: 8px; margin-top: 16px;">
        <p style="margin:0; font-size:14px; line-height:1.6; white-space:pre-wrap;">${escape(d.message)}</p>
      </div>
      ${button('Reply to ' + escape(d.name), `mailto:${escape(d.email)}`)}
    `,
  });

export const getSellerVerificationAdminAlertEmail = (
  d: {
    userName: string;
    userEmail: string;
    userPhone?: string | null;
    type: string;
    verificationData: string;
    submittedAt: Date;
  },
  links: EmailLinks = { baseUrl: 'https://verndly.com' },
) =>
  shell({
    title: `New seller verification: ${d.userName}`,
    preheader: `${d.userName} submitted a ${d.type} verification request`,
    content: `
      <div style="margin-bottom:16px;">${statusPill('Pending review', 'warning')}</div>
      ${eyebrow('Seller Verification')}
      ${H1(`New verification request`)}
      ${P(`${escape(d.userName)} just submitted a seller verification request. Review it in the admin dashboard.`)}
      ${card(`
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
          ${kvRow('Name', escape(d.userName))}
          ${kvRow('Email', escape(d.userEmail))}
          ${kvRow('Phone', escape(d.userPhone || '—'))}
          ${kvRow('Method', escape(d.type))}
          ${kvRow('Submitted', escape(d.submittedAt.toISOString()))}
          ${kvRow('Data', escape(d.verificationData || '—'))}
        </table>
      `)}
      ${button('Review in dashboard', `${links.baseUrl}/verndly/verifications`)}
    `,
  });

// 16. Newsletter Welcome
export const getNewsletterWelcomeEmail = (
  email: string,
  links: EmailLinks = { baseUrl: 'https://verndly.com' },
) =>
  shell({
    title: 'Welcome to the Verndly Newsletter',
    preheader: 'You are on the list for updates, deals, and seller tips.',
    content: `
      <div style="margin-bottom:16px;">${statusPill('Subscribed', 'success')}</div>
      ${eyebrow('Newsletter')}
      ${H1(`You're on the list.`)}
      ${P(`Thanks for subscribing to the Verndly newsletter. We'll keep you posted with the latest updates, special deals, and tips to grow your business.`)}
      ${button('Start exploring', `${links.baseUrl}/products`)}
    `,
  });

