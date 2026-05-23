import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { PaymentsService } from '../payments/payments.service';
import { EmailService } from '../email/email.service';

export const PRO_PRICE_GHS = 57;
export const PRO_DURATION_DAYS = 30;

@Injectable()
export class SubscriptionService {
  private readonly logger = new Logger(SubscriptionService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly paymentsService: PaymentsService,
    private readonly emailService: EmailService,
  ) {}

  async getMe(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { is_pro: true, pro_expires_at: true },
    });

    const now = new Date();
    const expiresAt = user?.pro_expires_at ?? null;
    const expired = expiresAt ? expiresAt.getTime() <= now.getTime() : true;
    const isPro = Boolean(user?.is_pro) && !expired;

    return {
      is_pro: isPro,
      pro_expires_at: expiresAt ? expiresAt.toISOString() : null,
      plan: isPro ? ('PRO' as const) : ('FREE' as const),
      price_ghs: PRO_PRICE_GHS,
      duration_days: PRO_DURATION_DAYS,
    };
  }

  async initializePro(
    user: { id: string; email: string },
    callbackUrl?: string,
  ) {
    if (!user?.email) {
      throw new BadRequestException('User email is required');
    }

    const reference = `pro_${randomUUID().replace(/-/g, '').slice(0, 16)}_${Date.now()}`;

    this.logger.log(
      `Initializing Pro subscription for ${user.email} (ref=${reference})`,
    );

    const data = await this.paymentsService.initializeTransaction({
      email: user.email,
      amount: PRO_PRICE_GHS,
      reference,
      callbackUrl,
    });

    return { ...data, reference };
  }

  async verifyPro(reference: string, user: { id: string; email: string }) {
    if (!reference) {
      throw new BadRequestException('reference is required');
    }
    if (!reference.startsWith('pro_')) {
      return { verified: false, status: 'invalid_reference' };
    }

    const verifyData = await this.paymentsService.verifyTransaction(reference);
    const inner = verifyData?.data;
    const isSuccess =
      verifyData?.status === true && inner?.status === 'success';

    if (!isSuccess) {
      return {
        verified: false,
        status: inner?.status ?? 'failed',
      };
    }

    const paidEmail: string | undefined =
      inner?.customer?.email || inner?.customer_email || inner?.email;

    if (paidEmail && paidEmail.toLowerCase() !== user.email.toLowerCase()) {
      this.logger.warn(
        `Pro verify email mismatch: ref=${reference}, paid=${paidEmail}, user=${user.email}`,
      );
      return { verified: false, status: 'email_mismatch' };
    }

    const updated = await this.upgradeUserToPro(user.id, reference);

    return {
      verified: true,
      is_pro: true,
      pro_expires_at: updated.pro_expires_at
        ? updated.pro_expires_at.toISOString()
        : null,
    };
  }

  /**
   * Upgrades the user to Pro. If their current expiry is in the future,
   * extend from that point; otherwise extend from now. Lets users stack months.
   */
  async upgradeUserToPro(userId: string, reference?: string) {
    const existing = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { pro_expires_at: true, email: true, full_name: true, is_pro: true },
    });

    const now = new Date();
    const wasPro =
      !!existing?.is_pro &&
      !!existing?.pro_expires_at &&
      existing.pro_expires_at.getTime() > now.getTime();
    const base =
      existing?.pro_expires_at && existing.pro_expires_at.getTime() > now.getTime()
        ? existing.pro_expires_at
        : now;
    const nextExpiry = new Date(
      base.getTime() + PRO_DURATION_DAYS * 24 * 60 * 60 * 1000,
    );

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: {
        is_pro: true,
        pro_expires_at: nextExpiry,
      },
      select: { id: true, is_pro: true, pro_expires_at: true },
    });

    // Welcome (or extension) email — fire & forget, don't block.
    if (existing?.email) {
      this.emailService
        .sendProActivatedEmail(existing.email, {
          name: existing.full_name || 'there',
          proExpiresAt: nextExpiry,
          amountPaid: PRO_PRICE_GHS,
          reference,
          isExtension: wasPro,
        })
        .catch((err) =>
          this.logger.error(`Failed to send Pro activation email: ${err}`),
        );
    }

    return updated;
  }

  async upgradeUserToProByEmail(email: string, reference?: string) {
    if (!email) return null;
    const user = await this.prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });
    if (!user) {
      this.logger.warn(`Pro webhook: user not found for email=${email}`);
      return null;
    }
    return this.upgradeUserToPro(user.id, reference);
  }
}
