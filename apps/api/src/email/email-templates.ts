/**
 * Vendly transactional email templates.
 *
 * Conventions:
 * - Inline styles only (most email clients strip <style>).
 * - Table-based layout for Outlook compatibility.
 * - Each template returns a complete HTML string.
 * - Every export accepts a typed data object and a `links` object with the
 *   storefront URL — templates avoid hard-coding domains so dev/prod can
 *   point at the right place via FRONTEND_URL.
 */

// ─── Brand tokens ────────────────────────────────────────────────────────────

const BRAND = {
  name: 'Vendly',
  tagline: 'For young entrepreneurs and small businesses',
  logo: 'https://vendly-omega.vercel.app/logos/vendly.png',
  supportEmail: 'support@vendly.com',
  whatsapp: '+233 24 000 0000',
  primary: '#ff6b00',
  text: '#0a0a0a',
  muted: '#6b7280',
  border: '#e5e7eb',
  surface: '#f9fafb',
  background: '#f3f4f6',
};

export interface EmailLinks {
  /** e.g. https://vendly.com — no trailing slash */
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
<table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin: 24px 0;">
  <tr>
    <td align="center" style="border-radius: 10px; background:${color};">
      <a href="${escape(href)}"
        style="display:inline-block; padding:14px 28px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; font-size:14px; color:#ffffff; text-decoration:none; border-radius:10px;">
        ${escape(label)}
      </a>
    </td>
  </tr>
</table>`;

const secondaryButton = (label: string, href: string): string => `
<a href="${escape(href)}"
  style="display:inline-block; padding:12px 22px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; font-size:13px; color:${BRAND.text}; text-decoration:none; border:1px solid ${BRAND.border}; border-radius:10px; margin-top:8px;">
  ${escape(label)}
</a>`;

const card = (inner: string, accent?: string): string => `
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0"
  style="background:${BRAND.surface}; border:1px solid ${BRAND.border};
  ${accent ? `border-left:3px solid ${accent};` : ''}
  border-radius:14px; margin:24px 0;">
  <tr><td style="padding:20px 22px;">${inner}</td></tr>
</table>`;

const kvRow = (label: string, value: string): string => `
<tr>
  <td style="padding:6px 0; font-size:12px; color:${BRAND.muted}; text-transform:uppercase; letter-spacing:0.04em;">${escape(label)}</td>
  <td style="padding:6px 0; font-size:14px; color:${BRAND.text}; text-align:right;">${value}</td>
</tr>`;

const divider = (): string => `
<div style="height:1px; background:${BRAND.border}; margin:20px 0;"></div>`;

const statusPill = (
  label: string,
  variant: 'success' | 'pending' | 'warning' | 'error' | 'info' = 'info',
): string => {
  const palette = {
    success: { bg: '#ecfdf5', fg: '#059669' },
    pending: { bg: '#fef3c7', fg: '#b45309' },
    warning: { bg: '#fff7ed', fg: '#c2410c' },
    error: { bg: '#fef2f2', fg: '#dc2626' },
    info: { bg: '#eff6ff', fg: '#1d4ed8' },
  }[variant];
  return `<span style="display:inline-block; padding:4px 10px; background:${palette.bg}; color:${palette.fg}; font-size:11px; text-transform:uppercase; letter-spacing:0.06em; border-radius:9999px;">${escape(label)}</span>`;
};

const orderItemsTable = (
  items: Array<{ title: string; quantity: number; price: number | string; image_url?: string | null }>,
  currency = 'GHS',
): string => `
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:8px 0 24px;">
  <thead>
    <tr>
      <th align="left" style="font-size:11px; color:${BRAND.muted}; text-transform:uppercase; letter-spacing:0.06em; padding:8px 0; border-bottom:1px solid ${BRAND.border};">Item</th>
      <th align="center" style="font-size:11px; color:${BRAND.muted}; text-transform:uppercase; letter-spacing:0.06em; padding:8px 0; border-bottom:1px solid ${BRAND.border};">Qty</th>
      <th align="right" style="font-size:11px; color:${BRAND.muted}; text-transform:uppercase; letter-spacing:0.06em; padding:8px 0; border-bottom:1px solid ${BRAND.border};">Price</th>
    </tr>
  </thead>
  <tbody>
    ${items
      .map(
        (it) => `
    <tr>
      <td style="padding:14px 0; border-bottom:1px solid ${BRAND.border}; font-size:14px; color:${BRAND.text};">
        ${
          it.image_url
            ? `<table role="presentation" cellspacing="0" cellpadding="0" border="0"><tr>
                 <td style="padding-right:12px;"><img src="${escape(it.image_url)}" width="48" height="48" alt="" style="border-radius:8px; display:block; object-fit:cover;"></td>
                 <td>${escape(it.title)}</td>
               </tr></table>`
            : escape(it.title)
        }
      </td>
      <td align="center" style="padding:14px 0; border-bottom:1px solid ${BRAND.border}; font-size:14px; color:${BRAND.text};">${it.quantity}</td>
      <td align="right" style="padding:14px 0; border-bottom:1px solid ${BRAND.border}; font-size:14px; color:${BRAND.text};">${money(Number(it.price) * it.quantity, currency)}</td>
    </tr>`,
      )
      .join('')}
  </tbody>
</table>`;

const totalRow = (label: string, value: string, emphasis = false): string => `
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
  <tr>
    <td style="font-size:${emphasis ? '15px' : '13px'}; color:${emphasis ? BRAND.text : BRAND.muted}; padding:6px 0;">${escape(label)}</td>
    <td align="right" style="font-size:${emphasis ? '18px' : '13px'}; color:${BRAND.text}; padding:6px 0;">${value}</td>
  </tr>
</table>`;

// ─── Shell ───────────────────────────────────────────────────────────────────

interface ShellOptions {
  title: string;
  preheader?: string;
  content: string;
  footerNote?: string;
}

const shell = ({ title, preheader, content, footerNote }: ShellOptions): string => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="x-apple-disable-message-reformatting">
  <title>${escape(title)}</title>
</head>
<body style="margin:0; padding:0; background:${BRAND.background}; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color:${BRAND.text};">
  ${preheader ? `<div style="display:none; max-height:0; overflow:hidden; mso-hide:all;">${escape(preheader)}</div>` : ''}
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:${BRAND.background};">
    <tr>
      <td align="center" style="padding:32px 16px;">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" style="max-width:600px; width:100%; background:#ffffff; border-radius:18px; overflow:hidden; box-shadow:0 1px 3px rgba(0,0,0,0.06);">

          <tr>
            <td style="padding:28px 32px; border-bottom:1px solid ${BRAND.border};">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td>
                    <a href="https://vendly.com" style="text-decoration:none; color:${BRAND.text};">
                      <img src="${BRAND.logo}" alt="Vendly" width="32" height="32" style="vertical-align:middle; border-radius:6px;">
                      <span style="font-size:18px; vertical-align:middle; margin-left:10px; letter-spacing:-0.01em;">Vendly</span>
                    </a>
                  </td>
                  <td align="right" style="font-size:11px; color:${BRAND.muted};">${escape(BRAND.tagline)}</td>
                </tr>
              </table>
            </td>
          </tr>

          <tr>
            <td style="padding:36px 32px 24px;">
              ${content}
            </td>
          </tr>

          <tr>
            <td style="padding:24px 32px 36px; background:${BRAND.surface}; border-top:1px solid ${BRAND.border};">
              ${
                footerNote
                  ? `<p style="font-size:12px; color:${BRAND.muted}; margin:0 0 12px;">${footerNote}</p>`
                  : ''
              }
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td style="font-size:11px; color:${BRAND.muted}; line-height:1.7;">
                    Questions? Email
                    <a href="mailto:${BRAND.supportEmail}" style="color:${BRAND.primary}; text-decoration:none;">${BRAND.supportEmail}</a>
                    · WhatsApp ${BRAND.whatsapp}
                  </td>
                </tr>
                <tr>
                  <td style="padding-top:14px; font-size:11px; color:${BRAND.muted};">
                    © ${new Date().getFullYear()} Vendly. All rights reserved.<br>
                    You received this email because you have an account with Vendly.
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
  `<h1 style="margin:0 0 12px; font-size:22px; color:${BRAND.text}; letter-spacing:-0.015em;">${escape(text)}</h1>`;

const P = (text: string) =>
  `<p style="margin:0 0 16px; font-size:14px; line-height:1.65; color:#3f3f46;">${text}</p>`;

const eyebrow = (text: string) =>
  `<p style="margin:0 0 12px; font-size:11px; color:${BRAND.primary}; text-transform:uppercase; letter-spacing:0.1em;">${escape(text)}</p>`;

// ═══════════════════════════════════════════════════════════════════════════
//   TEMPLATES
// ═══════════════════════════════════════════════════════════════════════════

// 1. Welcome (buyer)
export const getWelcomeEmail = (name: string, links: EmailLinks = { baseUrl: 'https://vendly.com' }) =>
  shell({
    title: `Welcome to Vendly, ${name}`,
    preheader: `You're in. Here's how to get the most out of Vendly.`,
    content: `
      ${eyebrow('Welcome')}
      ${H1(`Welcome to Vendly, ${escape(name.split(' ')[0] || name)}.`)}
      ${P(`Vendly is the curated marketplace for verified young entrepreneurs and small businesses across Ghana. You can shop, save your favourites, and (whenever you're ready) open your own storefront.`)}
      ${button('Start exploring', `${links.baseUrl}/products`)}
      ${divider()}
      <p style="margin:0 0 8px; font-size:13px; color:${BRAND.muted};">A quick tour:</p>
      <ul style="margin:0 0 16px; padding-left:18px; color:#3f3f46; font-size:13.5px; line-height:1.8;">
        <li><strong>Discover</strong> — browse categories, brands, and top deals on the homepage</li>
        <li><strong>Trust</strong> — every seller is verified, payments are processed through Paystack</li>
        <li><strong>Track</strong> — every order lives under <a href="${links.baseUrl}/orders" style="color:${BRAND.primary};">My orders</a> with live status updates</li>
        <li><strong>Sell</strong> — when you're ready, <a href="${links.baseUrl}/seller-verification" style="color:${BRAND.primary};">open your storefront</a> in under 60 seconds</li>
      </ul>
    `,
  });

// 2. Email verification
export const getVerificationEmail = (url: string) =>
  shell({
    title: 'Verify your Vendly email',
    preheader: 'Confirm your email so we can secure your account.',
    content: `
      ${eyebrow('Confirm email')}
      ${H1('Verify your email address')}
      ${P(`Tap the button below to confirm this is your email. The link expires in 24 hours.`)}
      ${button('Verify email', url)}
      ${P(`If the button doesn't work, copy and paste this link into your browser:<br><a href="${escape(url)}" style="color:${BRAND.primary}; word-break:break-all;">${escape(url)}</a>`)}
      ${divider()}
      <p style="font-size:12px; color:${BRAND.muted};">Didn't sign up for Vendly? You can safely ignore this email — no account will be created without verification.</p>
    `,
  });

// 3. Password reset request
export const getPasswordResetEmail = (url: string) =>
  shell({
    title: 'Reset your Vendly password',
    preheader: 'A password reset was requested for your account.',
    content: `
      ${eyebrow('Reset password')}
      ${H1('Reset your password')}
      ${P(`We got a request to reset your Vendly password. Tap below to choose a new one. The link expires in 60 minutes.`)}
      ${button('Reset password', url)}
      ${P(`If the button doesn't work, copy and paste this link into your browser:<br><a href="${escape(url)}" style="color:${BRAND.primary}; word-break:break-all;">${escape(url)}</a>`)}
      ${divider()}
      <p style="font-size:12px; color:${BRAND.muted};">Didn't request this? Your account is still safe — you can ignore this email. If this keeps happening, contact ${BRAND.supportEmail}.</p>
    `,
  });

// 4. Password changed confirmation
export const getPasswordChangedEmail = (name: string) =>
  shell({
    title: 'Your Vendly password was changed',
    preheader: 'Your account password was just updated.',
    content: `
      ${eyebrow('Security notice')}
      ${H1('Your password was changed')}
      ${P(`Hi ${escape(name.split(' ')[0] || name)}, this is a confirmation that your Vendly password was just updated at ${formatDateTime(new Date())}.`)}
      ${card(
        `<p style="margin:0; font-size:13px; color:${BRAND.text};"><strong>Didn't change your password?</strong><br>Email <a href="mailto:${BRAND.supportEmail}" style="color:${BRAND.primary};">${BRAND.supportEmail}</a> immediately and we'll secure your account.</p>`,
        '#dc2626',
      )}
    `,
  });

// ─── Order lifecycle ─────────────────────────────────────────────────────────

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
  items: Array<{
    title: string;
    quantity: number;
    price: number | string;
    image_url?: string | null;
  }>;
  subtotal: number | string;
  shipping?: number | string;
  total: number | string;
  currency?: string;
  paymentMethod?: string;
  paymentReference?: string;
}

const renderOrderSummaryBlock = (o: OrderEmailData): string => {
  const currency = o.currency || 'GHS';
  return `
    ${card(`
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
        ${kvRow('Order ID', `<span style="font-family: ui-monospace, SFMono-Regular, Menlo, monospace;">${escape(o.orderNumber)}</span>`)}
        ${kvRow('Placed', escape(formatDateTime(o.date)))}
        ${o.storeName ? kvRow('Store', escape(o.storeName)) : ''}
        ${o.paymentMethod ? kvRow('Payment', escape(o.paymentMethod)) : ''}
        ${o.paymentReference ? kvRow('Reference', `<span style="font-family: ui-monospace, monospace; font-size:12px;">${escape(o.paymentReference)}</span>`) : ''}
      </table>
    `)}

    ${orderItemsTable(o.items, currency)}

    <div style="padding:0 4px;">
      ${o.subtotal != null ? totalRow('Subtotal', money(o.subtotal, currency)) : ''}
      ${o.shipping != null ? totalRow('Delivery', money(o.shipping, currency)) : ''}
      ${divider()}
      ${totalRow('Total paid', money(o.total, currency), true)}
    </div>

    ${
      o.deliveryMethod || o.deliveryLocation
        ? card(`
            <p style="margin:0 0 8px; font-size:11px; color:${BRAND.muted}; text-transform:uppercase; letter-spacing:0.06em;">
              ${o.deliveryMethod === 'PICKUP' ? 'Pickup details' : 'Delivery to'}
            </p>
            ${o.customerName ? `<p style="margin:0 0 2px; font-size:14px; color:${BRAND.text};">${escape(o.customerName)}</p>` : ''}
            ${o.customerPhone ? `<p style="margin:0 0 2px; font-size:13px; color:${BRAND.muted};">${escape(o.customerPhone)}</p>` : ''}
            ${o.deliveryLocation ? `<p style="margin:0; font-size:13px; color:${BRAND.muted};">${escape(o.deliveryLocation)}</p>` : ''}
            ${o.deliveryNotes ? `<p style="margin:8px 0 0; font-size:12px; color:${BRAND.muted}; font-style:italic;">"${escape(o.deliveryNotes)}"</p>` : ''}
          `)
        : ''
    }
  `;
};

// 5. Order confirmation (buyer)
export const getOrderConfirmationEmail = (
  o: OrderEmailData,
  links: EmailLinks = { baseUrl: 'https://vendly.com' },
) =>
  shell({
    title: `Order #${o.orderNumber} confirmed`,
    preheader: `Thanks ${o.customerName.split(' ')[0] || ''} — we'll keep you posted as your order moves.`,
    content: `
      <div style="margin-bottom:16px;">${statusPill('Order confirmed', 'success')}</div>
      ${H1(`Thanks for your order, ${escape(o.customerName.split(' ')[0] || o.customerName)}.`)}
      ${P(`We've received your payment and let ${escape(o.storeName)} know to start preparing it. We'll email you again the moment it's dispatched.`)}
      ${renderOrderSummaryBlock(o)}
      ${button('Track your order', `${links.baseUrl}/orders`)}
      ${o.storeLink ? secondaryButton('Visit the store', `${links.baseUrl}/s/${o.storeLink}`) : ''}
    `,
    footerNote: 'Keep this email for your records. You can also view this order any time from My orders.',
  });

// 6. New order alert (seller)
export const getSellerOrderAlertEmail = (
  o: OrderEmailData,
  links: EmailLinks = { baseUrl: 'https://vendly.com' },
) =>
  shell({
    title: `New order #${o.orderNumber}`,
    preheader: `${o.customerName} just placed an order with your store.`,
    content: `
      <div style="margin-bottom:16px;">${statusPill('New order', 'success')}</div>
      ${H1(`You've made a sale.`)}
      ${P(`<strong>${escape(o.customerName)}</strong> just placed an order with your store. Get it ready for ${o.deliveryMethod === 'PICKUP' ? 'pickup' : 'dispatch'} and update the status from your dashboard.`)}
      ${renderOrderSummaryBlock(o)}
      ${button('Process this order', `${links.baseUrl}/dashboard/orders`)}
      ${
        o.customerPhone
          ? secondaryButton(
              `WhatsApp ${o.customerName.split(' ')[0] || 'customer'}`,
              `https://wa.me/${o.customerPhone.replace(/[^\d]/g, '')}`,
            )
          : ''
      }
    `,
    footerNote: 'Update the order status promptly — buyers will get an email at every step.',
  });

// 7. Order status change (buyer-facing)
export interface OrderStatusEmailData {
  orderNumber: string;
  customerName: string;
  storeName: string;
  status: 'PAID' | 'PROCESSING' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED' | 'REFUNDED' | string;
  total: number | string;
  currency?: string;
  reason?: string | null;
}

const STATUS_COPY: Record<
  string,
  { eyebrow: string; title: string; body: string; pill: 'success' | 'pending' | 'warning' | 'error' | 'info' }
> = {
  PAID: {
    eyebrow: 'Payment received',
    title: 'Payment received',
    body: `Your payment has been received and the seller has been notified.`,
    pill: 'success',
  },
  PROCESSING: {
    eyebrow: 'Order processing',
    title: 'Your order is being prepared',
    body: `The seller is getting your order ready. We'll let you know the moment it's dispatched.`,
    pill: 'info',
  },
  SHIPPED: {
    eyebrow: 'On the way',
    title: 'Your order is on the way',
    body: `Your order has been dispatched and is on its way to you. Reach out to the seller via WhatsApp if you need to coordinate the drop-off.`,
    pill: 'info',
  },
  DELIVERED: {
    eyebrow: 'Delivered',
    title: 'Your order was delivered',
    body: `Hope you love it. If anything's off, you have 7 days to request a return.`,
    pill: 'success',
  },
  CANCELLED: {
    eyebrow: 'Cancelled',
    title: 'Your order was cancelled',
    body: `Your order has been cancelled. If you were charged, a refund is on the way within 5–10 business days.`,
    pill: 'error',
  },
  REFUNDED: {
    eyebrow: 'Refund issued',
    title: 'Your refund is on the way',
    body: `A refund has been issued to your original payment method. Allow 5–10 business days for it to land.`,
    pill: 'warning',
  },
};

export const getOrderStatusEmail = (
  o: OrderStatusEmailData,
  links: EmailLinks = { baseUrl: 'https://vendly.com' },
) => {
  const copy = STATUS_COPY[o.status] || {
    eyebrow: 'Order update',
    title: `Order ${o.status.toLowerCase()}`,
    body: `Your order status is now ${o.status.toLowerCase()}.`,
    pill: 'info' as const,
  };
  return shell({
    title: `${copy.title} — Order #${o.orderNumber}`,
    preheader: copy.body,
    content: `
      <div style="margin-bottom:16px;">${statusPill(o.status, copy.pill)}</div>
      ${eyebrow(copy.eyebrow)}
      ${H1(copy.title)}
      ${P(copy.body)}
      ${card(`
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
          ${kvRow('Order ID', `<span style="font-family: ui-monospace, monospace;">${escape(o.orderNumber)}</span>`)}
          ${kvRow('Store', escape(o.storeName))}
          ${kvRow('Order total', money(o.total, o.currency))}
        </table>
      `)}
      ${o.reason ? P(`<strong>Note from the seller:</strong> ${escape(o.reason)}`) : ''}
      ${button('View your order', `${links.baseUrl}/orders`)}
      ${o.status === 'DELIVERED' ? secondaryButton('Browse more', `${links.baseUrl}/products`) : ''}
    `,
  });
};

// ─── Seller lifecycle ────────────────────────────────────────────────────────

// 8. Seller verification approved → welcome to selling
export const getSellerApprovedEmail = (
  name: string,
  storeLink: string,
  links: EmailLinks = { baseUrl: 'https://vendly.com' },
) =>
  shell({
    title: "You're approved to sell on Vendly",
    preheader: 'Your store is live. Time to add your first product.',
    content: `
      <div style="margin-bottom:16px;">${statusPill('Approved', 'success')}</div>
      ${eyebrow('Verification approved')}
      ${H1(`You're a verified seller, ${escape(name.split(' ')[0] || name)}.`)}
      ${P(`Welcome to Vendly. Your store is live at <a href="${links.baseUrl}/s/${escape(storeLink)}" style="color:${BRAND.primary};">${links.baseUrl.replace(/^https?:\/\//, '')}/s/${escape(storeLink)}</a>.`)}
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
  links: EmailLinks = { baseUrl: 'https://vendly.com' },
) =>
  shell({
    title: 'Your seller application needs another look',
    preheader: 'We couldn\'t approve your application this time.',
    content: `
      <div style="margin-bottom:16px;">${statusPill('Not approved', 'error')}</div>
      ${eyebrow('Verification update')}
      ${H1(`We need a bit more from you, ${escape(name.split(' ')[0] || name)}.`)}
      ${P(`Thanks for applying to sell on Vendly. Unfortunately we weren't able to approve your application this round.`)}
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
  links: EmailLinks = { baseUrl: 'https://vendly.com' },
) =>
  shell({
    title: d.isExtension ? 'Vendly Pro extended' : 'Welcome to Vendly Pro',
    preheader: `Pro perks unlock right now. Your membership runs through ${formatDate(d.proExpiresAt)}.`,
    content: `
      <div style="margin-bottom:16px;">${statusPill('Pro active', 'success')}</div>
      ${eyebrow(d.isExtension ? 'Membership extended' : 'Welcome to Pro')}
      ${H1(d.isExtension ? `Pro is extended through ${formatDate(d.proExpiresAt)}.` : `Welcome to Vendly Pro, ${escape(d.name.split(' ')[0] || d.name)}.`)}
      ${P(`Your Pro perks are live right now. Use them to ship more, sell faster, and stand out in search.`)}
      ${card(`
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
          ${kvRow('Plan', 'Vendly Pro')}
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
  links: EmailLinks = { baseUrl: 'https://vendly.com' },
) =>
  shell({
    title: 'Your Vendly Pro membership expires soon',
    preheader: `Renew before ${formatDate(expiresAt)} to keep your Pro perks active.`,
    content: `
      <div style="margin-bottom:16px;">${statusPill('Expiring soon', 'warning')}</div>
      ${eyebrow('Renew Pro')}
      ${H1(`Your Pro membership expires ${formatDate(expiresAt)}.`)}
      ${P(`Hi ${escape(name.split(' ')[0] || name)} — your Vendly Pro membership ends in a few days. Renew now to keep featured placement, stock alerts, and your QR code active without a gap.`)}
      ${button('Renew for GH₵57', `${links.baseUrl}/dashboard/settings`)}
      ${secondaryButton('Compare plans', `${links.baseUrl}/help`)}
    `,
  });

// 12. Payout sent (seller)
export interface PayoutEmailData {
  storeName: string;
  amount: number | string;
  currency?: string;
  reference: string;
  bankName?: string;
  accountLastFour?: string;
  processedAt: string | Date;
}

export const getPayoutSentEmail = (
  d: PayoutEmailData,
  links: EmailLinks = { baseUrl: 'https://vendly.com' },
) =>
  shell({
    title: `Payout sent — ${money(d.amount, d.currency)}`,
    preheader: 'Your earnings are on the way to your bank.',
    content: `
      <div style="margin-bottom:16px;">${statusPill('Payout sent', 'success')}</div>
      ${eyebrow('Payout')}
      ${H1(`${money(d.amount, d.currency)} is on the way.`)}
      ${P(`We just sent a payout to ${escape(d.storeName)}'s linked account. Funds usually land within 1–2 business days.`)}
      ${card(`
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
          ${kvRow('Amount', money(d.amount, d.currency))}
          ${d.bankName ? kvRow('Bank', escape(d.bankName)) : ''}
          ${d.accountLastFour ? kvRow('Account', `•••• ${escape(d.accountLastFour)}`) : ''}
          ${kvRow('Reference', `<span style="font-family: ui-monospace, monospace; font-size:12px;">${escape(d.reference)}</span>`)}
          ${kvRow('Processed', escape(formatDateTime(d.processedAt)))}
        </table>
      `)}
      ${button('View payouts', `${links.baseUrl}/dashboard/payouts`)}
    `,
    footerNote: 'Funds not in your account after 3 business days? Email us with the reference above.',
  });

// 13. Low-stock alert (seller)
export const getLowStockEmail = (
  storeName: string,
  product: { id: string; title: string; quantity: number; image_url?: string | null },
  links: EmailLinks = { baseUrl: 'https://vendly.com' },
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
    title: 'Your Vendly account has been suspended',
    preheader: 'Action required — your account is currently restricted.',
    content: `
      <div style="margin-bottom:16px;">${statusPill('Suspended', 'error')}</div>
      ${eyebrow('Account notice')}
      ${H1('Your account has been suspended.')}
      ${P(`Hi ${escape(name.split(' ')[0] || name)}, we've temporarily suspended your Vendly account.`)}
      ${card(`<p style="margin:0; font-size:13px;"><strong>Reason:</strong> ${escape(reason)}</p>`, '#dc2626')}
      ${P(`If you believe this is a mistake or want to appeal, reply to this email and our trust team will review your case within 48 hours.`)}
      ${secondaryButton('Email support', `mailto:${BRAND.supportEmail}`)}
    `,
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
  links: EmailLinks = { baseUrl: 'https://vendly.com' },
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
      ${button('Review in dashboard', `${links.baseUrl}/vendly/verifications`)}
    `,
  });

// 16. Newsletter Welcome
export const getNewsletterWelcomeEmail = (
  email: string,
  links: EmailLinks = { baseUrl: 'https://vendly.com' },
) =>
  shell({
    title: 'Welcome to the Vendly Newsletter',
    preheader: 'You are on the list for updates, deals, and seller tips.',
    content: `
      <div style="margin-bottom:16px;">${statusPill('Subscribed', 'success')}</div>
      ${eyebrow('Newsletter')}
      ${H1(`You're on the list.`)}
      ${P(`Thanks for subscribing to the Vendly newsletter. We'll keep you posted with the latest updates, special deals, and tips to grow your business.`)}
      ${button('Start exploring', `${links.baseUrl}/products`)}
    `,
  });

