const LOGO_URL = 'https://vendly-omega.vercel.app/logos/vendly.png';
const MOTTO = 'Your Unified Commerce Gateway';

const baseTemplate = (content: string, title?: string) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title || 'Vendly Notification'}</title>
  <style>
    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      line-height: 1.6;
      color: #111827;
      margin: 0;
      padding: 0;
      background-color: #f3f4f6;
    }
    .wrapper {
      width: 100%;
      table-layout: fixed;
      background-color: #f3f4f6;
      padding-bottom: 40px;
    }
    .main {
      background-color: #ffffff;
      margin: 0 auto;
      width: 100%;
      max-width: 600px;
      border-spacing: 0;
      font-family: sans-serif;
      color: #4a4a4a;
    }
    .header {
      padding: 32px 40px;
      text-align: center;
      background-color: #ffffff;
    }
    .logo {
      width: 120px;
      height: auto;
    }
    .content {
      padding: 40px;
      background-color: #ffffff;
    }
    .footer {
      padding: 40px;
      text-align: center;
      background-color: #f9fafb;
      border-top: 1px solid #e5e7eb;
    }
    .motto {
      font-size: 13px;
      color: #6b7280;
      font-style: italic;
      margin-bottom: 12px;
      display: block;
    }
    .copyright {
      font-size: 12px;
      color: #9ca3af;
    }
    h1 {
      margin-top: 0;
      font-size: 24px;
      font-weight: 800;
      color: #111827;
      letter-spacing: -0.025em;
    }
    .button {
      display: inline-block;
      padding: 14px 28px;
      background-color: #000000;
      color: #ffffff !important;
      text-decoration: none;
      border-radius: 8px;
      font-weight: 600;
      font-size: 15px;
      text-align: center;
    }
    .order-table {
      width: 100%;
      border-collapse: collapse;
      margin: 24px 0;
    }
    .order-table th {
      text-align: left;
      font-size: 12px;
      text-transform: uppercase;
      tracking: 0.05em;
      color: #6b7280;
      padding-bottom: 12px;
      border-bottom: 1px solid #e5e7eb;
    }
    .order-table td {
      padding: 16px 0;
      border-bottom: 1px solid #f3f4f6;
    }
    .price-total {
      font-size: 18px;
      font-weight: 800;
      color: #111827;
    }
    .status-badge {
      display: inline-block;
      padding: 4px 12px;
      background-color: #ecfdf5;
      color: #059669;
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      border-radius: 9999px;
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <table class="main">
      <tr>
        <td class="header">
          <img src="${LOGO_URL}" alt="Vendly" class="logo">
        </td>
      </tr>
      <tr>
        <td class="content">
          ${content}
        </td>
      </tr>
      <tr>
        <td class="footer">
          <span class="motto">${MOTTO}</span>
          <p class="copyright">&copy; ${new Date().getFullYear()} Vendly Inc. All rights reserved.</p>
          <div style="margin-top: 20px; font-size: 11px; color: #9ca3af;">
            If you have any questions, contact us at support@vendly.com
          </div>
        </td>
      </tr>
    </table>
  </div>
</body>
</html>
`;

export const getWelcomeEmail = (name: string) =>
  baseTemplate(`
  <div style="text-align: center;">
    <h1>Welcome to Vendly, ${name}!</h1>
    <p style="font-size: 16px; color: #4b5563;">Step into the future of unified commerce. We're excited to help you streamline your sales and reach more customers.</p>
    <div style="margin-top: 32px;">
      <a href="https://vendly.vercel.app/dashboard" class="button">Access Your Dashboard</a>
    </div>
    <div style="margin-top: 40px; text-align: left; background-color: #f9fafb; padding: 24px; border-radius: 12px;">
      <p style="font-size: 14px; font-weight: 700; margin-bottom: 8px;">Next steps:</p>
      <ul style="font-size: 14px; color: #4b5563; padding-left: 20px;">
        <li>Complete your store profile</li>
        <li>Review your payment settings</li>
        <li>Upload your first product</li>
      </ul>
    </div>
  </div>
`, 'Welcome to Vendly');

export const getVerificationEmail = (url: string) =>
  baseTemplate(`
  <h1>Verify your email</h1>
  <p>To ensure the security of your commerce gateway, please confirm your email address by clicking the button below.</p>
  <div style="margin: 32px 0;">
    <a href="${url}" class="button">Verify Email Address</a>
  </div>
  <p style="font-size: 14px; color: #6b7280;">This link will expire in 24 hours. If you didn't create an account, you can safely ignore this email.</p>
`, 'Verify your email');

export const getPasswordResetEmail = (url: string) =>
  baseTemplate(`
  <h1>Reset your password</h1>
  <p>We received a request to reset the password for your Vendly account. Access the secure link below to set a new one.</p>
  <div style="margin: 32px 0;">
    <a href="${url}" class="button">Set New Password</a>
  </div>
  <p style="font-size: 14px; color: #6b7280;">This secure link is valid for 1 hour. If you did not request this, please contact support immediately.</p>
`, 'Reset your password');

export const getOrderConfirmationEmail = (orderData: {
  orderNumber: string;
  customerName: string;
  items: Array<{ title: string; quantity: number; price: string }>;
  total: string;
  date: string;
}) =>
  baseTemplate(`
  <div style="margin-bottom: 24px;">
    <div class="status-badge">Order Confirmed</div>
    <h1 style="margin-top: 12px;">Thank you for your order, ${orderData.customerName}!</h1>
    <p style="color: #4b5563;">We've received your order and are processing it now. We'll notify you as soon as it's ready for shipment.</p>
  </div>

  <div style="background-color: #f9fafb; border-radius: 12px; padding: 20px; margin: 32px 0;">
    <table width="100%" border="0" cellspacing="0" cellpadding="0">
      <tr>
        <td style="font-size: 13px; color: #6b7280; font-weight: 600; text-transform: uppercase;">Order Number</td>
        <td align="right" style="font-size: 13px; color: #6b7280; font-weight: 600; text-transform: uppercase;">Order Date</td>
      </tr>
      <tr>
        <td style="font-size: 15px; font-weight: 700; color: #111827;">${orderData.orderNumber}</td>
        <td align="right" style="font-size: 15px; font-weight: 700; color: #111827;">${orderData.date}</td>
      </tr>
    </table>
  </div>

  <table class="order-table">
    <thead>
      <tr>
        <th>Item</th>
        <th align="center">Qty</th>
        <th align="right">Price</th>
      </tr>
    </thead>
    <tbody>
      ${orderData.items.map(item => `
        <tr>
          <td style="font-size: 14px; font-weight: 600;">${item.title}</td>
          <td align="center" style="font-size: 14px;">${item.quantity}</td>
          <td align="right" style="font-size: 14px; font-weight: 700;">₵${item.price}</td>
        </tr>
      `).join('')}
    </tbody>
  </table>

  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-top: 8px;">
    <tr>
      <td style="font-size: 15px; font-weight: 600; color: #4b5563;">Total Amount</td>
      <td align="right" class="price-total">₵${orderData.total}</td>
    </tr>
  </table>

  <div style="margin-top: 40px; text-align: center;">
    <a href="https://vendly.vercel.app/orders" class="button">View Order Details</a>
  </div>
`, 'Order Confirmation - Vendly');

export const getSellerOrderAlertEmail = (orderData: {
  orderNumber: string;
  items: Array<{ title: string; quantity: number; price: string }>;
  total: string;
  customerName: string;
  date: string;
}) =>
  baseTemplate(`
  <div style="margin-bottom: 24px;">
    <div class="status-badge" style="background-color: #ecfcfd; color: #0891b2;">New Sale!</div>
    <h1 style="margin-top: 12px;">You've made a sale!</h1>
    <p style="color: #4b5563;">A new order has been placed on your store. Here are the details of the transaction.</p>
  </div>

  <div style="background-color: #fcfdfd; border: 1px solid #e0f2fe; border-radius: 12px; padding: 20px; margin: 32px 0;">
    <p style="font-size: 13px; color: #0369a1; text-transform: uppercase; font-weight: 700; margin-bottom: 4px;">Customer</p>
    <p style="font-size: 16px; font-weight: 800; color: #111827; margin-bottom: 16px;">${orderData.customerName}</p>
    <p style="font-size: 13px; color: #0369a1; text-transform: uppercase; font-weight: 700; margin-bottom: 4px;">Reference</p>
    <p style="font-size: 16px; font-weight: 800; color: #111827;">${orderData.orderNumber}</p>
  </div>

  <table class="order-table">
    <thead>
      <tr>
        <th>Sold Item</th>
        <th align="center">Qty</th>
        <th align="right">Earnings</th>
      </tr>
    </thead>
    <tbody>
      ${orderData.items.map(item => `
        <tr>
          <td style="font-size: 14px; font-weight: 600;">${item.title}</td>
          <td align="center" style="font-size: 14px;">${item.quantity}</td>
          <td align="right" style="font-size: 14px; font-weight: 700;">₵${item.price}</td>
        </tr>
      `).join('')}
    </tbody>
  </table>

  <table width="100%" border="0" cellspacing="0" cellpadding="0">
    <tr>
      <td style="font-size: 15px; font-weight: 600; color: #4b5563;">Settlement Sum</td>
      <td align="right" class="price-total" style="color: #0369a1;">₵${orderData.total}</td>
    </tr>
  </table>

  <div style="margin-top: 40px; text-align: center;">
    <a href="https://vendly.vercel.app/dashboard" class="button" style="background-color: #0369a1;">Process Order</a>
  </div>
`, 'You have a new order! - Vendly');
