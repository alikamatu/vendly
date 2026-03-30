const LOGO_URL = 'https://vendly-omega.vercel.app/logos/vendly.png'; // Assuming production URL for the logo

const baseTemplate = (content: string) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      line-height: 1.6;
      color: #1a1a1a;
      margin: 0;
      padding: 0;
      background-color: #f9fafb;
    }
    .container {
      max-width: 600px;
      margin: 40px auto;
      background: #ffffff;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
    }
    .header {
      padding: 40px 0;
      text-align: center;
      background: #ffffff;
    }
    .logo {
      height: 48px;
    }
    .content {
      padding: 0 40px 40px;
    }
    .footer {
      padding: 32px 40px;
      background: #f3f4f6;
      text-align: center;
      font-size: 14px;
      color: #6b7280;
    }
    .button {
      display: inline-block;
      padding: 12px 24px;
      background-color: #000000;
      color: #ffffff;
      text-decoration: none;
      border-radius: 6px;
      font-weight: 600;
      margin-top: 24px;
    }
    h1 {
      margin: 0 0 20px;
      font-size: 24px;
      font-weight: 800;
      color: #111827;
    }
    p {
      margin: 0 0 16px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <img src="${LOGO_URL}" alt="Vendly Logo" class="logo">
    </div>
    <div class="content">
      ${content}
    </div>
    <div class="footer">
      &copy; ${new Date().getFullYear()} Vendly. All rights reserved.
    </div>
  </div>
</body>
</html>
`;

export const getWelcomeEmail = (name: string) =>
  baseTemplate(`
  <h1>Welcome to Vendly, ${name}!</h1>
  <p>We're thrilled to have you join our community. Vendly is built to help you manage and grow your business with ease.</p>
  <p>To get started, feel free to explore your dashboard and set up your first storefront.</p>
  <a href="https://vendly.vercel.app/dashboard" class="button">Go to Dashboard</a>
`);

export const getVerificationEmail = (url: string) =>
  baseTemplate(`
  <h1>Verify your email</h1>
  <p>Thanks for signing up! Please confirm your email address to get full access to Vendly.</p>
  <a href="${url}" class="button">Verify Email</a>
  <p style="margin-top: 24px; font-size: 14px; color: #6b7280;">If you didn't create an account, you can safely ignore this email.</p>
`);

export const getPasswordResetEmail = (url: string) =>
  baseTemplate(`
  <h1>Reset your password</h1>
  <p>We received a request to reset your password. Click the button below to choose a new one.</p>
  <a href="${url}" class="button">Reset Password</a>
  <p style="margin-top: 24px; font-size: 14px; color: #6b7280;">This link will expire in 1 hour. If you didn't request a password reset, please ignore this email.</p>
`);
