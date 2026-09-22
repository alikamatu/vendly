import { Resend } from 'resend';

const apiKey = process.env.RESEND_API_KEY;

if (!apiKey) {
  console.warn('RESEND_API_KEY is missing. Email service will not work.');
}

const globalForResend = globalThis as unknown as { resend: Resend | undefined };
export const resend = globalForResend.resend ?? new Resend(apiKey);
if (process.env.NODE_ENV !== 'production') globalForResend.resend = resend;

export const emailService = {
  async sendVerificationEmail(email: string, token: string) {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3002';
    const confirmLink = `${appUrl}/auth/verify?token=${token}`;

    try {
      const { data, error } = await resend.emails.send({
        from: 'Vendly Admin <onboarding@resend.dev>',
        to: email,
        subject: 'Verify your administrative account - Vendly Admin',
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
            <div style="margin-bottom: 20px;">
              <h2 style="color: #09090b; font-size: 20px; font-weight: 700; margin: 0 0 8px;">Vendly Administrator Invitation</h2>
              <p style="color: #71717a; font-size: 14px; margin: 0;">Confirm your email address to access the administration dashboard.</p>
            </div>
            <div style="margin: 28px 0;">
              <a href="${confirmLink}" style="display: inline-block; background-color: #ff6b00; color: #ffffff; font-size: 14px; font-weight: 600; text-decoration: none; padding: 12px 24px; border-radius: 8px;">
                Verify Email Address
              </a>
            </div>
            <p style="color: #a1a1aa; font-size: 12px; margin-top: 32px; border-top: 1px solid #f4f4f5; padding-top: 16px;">
              If you did not request this invitation, please disregard this message.
            </p>
          </div>
        `,
      });

      if (error) {
        console.error('Resend email error:', error);
        return { success: false, error };
      }

      return { success: true, data };
    } catch (error) {
      console.error('Failure in sendVerificationEmail:', error);
      return { success: false, error };
    }
  },

  async sendAdminAlert(subject: string, htmlContent: string, recipient?: string) {
    const targetEmail = recipient || process.env.ADMIN_NOTIFY_EMAIL || 'admin@vendly.com';
    try {
      const { data, error } = await resend.emails.send({
        from: 'Vendly Operations <alerts@resend.dev>',
        to: targetEmail,
        subject: `[Vendly Ops] ${subject}`,
        html: htmlContent,
      });

      if (error) return { success: false, error };
      return { success: true, data };
    } catch (err) {
      return { success: false, error: err };
    }
  },
};
