import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';
import * as Sentry from '@sentry/nestjs';
import {
  getVerificationEmail,
  getPasswordResetEmail,
  getPasswordChangedEmail,
  getWelcomeEmail,
  getOrderConfirmationEmail,
  getPaymentReceiptEmail,
  getSellerOrderAlertEmail,
  getOrderStatusEmail,
  getSellerOrderStatusEmail,
  getSellerApprovedEmail,
  getSellerRejectedEmail,
  getProActivatedEmail,
  getProExpiringEmail,
  getPayoutSentEmail,
  getLowStockEmail,
  getAccountSuspendedEmail,
  getAccountDisabledEmail,
  getAccountDeletionScheduledEmail,
  getAccountDeletionReminderEmail,
  getAccountDeletedEmail,
  EmailLinks,
  OrderEmailData,
  OrderStatusEmailData,
  ProActivatedData,
  PayoutEmailData,
  getContactFormAdminAlertEmail,
  getNewsletterWelcomeEmail,
  getSellerVerificationAdminAlertEmail,
  getAdminReminderEmail,
  type AdminReminderEmailInput,
} from './email-templates';

export interface EmailDeliveryStatus {
  ok: boolean;
  context: string;
  from: string;
  at: string;
  id?: string | null;
  error?: string | null;
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly apiKey: string;
  private resend: Resend | null = null;
  private lastDelivery: EmailDeliveryStatus | null = null;

  constructor(private configService: ConfigService) {
    this.apiKey = (
      this.configService.get<string>('RESEND_API_KEY') || ''
    ).trim();
    if (!this.apiKey) {
      this.logger.error(
        'RESEND_API_KEY is missing! Transactional emails (verification, receipts, resets) will NOT be delivered.',
      );
    } else {
      this.resend = new Resend(this.apiKey);
      this.logger.log(
        `EmailService initialised (from="${this.fromAddress}", frontendUrl="${this.links.baseUrl}")`,
      );
    }
  }

  private get links(): EmailLinks {
    const raw =
      this.configService.get<string>('FRONTEND_URL') || 'https://verndly.com';
    return {
      baseUrl: raw.trim().replace(/\/+$/, ''),
    };
  }

  private get fromAddress(): string {
    const configured = (
      this.configService.get<string>('RESEND_FROM_EMAIL') || ''
    ).trim();
    const raw =
      configured ||
      (process.env.NODE_ENV === 'production'
        ? 'noreply@verndly.com'
        : 'onboarding@resend.dev');
    // Include a clear brand display name if only a bare address was provided.
    return raw.includes('<') ? raw : `Verndly <${raw}>`;
  }

  private get replyToAddress(): string {
    return (
      this.configService.get<string>('SUPPORT_EMAIL') || 'support@verndly.com'
    ).trim();
  }

  /** Safe runtime status for /debug-email/status (never exposes secrets or recipient PII). */
  getStatus() {
    return {
      provider: 'resend',
      configured: Boolean(this.apiKey),
      apiKeyPrefix: this.apiKey ? `${this.apiKey.slice(0, 6)}…` : null,
      fromAddress: this.fromAddress,
      replyTo: this.replyToAddress,
      frontendUrl: this.links.baseUrl,
      nodeEnv: process.env.NODE_ENV || 'development',
      lastDelivery: this.lastDelivery,
    };
  }

  /**
   * Internal helper: send via Resend with full error inspection, Sentry
   * reporting, and dev-only fallback to onboarding@resend.dev.
   */
  private async deliver(
    to: string,
    subject: string,
    html: string,
    context = 'email',
  ) {
    const from = this.fromAddress;
    const recipient = (to || '').trim();

    if (!this.resend || !this.apiKey) {
      const msg = 'RESEND_API_KEY is not configured on the API server';
      this.logger.error(`[${context}] Cannot send email: ${msg}`);
      this.lastDelivery = {
        ok: false,
        context,
        from,
        at: new Date().toISOString(),
        error: msg,
      };
      Sentry.captureMessage(`[EmailService:${context}] ${msg}`, 'error');
      return null;
    }

    try {
      const response = await this.resend.emails.send({
        from,
        to: recipient,
        replyTo: this.replyToAddress,
        subject,
        html,
      });

      const primaryError = (response as any)?.error;
      if (primaryError) {
        const errorDetail = JSON.stringify(primaryError);
        this.logger.error(
          `[${context}] Resend rejected email (from="${from}"): ${errorDetail}`,
        );

        // Only fall back to Resend's sandbox sender in non-production environments;
        // in production, onboarding@resend.dev can only deliver to the account owner.
        if (
          process.env.NODE_ENV !== 'production' &&
          !from.includes('onboarding@resend.dev')
        ) {
          this.logger.warn(
            `[${context}] Dev fallback to onboarding@resend.dev`,
          );
          const fallbackRes = await this.resend.emails.send({
            from: 'onboarding@resend.dev',
            to: recipient,
            subject,
            html,
          });
          const fallbackError = (fallbackRes as any)?.error;
          if (fallbackError) {
            const fbDetail = JSON.stringify(fallbackError);
            this.logger.error(
              `[${context}] Fallback send also failed: ${fbDetail}`,
            );
            this.lastDelivery = {
              ok: false,
              context,
              from: 'onboarding@resend.dev',
              at: new Date().toISOString(),
              error: fbDetail,
            };
            return null;
          }
          const fbId =
            (fallbackRes as any)?.data?.id ?? (fallbackRes as any)?.id ?? null;
          this.lastDelivery = {
            ok: true,
            context,
            from: 'onboarding@resend.dev',
            at: new Date().toISOString(),
            id: fbId,
          };
          return fallbackRes;
        }

        this.lastDelivery = {
          ok: false,
          context,
          from,
          at: new Date().toISOString(),
          error: errorDetail,
        };
        Sentry.captureMessage(
          `[EmailService:${context}] Resend error (from=${from}): ${errorDetail}`,
          'error',
        );
        return null;
      }

      const id = (response as any)?.data?.id ?? (response as any)?.id ?? null;
      this.lastDelivery = {
        ok: true,
        context,
        from,
        at: new Date().toISOString(),
        id,
      };
      this.logger.log(
        `[${context}] Sent to ${recipient}${id ? ` (id=${id})` : ''}`,
      );
      return response;
    } catch (err: any) {
      const errMsg = err?.message || String(err);
      this.logger.error(
        `[${context}] Failed to send to ${recipient}: ${errMsg}`,
        err,
      );
      this.lastDelivery = {
        ok: false,
        context,
        from,
        at: new Date().toISOString(),
        error: errMsg,
      };
      Sentry.captureException(err, { tags: { email_context: context } });
      // Swallow — transactional emails shouldn't break a request path.
      return null;
    }
  }

  // ─── Auth lifecycle ──────────────────────────────────────────────────────

  sendWelcomeEmail(to: string, name: string) {
    return this.deliver(
      to,
      `Welcome to Verndly — Your account is ready`,
      getWelcomeEmail(name, this.links),
      'welcome',
    );
  }

  sendVerificationEmail(to: string, token: string) {
    const url = `${this.links.baseUrl}/verify-email?token=${encodeURIComponent(token)}`;
    if (process.env.NODE_ENV !== 'production') {
      this.logger.log(`[verification] Dev link for ${to}: ${url}`);
    }
    return this.deliver(
      to,
      'Verify your email address — Verndly Security',
      getVerificationEmail(url),
      'verification',
    );
  }

  sendPasswordResetEmail(to: string, token: string) {
    const url = `${this.links.baseUrl}/reset-password?token=${encodeURIComponent(token)}`;
    if (process.env.NODE_ENV !== 'production') {
      this.logger.log(`[password-reset] Dev link for ${to}: ${url}`);
    }
    return this.deliver(
      to,
      'Reset your password — Verndly Security',
      getPasswordResetEmail(url),
      'password-reset',
    );
  }

  sendPasswordChangedEmail(to: string, name: string) {
    return this.deliver(
      to,
      'Security alert: Your Verndly password was changed',
      getPasswordChangedEmail(name),
      'password-changed',
    );
  }

  // ─── Orders ──────────────────────────────────────────────────────────────

  sendOrderConfirmation(to: string, order: OrderEmailData) {
    return this.deliver(
      to,
      `Order #${order.orderNumber} confirmed`,
      getOrderConfirmationEmail(order, this.links),
      'order-confirmation',
    );
  }

  sendPaymentReceiptEmail(
    to: string,
    order: OrderEmailData & { orderId?: string; transactionId?: string },
  ) {
    return this.deliver(
      to,
      `Payment Receipt: Order #${order.orderNumber} — ${order.storeName || 'Verndly'}`,
      getPaymentReceiptEmail(order, this.links),
      'payment-receipt',
    );
  }

  sendSellerOrderNotification(to: string, order: OrderEmailData) {
    return this.deliver(
      to,
      `New order #${order.orderNumber} from ${order.customerName.split(' ')[0] || order.customerName}`,
      getSellerOrderAlertEmail(order, this.links),
      'seller-order-alert',
    );
  }

  sendOrderStatusUpdate(to: string, order: OrderStatusEmailData) {
    const statusKey = (order.status || '').trim().toUpperCase();
    const subjectByStatus: Record<string, string> = {
      CONFIRMED: `Order confirmed — Order #${order.orderNumber}`,
      PAID: `Payment received — Order #${order.orderNumber}`,
      PROCESSING: `Order #${order.orderNumber} is being prepared`,
      PROCESSED: `Order #${order.orderNumber} is ready`,
      'ON THE WAY': `Order #${order.orderNumber} is on the way`,
      SHIPPED: `Order #${order.orderNumber} has been dispatched`,
      'AVAILABLE FOR PICKUP': `Order #${order.orderNumber} is ready for pickup`,
      DELIVERED: `Order #${order.orderNumber} delivered`,
      COMPLETED: `Order #${order.orderNumber} completed`,
      CANCELLED: `Order #${order.orderNumber} was cancelled`,
      REFUNDED: `Refund issued — Order #${order.orderNumber}`,
    };
    return this.deliver(
      to,
      subjectByStatus[statusKey] || `Update on order #${order.orderNumber}`,
      getOrderStatusEmail(order, this.links),
      `order-status-${statusKey.toLowerCase()}`,
    );
  }

  sendSellerOrderStatusNotification(to: string, order: OrderStatusEmailData) {
    const isCancelled = order.status?.toUpperCase() === 'CANCELLED';
    const subject = isCancelled
      ? `Alert: Order #${order.orderNumber} was cancelled by ${order.cancelledBy === 'buyer' ? 'customer' : 'admin'}`
      : `Order #${order.orderNumber} status changed to ${order.status}`;

    return this.deliver(
      to,
      subject,
      getSellerOrderStatusEmail(order, this.links),
      'seller-order-status',
    );
  }

  // ─── Seller lifecycle ────────────────────────────────────────────────────

  sendSellerApprovedEmail(to: string, name: string, storeLink: string) {
    return this.deliver(
      to,
      `You're approved to sell on Verndly`,
      getSellerApprovedEmail(name, storeLink, this.links),
      'seller-approved',
    );
  }

  sendSellerRejectedEmail(to: string, name: string, reason?: string) {
    return this.deliver(
      to,
      'Your Verndly seller application needs another look',
      getSellerRejectedEmail(name, reason, this.links),
      'seller-rejected',
    );
  }

  // ─── Pro membership ──────────────────────────────────────────────────────

  sendProActivatedEmail(to: string, data: ProActivatedData) {
    const subject = data.complimentary
      ? '30 days of Verndly Pro are included with your verification'
      : data.isExtension
        ? 'Your Verndly Pro membership was extended'
        : 'Welcome to Verndly Pro';
    return this.deliver(
      to,
      subject,
      getProActivatedEmail(data, this.links),
      'pro-activated',
    );
  }

  sendProExpiringEmail(to: string, name: string, expiresAt: string | Date) {
    return this.deliver(
      to,
      'Your Verndly Pro membership expires soon',
      getProExpiringEmail(name, expiresAt, this.links),
      'pro-expiring',
    );
  }

  // ─── Payouts ─────────────────────────────────────────────────────────────

  sendPayoutSentEmail(to: string, data: PayoutEmailData) {
    const symbol = data.currency === 'GHS' ? 'GH¢' : data.currency || 'GH¢';
    const formattedAmount = `${symbol} ${Number(data.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    return this.deliver(
      to,
      `Payout Receipt: ${formattedAmount} Disbursed — ${data.storeName}`,
      getPayoutSentEmail(data, this.links),
      'payout-receipt',
    );
  }

  // ─── Inventory + account ─────────────────────────────────────────────────

  sendLowStockEmail(
    to: string,
    storeName: string,
    product: {
      id: string;
      title: string;
      quantity: number;
      image_url?: string | null;
    },
  ) {
    return this.deliver(
      to,
      `Low stock — ${product.title}`,
      getLowStockEmail(storeName, product, this.links),
      'low-stock',
    );
  }

  sendAccountSuspendedEmail(to: string, name: string, reason: string) {
    return this.deliver(
      to,
      'Your Verndly account has been suspended',
      getAccountSuspendedEmail(name, reason),
      'account-suspended',
    );
  }

  sendAccountDisabledEmail(to: string, name: string, isSeller: boolean) {
    return this.deliver(
      to,
      'Your Verndly account has been disabled',
      getAccountDisabledEmail(name, isSeller, this.links),
      'account-disabled',
    );
  }

  sendAccountDeletionScheduledEmail(
    to: string,
    name: string,
    scheduledFor: Date | string,
    productCount: number,
  ) {
    return this.deliver(
      to,
      'Your Verndly seller account is scheduled for deletion (14 days)',
      getAccountDeletionScheduledEmail(
        name,
        scheduledFor,
        productCount,
        this.links,
      ),
      'account-deletion-scheduled',
    );
  }

  sendAccountDeletionReminderEmail(
    to: string,
    name: string,
    scheduledFor: Date | string,
    daysRemaining: number,
  ) {
    return this.deliver(
      to,
      `Reminder: Your Verndly account will be deleted in ${daysRemaining} days`,
      getAccountDeletionReminderEmail(
        name,
        scheduledFor,
        daysRemaining,
        this.links,
      ),
      'account-deletion-reminder',
    );
  }

  sendAccountDeletedEmail(to: string, name: string, isSeller: boolean) {
    return this.deliver(
      to,
      'Your Verndly account has been permanently deleted',
      getAccountDeletedEmail(name, isSeller, this.links),
      'account-deleted',
    );
  }

  // ─── Contact & Newsletter ────────────────────────────────────────────────

  sendContactFormAdminAlert(data: {
    name: string;
    email: string;
    subject: string;
    message: string;
  }) {
    // Send to the support email address
    const adminEmail =
      this.configService.get<string>('SUPPORT_EMAIL') || 'support@verndly.com';
    return this.deliver(
      adminEmail,
      `New Contact Request: ${data.subject}`,
      getContactFormAdminAlertEmail(data),
      'contact-form',
    );
  }

  sendSellerVerificationAdminAlert(data: {
    userName: string;
    userEmail: string;
    userPhone?: string | null;
    type: string;
    verificationData: string;
    submittedAt: Date;
  }) {
    const adminEmail =
      this.configService.get<string>('ADMIN_NOTIFY_EMAIL') ||
      this.configService.get<string>('SUPPORT_EMAIL') ||
      'support@verndly.com';
    return this.deliver(
      adminEmail,
      `New seller verification: ${data.userName}`,
      getSellerVerificationAdminAlertEmail(data, this.links),
      'seller-verification-admin-alert',
    );
  }

  sendNewsletterWelcome(to: string) {
    return this.deliver(
      to,
      'Welcome to the Verndly Newsletter',
      getNewsletterWelcomeEmail(to, this.links),
      'newsletter-welcome',
    );
  }

  /**
   * Forwards a customer "I can't remember my email" request to the support
   * inbox. Two messages: one to support (containing the lookup details +
   * matching account hints) and one to the user confirming their request
   * was received (only when an email was supplied).
   */
  async sendAccountLookupSupportTicket(args: {
    fullName: string;
    businessName?: string;
    phone?: string;
    knownEmail?: string;
    note?: string;
    matches: Array<{ id: string; email: string; created_at: Date }>;
  }) {
    const supportInbox =
      this.configService.get<string>('SUPPORT_EMAIL') || 'support@verndly.com';

    const matchesHtml = args.matches.length
      ? `<ul>${args.matches
          .map(
            (m) =>
              `<li><strong>${escapeHtml(maskEmail(m.email))}</strong> · id ${m.id} · joined ${m.created_at.toISOString().slice(0, 10)}</li>`,
          )
          .join('')}</ul>`
      : '<p><em>No matching accounts found in the database.</em></p>';

    const supportHtml = `
      <h2>Account-lookup request</h2>
      <p>A user can't remember which email they registered with.</p>
      <table cellpadding="6" style="border-collapse:collapse">
        <tr><td><b>Name</b></td><td>${escapeHtml(args.fullName)}</td></tr>
        <tr><td><b>Business</b></td><td>${escapeHtml(args.businessName || '—')}</td></tr>
        <tr><td><b>Phone</b></td><td>${escapeHtml(args.phone || '—')}</td></tr>
        <tr><td><b>Email they tried</b></td><td>${escapeHtml(args.knownEmail || '—')}</td></tr>
      </table>
      ${args.note ? `<p><b>Note:</b> ${escapeHtml(args.note)}</p>` : ''}
      <h3>Possible matches</h3>
      ${matchesHtml}
    `;
    await this.deliver(
      supportInbox,
      `Account lookup request — ${args.fullName}`,
      supportHtml,
      'support-account-lookup',
    );

    if (args.knownEmail) {
      const ackHtml = `
        <p>Hi ${escapeHtml(args.fullName.split(' ')[0] || 'there')},</p>
        <p>Thanks for reaching out. Our support team has your request and will
        reply to this email shortly to help you recover access to your Verndly
        account.</p>
        <p>If you remember any other details in the meantime, just reply to
        this message.</p>
        <p>— The Verndly Support team</p>
      `;
      await this.deliver(
        args.knownEmail,
        "We've got your account-lookup request",
        ackHtml,
        'support-account-lookup-ack',
      );
    }
  }

  async sendPayoutChangeOtpEmail(args: {
    to: string;
    fullName: string;
    storeName: string;
    code: string;
    bankName: string;
    maskedAccount: string;
    expiresMinutes?: number;
  }) {
    const first = escapeHtml((args.fullName || 'there').split(' ')[0]);
    const mins = args.expiresMinutes ?? 10;
    const html = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 520px; margin: 0 auto; color: #111827; line-height: 1.6;">
        <p style="font-size: 14px;">Hi ${first},</p>
        <p style="font-size: 14px;">We received a request to update the payout account for <strong>${escapeHtml(args.storeName)}</strong> on Verndly:</p>
        <div style="background: #f9fafb; border-radius: 12px; padding: 14px 16px; margin: 16px 0; font-size: 13px;">
          <div><strong>Provider / Bank:</strong> ${escapeHtml(args.bankName)}</div>
          <div><strong>Account / MoMo:</strong> ${escapeHtml(args.maskedAccount)}</div>
        </div>
        <p style="font-size: 14px;">Enter this verification code to confirm the change:</p>
        <div style="background: #111827; color: #ffffff; border-radius: 12px; padding: 16px; text-align: center; font-size: 28px; font-weight: 700; letter-spacing: 8px; margin: 18px 0;">
          ${escapeHtml(args.code)}
        </div>
        <p style="font-size: 12px; color: #6b7280;">This code expires in ${mins} minutes and can only be used once. If you did not request this payout change, ignore this email and change your Verndly password immediately.</p>
      </div>
    `;
    await this.deliver(
      args.to,
      `Verndly verification code: ${args.code} (Payout account update)`,
      html,
      'payout-change-otp',
    );
  }

  async sendAdminReminderEmail(to: string, input: AdminReminderEmailInput) {
    const response = await this.deliver(
      to,
      input.subject,
      getAdminReminderEmail(input, this.links),
      'admin-reminder',
    );
    const id =
      (response as { data?: { id?: string }; id?: string } | null)?.data?.id ||
      (response as { id?: string } | null)?.id ||
      null;
    return {
      sent: Boolean(response),
      id: id || undefined,
      error: response
        ? undefined
        : this.lastDelivery?.error || 'Email was not sent',
    };
  }

  async sendPayoutDetailsChangedAlertEmail(args: {
    to: string;
    fullName: string;
    storeName: string;
    bankName: string;
    maskedAccount: string;
    subaccountSynced: boolean;
  }) {
    const first = escapeHtml((args.fullName || 'there').split(' ')[0]);
    const html = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 520px; margin: 0 auto; color: #111827; line-height: 1.6;">
        <p style="font-size: 14px;">Hi ${first},</p>
        <p style="font-size: 14px;">Your verified payout destination for <strong>${escapeHtml(args.storeName)}</strong> has been updated.</p>
        <div style="background: #f9fafb; border-radius: 12px; padding: 14px 16px; margin: 16px 0; font-size: 13px;">
          <div><strong>Provider / Bank:</strong> ${escapeHtml(args.bankName)}</div>
          <div><strong>Account / MoMo:</strong> ${escapeHtml(args.maskedAccount)}</div>
          <div><strong>Paystack Subaccount:</strong> ${args.subaccountSynced ? 'Synced & Active' : 'Queued for automatic sync'}</div>
        </div>
        <p style="font-size: 12px; color: #b91c1c;"><strong>Didn't make this change?</strong> Contact Verndly Support immediately at ${escapeHtml(this.replyToAddress)} so we can freeze your payouts and secure your store.</p>
      </div>
    `;
    await this.deliver(
      args.to,
      `Security alert: Payout details updated for ${args.storeName}`,
      html,
      'payout-change-alert',
    );
  }
}

function escapeHtml(s: string) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function maskEmail(email: string) {
  const [local, domain] = email.split('@');
  if (!domain) return email;
  if (local.length <= 2) return `${local[0]}***@${domain}`;
  return `${local.slice(0, 2)}***@${domain}`;
}
