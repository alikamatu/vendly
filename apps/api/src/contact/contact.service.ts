import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';

@Injectable()
export class ContactService {
  private readonly logger = new Logger(ContactService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
  ) {}

  async submitContact(data: { name: string; email: string; subject: string; message: string }) {
    // 1. Save to DB
    const message = await this.prisma.contactMessage.create({
      data: {
        name: data.name,
        email: data.email,
        subject: data.subject,
        message: data.message,
      },
    });

    // 2. Alert Admin (fire and forget)
    this.emailService.sendContactFormAdminAlert(data).catch((err) => {
      this.logger.error(`Failed to send contact alert: ${err}`);
    });

    return message;
  }

  async subscribeNewsletter(email: string) {
    // 1. Check if already exists
    const existing = await this.prisma.newsletterSubscriber.findUnique({
      where: { email },
    });

    if (existing) {
      if (!existing.is_active) {
        await this.prisma.newsletterSubscriber.update({
          where: { email },
          data: { is_active: true },
        });
      }
      return { status: 'already_subscribed' };
    }

    // 2. Save to DB
    await this.prisma.newsletterSubscriber.create({
      data: { email },
    });

    // 3. Send welcome email (fire and forget)
    this.emailService.sendNewsletterWelcome(email).catch((err) => {
      this.logger.error(`Failed to send newsletter welcome: ${err}`);
    });

    return { status: 'subscribed' };
  }
}
