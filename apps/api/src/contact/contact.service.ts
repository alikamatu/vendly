import { Injectable, Logger } from '@nestjs/common';
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

  async submitContact(data: { name: string; email: string; subject: string; message: string }) {
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

    // 3. Sync to Loops as lead contact
    const [firstName, ...rest] = (data.name || '').trim().split(' ');
    this.loopsService
      .createOrUpdateContact({
        email: normalisedEmail,
        firstName,
        lastName: rest.join(' '),
        userGroup: 'Contact',
        source: 'Contact Form',
      })
      .then(() => {
        return this.loopsService.sendEvent(normalisedEmail, 'contact_form_submitted', {
          subject: data.subject,
        });
      })
      .catch((err) => {
        this.logger.warn(`[Loops] Failed to sync contact form submission: ${err}`);
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
        return this.loopsService.sendEvent(normalisedEmail, 'newsletter_subscribed');
      })
      .catch((err) => {
        this.logger.warn(`[Loops] Failed to sync newsletter subscriber: ${err}`);
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
    await this.loopsService.updateContact(normalisedEmail, { subscribed: false });

    return { status: 'unsubscribed' };
  }
}
