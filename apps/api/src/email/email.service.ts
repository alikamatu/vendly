import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';
import {
  getVerificationEmail,
  getPasswordResetEmail,
  getPasswordChangedEmail,
  getWelcomeEmail,
  getOrderConfirmationEmail,
  getSellerOrderAlertEmail,
  getOrderStatusEmail,
  getSellerApprovedEmail,
  getSellerRejectedEmail,
  getProActivatedEmail,
  getProExpiringEmail,
  getPayoutSentEmail,
  getLowStockEmail,
  getAccountSuspendedEmail,
  EmailLinks,
  OrderEmailData,
  OrderStatusEmailData,
  ProActivatedData,
  PayoutEmailData,
} from './email-templates';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private resend: Resend;

  constructor(private configService: ConfigService) {
    this.resend = new Resend(this.configService.get('RESEND_API_KEY'));
  }

  private get links(): EmailLinks {
    return {
      baseUrl:
        this.configService.get<string>('FRONTEND_URL') || 'https://vendly.com',
    };
  }

  private get fromAddress(): string {
    return (
      this.configService.get<string>('RESEND_FROM_EMAIL') ||
      'onboarding@resend.dev'
    );
  }

  /**
   * Internal helper: send via Resend with a fallback to the Resend onboarding
   * sender if the configured domain is rejected (common in dev).
   */
  private async deliver(
    to: string,
    subject: string,
    html: string,
    context = 'email',
  ) {
    const from = this.fromAddress;
    try {
      const response = await this.resend.emails.send({ from, to, subject, html });
      if ((response as any)?.error) {
        this.logger.error(
          `[${context}] Resend error sending to ${to}: ${JSON.stringify((response as any).error)}`,
        );
        if (from !== 'onboarding@resend.dev') {
          this.logger.warn(`[${context}] Falling back to onboarding@resend.dev`);
          return this.resend.emails.send({
            from: 'onboarding@resend.dev',
            to,
            subject,
            html,
          });
        }
      }
      this.logger.log(`[${context}] Sent to ${to}`);
      return response;
    } catch (err) {
      this.logger.error(`[${context}] Failed to send to ${to}`, err as any);
      // Swallow — transactional emails shouldn't break a request path.
      return null;
    }
  }

  // ─── Auth lifecycle ──────────────────────────────────────────────────────

  sendWelcomeEmail(to: string, name: string) {
    return this.deliver(
      to,
      `Welcome to Vendly, ${name.split(' ')[0] || name}`,
      getWelcomeEmail(name, this.links),
      'welcome',
    );
  }

  sendVerificationEmail(to: string, token: string) {
    const url = `${this.links.baseUrl}/verify-email?token=${encodeURIComponent(token)}`;
    return this.deliver(
      to,
      'Verify your Vendly email',
      getVerificationEmail(url),
      'verification',
    );
  }

  sendPasswordResetEmail(to: string, token: string) {
    const url = `${this.links.baseUrl}/reset-password?token=${encodeURIComponent(token)}`;
    return this.deliver(
      to,
      'Reset your Vendly password',
      getPasswordResetEmail(url),
      'password-reset',
    );
  }

  sendPasswordChangedEmail(to: string, name: string) {
    return this.deliver(
      to,
      'Your Vendly password was changed',
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

  sendSellerOrderNotification(to: string, order: OrderEmailData) {
    return this.deliver(
      to,
      `New order #${order.orderNumber} from ${order.customerName.split(' ')[0] || order.customerName}`,
      getSellerOrderAlertEmail(order, this.links),
      'seller-order-alert',
    );
  }

  sendOrderStatusUpdate(to: string, order: OrderStatusEmailData) {
    const subjectByStatus: Record<string, string> = {
      PAID: `Payment received — Order #${order.orderNumber}`,
      PROCESSING: `Order #${order.orderNumber} is being prepared`,
      SHIPPED: `Order #${order.orderNumber} is on the way`,
      DELIVERED: `Order #${order.orderNumber} delivered`,
      CANCELLED: `Order #${order.orderNumber} was cancelled`,
      REFUNDED: `Refund issued — Order #${order.orderNumber}`,
    };
    return this.deliver(
      to,
      subjectByStatus[order.status] || `Update on order #${order.orderNumber}`,
      getOrderStatusEmail(order, this.links),
      `order-status-${order.status.toLowerCase()}`,
    );
  }

  // ─── Seller lifecycle ────────────────────────────────────────────────────

  sendSellerApprovedEmail(to: string, name: string, storeLink: string) {
    return this.deliver(
      to,
      `You're approved to sell on Vendly`,
      getSellerApprovedEmail(name, storeLink, this.links),
      'seller-approved',
    );
  }

  sendSellerRejectedEmail(to: string, name: string, reason?: string) {
    return this.deliver(
      to,
      'Your Vendly seller application needs another look',
      getSellerRejectedEmail(name, reason, this.links),
      'seller-rejected',
    );
  }

  // ─── Pro membership ──────────────────────────────────────────────────────

  sendProActivatedEmail(to: string, data: ProActivatedData) {
    return this.deliver(
      to,
      data.isExtension
        ? 'Your Vendly Pro membership was extended'
        : 'Welcome to Vendly Pro',
      getProActivatedEmail(data, this.links),
      'pro-activated',
    );
  }

  sendProExpiringEmail(to: string, name: string, expiresAt: string | Date) {
    return this.deliver(
      to,
      'Your Vendly Pro membership expires soon',
      getProExpiringEmail(name, expiresAt, this.links),
      'pro-expiring',
    );
  }

  // ─── Payouts ─────────────────────────────────────────────────────────────

  sendPayoutSentEmail(to: string, data: PayoutEmailData) {
    return this.deliver(
      to,
      `Payout sent — ${data.currency || 'GHS'} ${Number(data.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
      getPayoutSentEmail(data, this.links),
      'payout-sent',
    );
  }

  // ─── Inventory + account ─────────────────────────────────────────────────

  sendLowStockEmail(
    to: string,
    storeName: string,
    product: { id: string; title: string; quantity: number; image_url?: string | null },
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
      'Your Vendly account has been suspended',
      getAccountSuspendedEmail(name, reason),
      'account-suspended',
    );
  }
}
