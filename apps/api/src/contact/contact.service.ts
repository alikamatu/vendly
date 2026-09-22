import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import { LoopsService } from '../loops/loops.service';

@Injectable()
export class ContactService {
  private readonly logger = new Logger(ContactService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
    private readonly loopsService: LoopsService,
  ) {}

  async submitContact(data: {
    name: string;
    email: string;
    subject: string;
    message: string;
  }) {
    const normalisedEmail = data.email.trim().toLowerCase();

    // 1. Save to DB
    const message = await this.prisma.contactMessage.create({
      data: {
        name: data.name.trim(),
        email: normalisedEmail,
        subject: data.subject.trim(),
        message: data.message.trim(),
      },
    });

    // 2. Alert Admin (fire and forget)
    this.emailService.sendContactFormAdminAlert(data).catch((err) => {
      this.logger.error(`Failed to send contact alert: ${err}`);
    });

    // 3. Sync contact to Loops as a lead
    this.loopsService
      .createOrUpdateContact({
        email: normalisedEmail,
        userGroup: 'Lead',
        source: 'Contact Form',
      })
      .then(() => {
        return this.loopsService.sendEvent(
          normalisedEmail,
          'contact_form_submitted',
        );
      })
      .catch((err) => {
        this.logger.warn(
          `[Loops] Failed to sync contact form submission: ${err}`,
        );
      });

    return message;
  }

  async subscribeNewsletter(email: string) {
    const normalisedEmail = email.trim().toLowerCase();

    // 1. Check if already exists in DB
    const existing = await this.prisma.newsletterSubscriber.findUnique({
      where: { email: normalisedEmail },
    });

    if (existing) {
      if (!existing.is_active) {
        await this.prisma.newsletterSubscriber.update({
          where: { email: normalisedEmail },
          data: { is_active: true },
        });
      }
    } else {
      // Save to DB
      await this.prisma.newsletterSubscriber.create({
        data: { email: normalisedEmail },
      });
    }

    // 2. Sync to Loops with subscribed: true
    this.loopsService
      .createOrUpdateContact({
        email: normalisedEmail,
        userGroup: 'Lead',
        source: 'Storefront Newsletter',
        subscribed: true,
      })
      .then(() => {
        return this.loopsService.sendEvent(
          normalisedEmail,
          'newsletter_subscribed',
        );
      })
      .catch((err) => {
        this.logger.warn(
          `[Loops] Failed to sync newsletter subscriber: ${err}`,
        );
      });

    // 3. Send welcome email (fire and forget)
    this.emailService.sendNewsletterWelcome(normalisedEmail).catch((err) => {
      this.logger.error(`Failed to send newsletter welcome: ${err}`);
    });

    return { status: existing ? 'already_subscribed' : 'subscribed' };
  }

  async unsubscribeNewsletter(email: string) {
    const normalisedEmail = email.trim().toLowerCase();

    // 1. Update local DB
    const existing = await this.prisma.newsletterSubscriber.findUnique({
      where: { email: normalisedEmail },
    });

    if (existing && existing.is_active) {
      await this.prisma.newsletterSubscriber.update({
        where: { email: normalisedEmail },
        data: { is_active: false },
      });
    }

    // 2. Update status in Loops
    await this.loopsService.updateContact(normalisedEmail, {
      subscribed: false,
    });

    return { status: 'unsubscribed' };
  }

  async listSubscribers(query: {
    page?: string | number;
    limit?: string | number;
    search?: string;
    status?: 'ALL' | 'ACTIVE' | 'INACTIVE';
  }) {
    const page = Math.max(1, parseInt(String(query.page || '1'), 10));
    const limit = Math.min(
      100,
      Math.max(1, parseInt(String(query.limit || '20'), 10)),
    );
    const skip = (page - 1) * limit;

    const where: Record<string, any> = {};

    if (query.status === 'ACTIVE') {
      where.is_active = true;
    } else if (query.status === 'INACTIVE') {
      where.is_active = false;
    }

    if (query.search?.trim()) {
      where.email = {
        contains: query.search.trim().toLowerCase(),
        mode: 'insensitive',
      };
    }

    const [data, total] = await Promise.all([
      this.prisma.newsletterSubscriber.findMany({
        where,
        orderBy: { created_at: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.newsletterSubscriber.count({ where }),
    ]);

    return {
      data,
      total,
      page,
      limit,
    };
  }

  async getNewsletterStats() {
    const [total, active, unsubscribed] = await Promise.all([
      this.prisma.newsletterSubscriber.count(),
      this.prisma.newsletterSubscriber.count({ where: { is_active: true } }),
      this.prisma.newsletterSubscriber.count({ where: { is_active: false } }),
    ]);

    return {
      total,
      active,
      unsubscribed,
    };
  }

  async toggleSubscriberStatus(id: string) {
    const subscriber = await this.prisma.newsletterSubscriber.findUnique({
      where: { id },
    });
    if (!subscriber) {
      throw new NotFoundException('Subscriber not found');
    }

    const nextStatus = !subscriber.is_active;
    const updated = await this.prisma.newsletterSubscriber.update({
      where: { id },
      data: { is_active: nextStatus },
    });

    // Sync to Loops
    this.loopsService
      .updateContact(subscriber.email, { subscribed: nextStatus })
      .catch((err) => {
        this.logger.warn(`[Loops] Failed to sync status toggle: ${err}`);
      });

    return updated;
  }

  async deleteSubscriber(id: string) {
    const subscriber = await this.prisma.newsletterSubscriber.findUnique({
      where: { id },
    });
    if (!subscriber) {
      throw new NotFoundException('Subscriber not found');
    }

    await this.prisma.newsletterSubscriber.delete({
      where: { id },
    });

    return { message: 'Subscriber deleted successfully' };
  }
}
